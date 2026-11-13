# MOCAB — Phase 16.3.2: Integration & Data Consistency Review

> **Document Version:** 1.0.0  
> **Date:** November 14, 2026  
> **Repository:** MOCAB (Movie Cabin)  
> **Branch Target:** `master`  
> **Baseline Commit:** `8d71e72` (`feat: complete phase 15 mobile ux redesign`)  
> **Audit Mode:** STRICTLY READ-ONLY AUDIT  
> **Context:** Post Phase 16.1 (Backend & DB), Phase 16.1.1 (Security Review), Phase 16.2 (UI/UX), Phase 16.3.0 (Add Movie Audit), and Phase 16.3.1 (Synchronization)  
> **Author:** Antigravity AI Assistant & Engineering Team  
> **Verdict:** `PASS — Konsistensi arsitektur inti cukup aman untuk integration testing, dengan 2 temuan perbaikan dual-write/UI state yang direkomendasikan.`

---

## 1. Executive Summary

Audit ini dilakukan secara **STRICTLY READ-ONLY** untuk mengevaluasi secara mendalam integrasi alur **Add Movie** dan **Multiple Watch Sources** setelah implementasi Phase 16.3.1. Audit berfokus pada 6 pilar utama:
1. **Dual-Write Consistency:** Hubungan konsistensi antara kolom warisan `movies.watch_url` dan entitas relasional `public.movie_watch_sources`.
2. **Primary Source Consistency:** Integritas partial unique index dan penanganan ketiadaan primary source.
3. **Retry & Idempotency:** Ketahanan sistem terhadap network timeout, double-submission, dan idempotency boundary.
4. **Delete Fallback:** Mekanisme suksesi sumber utama saat primary dihapus.
5. **Failure Handling:** Transparansi pencatatan error dan kejelasan umpan balik ke kurator.
6. **Test Quality & Coverage:** Evaluasi realistis terhadap pengujian unit, simulasi in-memory, dan ketiadaan live database integration tests.

### Ringkasan Temuan Utama:
- **Inti Alur Add Movie Tersinkronisasi Baik:** Alur `addMovie()` di `src/lib/movies.ts` berhasil mengorkestrasikan pembuatan film via `save_movie_with_moods` dan pembuatan watch source utama via `createWatchSource()` secara non-blocking dan resilient.
- **Dual-Write Berjalan Non-Atomik:** Sinkronisasi antara `movie_watch_sources` dan `movies.watch_url` dijalankan melalui beberapa pemanggilan API Supabase terpisah pada layer Server Action Node.js (bukan dalam single atomic PostgreSQL transaction).
- **Temuan Gap Dual-Write pada `updateWatchSource()`:** Server Action `updateWatchSource()` di `src/lib/watchSources.ts` saat ini hanya memperbarui tabel `movie_watch_sources` dan **belum** memperbarui kolom `movies.watch_url` saat kurator mengubah URL sumber utama.
- **Temuan Gap UI State ("Zombie Legacy Link") pada `MovieDetailView.tsx`:** Saat sumber terakhir dihapus, state lokal `watchSources` menjadi kosong (`[]`), namun state `movie.watchUrl` di memori React tidak dibersihkan. Akibatnya, UI seketika menampilkan kotak *"Tautan Tontonan Warisan (Arsip)"* yang menampilkan tautan yang baru saja dihapus oleh kurator sampai halaman direfresh penuh.
- **Test Suite Lokal Solid (234 Tests Pass), Namun Belum Ada Live DB Tests:** Pengujian saat ini mencakup static code inspection, pure unit tests, dan in-memory async simulation, namun belum ada integration test yang terhubung ke live PostgreSQL database engine di lingkungan CI/staging.

---

## 2. Git Baseline Verification

Pemeriksaan status Git repository MOCAB pada awal audit:

```bash
$ git branch --show-current
master

$ git log -5 --oneline
8d71e72 feat: complete phase 15 mobile ux redesign
444d1ac Add comprehensive test coverage for Phase 15 components and consolidation of features
b92200a feat: implement personal journal, notes, and navigation (phase 14)
0aa4f77 feat: Penambahan PWA dan Icon
90a8ae1 feat: update brand avatars

$ git status
On branch master
Your branch is up to date with 'origin/master'.

Changes not staged for commit:
	modified:   src/app/bank/[id]/page.tsx
	modified:   src/components/views/AddMovieView.tsx
	modified:   src/components/views/MovieDetailView.tsx
	modified:   src/lib/movies.ts
	modified:   src/types/index.ts
	modified:   tests/phase14_3_journal_ui.test.mjs
	modified:   tests/phase14_4_personal_notes_ui.test.mjs

Untracked files:
	docs/PHASE_15_FINAL_GIT_REPORT.md
	docs/PHASE_16_0_WATCH_SOURCES_AUDIT.md
	docs/PHASE_16_1_1_SECURITY_REVIEW.md
	docs/PHASE_16_1_IMPLEMENTATION_REPORT.md
	docs/PHASE_16_2_IMPLEMENTATION_REPORT.md
	docs/PHASE_16_3_0_ADD_MOVIE_SYNC_AUDIT.md
	docs/PHASE_16_3_1_IMPLEMENTATION_REPORT.md
	src/components/DeleteWatchSourceDialog.tsx
	src/components/WatchSourceModal.tsx
	src/lib/watch-source-validations.ts
	src/lib/watchSources.ts
	src/types/watchSource.ts
	supabase/migrations/20261114000000_phase16_watch_sources.sql
	tests/phase16_2_ui.test.mjs
	tests/phase16_3_sync.test.mjs
	tests/phase16_watch_sources.test.mjs
```

**Konfirmasi Baseline:**  
Branch aktif adalah `master`, sinkron dengan commit terakhir `8d71e72`. Seluruh modifikasi kode Phase 16.1 hingga Phase 16.3.1 teridentifikasi dan belum di-commit/push.

---

## 3. Dual-Write Architecture

Sistem MOCAB berada pada fase transisi arsitektur:
- **Tabel Modern:** `public.movie_watch_sources` (Multiple sources, metadata platform, access type, partial unique primary).
- **Kolom Warisan:** `public.movies.watch_url` (Single text string, nullable, backward compatibility).

### 3.1. Evaluasi Atomisitas Dual-Write
Dual-write saat ini **TIDAK DIJALANKAN SECARA ATOMIK** di level PostgreSQL transaction.
- Pada `addMovie()` (`src/lib/movies.ts` lines 210–253):
  1. Eksekusi RPC `save_movie_with_moods` (menyimpan film dan `movies.watch_url`).
  2. Eksekusi Server Action `createWatchSource()` (request database terpisah).
- Pada `createWatchSource()` (`src/lib/watchSources.ts` lines 226–231):
  1. `INSERT INTO public.movie_watch_sources`.
  2. `UPDATE public.movies SET watch_url = ...` (request database terpisah).
- Pada `deleteWatchSource()` (`src/lib/watchSources.ts` lines 358–404):
  1. `DELETE FROM public.movie_watch_sources`.
  2. `UPDATE public.movie_watch_sources SET is_primary = true` (promosi suksesi).
  3. `UPDATE public.movies SET watch_url = ...` (request database terpisah).
- Pada `setPrimaryWatchSource()` (`src/lib/watchSources.ts` lines 442–489):
  1. Eksekusi RPC `set_primary_watch_source` atau fallback update.
  2. `UPDATE public.movies SET watch_url = ...` (request database terpisah).

> [!NOTE]
> Karena seluruh pemanggilan dilakukan secara terpisah di layer Server Action Node.js, jika terjadi server crash atau network drop di tengah proses, inkonsistensi sementara dapat terjadi di mana `movie_watch_sources` sudah terupdate namun `movies.watch_url` masih menyimpan nilai sebelumnya.
> **Justifikasi:** Karena `movies.watch_url` adalah kolom transisional untuk backward compatibility (dan bukan sumber kebenaran utama aplikasi), ketiadaan distributed transaction ini dapat diterima untuk Phase 16 dengan mitigasi idempotent recovery.

### 3.2. Konsistensi Antar-Operasi Dual-Write

| Operasi | Dampak pada `movie_watch_sources` | Dampak pada `movies.watch_url` | Status Konsistensi |
|---|---|---|---|
| **Add Movie (dengan URL)** | Dibuat 1 baris primary dengan platform terdeteksi | Disimpan via RPC `save_movie_with_moods` dan `createWatchSource` | **KONSISTEN** |
| **Add Movie (tanpa URL)** | 0 baris dibuat | `null` | **KONSISTEN** |
| **Tambah Sumber Baru (Primary)** | Disimpan dengan `is_primary = true`, primary lama diturunkan | `movies.watch_url` diperbarui ke URL baru | **KONSISTEN** |
| **Tambah Sumber Baru (Non-Primary)** | Disimpan dengan `is_primary = false` | `movies.watch_url` **tidak berubah** (tetap URL primary) | **KONSISTEN** |
| **Set Primary Source** | Sumber target menjadi primary, sumber lain diturunkan | `movies.watch_url` diperbarui ke URL target | **KONSISTEN** |
| **Hapus Primary Source (Ada Pengganti)** | Baris terhapus, sumber tertua dipromosikan | `movies.watch_url` diperbarui ke URL pengganti | **KONSISTEN** |
| **Hapus Primary Source (Tanpa Pengganti)** | Baris terhapus, sumber tersisa 0 | `movies.watch_url` diset `null` di database | **KONSISTEN DI DB** *(Gap di UI State)* |
| **Hapus Non-Primary Source** | Baris non-primary terhapus | `movies.watch_url` **tidak berubah** | **KONSISTEN** |
| **Update Sumber Tontonan (`updateWatchSource`)** | Data diperbarui di `movie_watch_sources` | **TIDAK DISINKRONKAN** (belum ada update ke `movies`) | ⚠️ **GAP KONSISTENSI** |

---

## 4. Primary Source Consistency

### 4.1. Jaminan Maksimal Satu Primary
- Dijamin secara mutlak di tingkat database engine oleh partial unique index:
  ```sql
  create unique index movie_watch_sources_primary_unique 
    on public.movie_watch_sources (movie_id) 
    where (is_primary = true);
  ```
- Mustahil terdapat lebih dari 1 baris dengan `is_primary = true` untuk `movie_id` yang sama.

### 4.2. Perilaku Ketiadaan Primary Source (Zero Primary State)
- Partial unique index mengizinkan kondisi di mana sebuah film memiliki **0 sumber berstatus primary** (`is_primary = false` untuk semua baris).
- **Audit Celah di `updateWatchSource()`:**  
  Jika sebuah film hanya memiliki 1 sumber tontonan (yang otomatis berstatus primary), dan kurator mengirimkan update `{ isPrimary: false }`, fungsi `updateWatchSource` saat ini mengizinkan perubahan tersebut tanpa memeriksa apakah itu primary satu-satunya.
  - **Dampak di UI:** Ketika film memiliki sumber tetapi 0 primary source, `MovieDetailView.tsx` (baris 56) menghasilkan `primarySource === undefined`. Tombol CTA tontonan jatuh ke Fallback Branch 3 (jika `movie.watchUrl` ada) atau Branch 4 (`+ Tambah Sumber Tontonan`), mengabaikan sumber yang sebenarnya ada di daftar.
  - **Rekomendasi:** Di `updateWatchSource()`, jika kurator mencoba mengubah `isPrimary = false` pada satu-satunya sumber yang ada, tolak perubahan atau paksa tetap `is_primary = true`.

---

## 5. Retry & Idempotency Analysis

Audit terhadap 7 skenario retry dan idempotensi:

### Skenario A: Add Movie Berhasil, Watch Source Berhasil
- **Alur:** Normal path. Film dibuat, watch source dibuat dengan `is_primary = true`.
- **Hasil:** Konsisten, status `watchSourceSync: 'synced'`, toast sukses normal.

### Skenario B: Add Movie Berhasil, Watch Source Gagal
- **Alur:** `save_movie_with_moods` berhasil, `createWatchSource` melempar error.
- **Hasil:** Non-blocking resilience. Film tidak dibatalkan. `movies.watch_url` tetap menyimpan link warisan. Status `watchSourceSync: 'failed'`. Toast memperingatkan kurator bahwa film tersimpan namun tautan belum tersinkronisasi. Kurator dapat menambahkan sumber di halaman detail.

### Skenario C: User Retry Setelah Network Timeout saat Add Movie
- **Alur:** Kurator submit form `/add`. Request 1 mencapai server dan menyimpan film A, namun koneksi drop sebelum respons sampai ke browser. Kurator menekan submit kembali (Request 2).
- **Analisis Kritis:**  
  Tabel `public.movies` **TIDAK MEMILIKI UNIQUE CONSTRAINT** pada `(user_id, title, release_year)`, dan RPC `save_movie_with_moods` tidak menerima client idempotency token.
  - **Dampak:** Request 2 akan menghasilkan record film kedua (Film B) dengan UUID berbeda.
  - Karena Film B memiliki `id` baru, idempotency check pada `createWatchSource` tidak menganggapnya duplikat.
  - **Kesimpulan:** Idempotency Add Movie **belum race-safe pada level database** terhadap retry network timeout. Diperlukan client-side locking dan evaluasi idempotency key di masa depan.

### Skenario D: Request Add Movie Terkirim Dua Kali (Rapid Double Click)
- **Alur:** Kurator mengklik tombol "Simpan ke Kabin" dua kali dalam rentang waktu < 50ms.
- **Mitigasi Client:** `setSaving(true)` di `AddMovieView.tsx` baris 296 men-disable tombol submit (`disabled={saving}` di baris 877).
- **Evaluasi:** Cukup efektif di level UI, namun pada kondisi browser lambat atau eksekusi microtask concurrent, throttling tambahan atau `AbortController` disarankan.

### Skenario E: Watch Source Berhasil Dibuat, Respons ke Client Gagal Diterima (Retry Tambah Sumber)
- **Alur:** Kurator menambah sumber di modal detail film, request 1 berhasil membuat baris di DB, namun respons timeout. Kurator menekan "Simpan" ulang di modal dengan URL yang sama.
- **Mitigasi Server:** `createWatchSource()` (`src/lib/watchSources.ts` lines 153–168) menjalankan pre-check:
  ```typescript
  const { data: existingSameUrl } = await supabase
    .from('movie_watch_sources')
    .select('*')
    .eq('movie_id', validated.movieId)
    .eq('user_id', user.id)
    .eq('source_url', validated.cleanSourceUrl)
    .maybeSingle();
  ```
- **Hasil:** Server mendeteksi baris yang sama, membatalkan insert baru, dan mengembalikan baris yang sudah ada secara idempoten. **100% AMAN.**

### Skenario F: User Mengedit Sumber Kemudian Mengirim Request yang Sama Lagi
- **Alur:** Kurator mengedit sumber lalu mengklik simpan berulang kali.
- **Hasil:** `updateWatchSource()` menjalankan query `UPDATE ... WHERE id = $id AND user_id = $userId`. Operasi UPDATE berbasis ID spesifik secara alami bersifat **IDEMPOTEN**.

### Skenario G: Dua Request Bersamaan Membuat Primary Source untuk Film yang Sama
- **Alur:** Dua tab atau proses bersaing membuat primary source untuk `movie_id` yang sama pada milidetik yang sama.
- **Hasil:**
  1. Salah satu transaksi memenangkan insert dengan `is_primary = true`.
  2. Transaksi kedua menabrak partial unique index `movie_watch_sources_primary_unique` dan ditolak oleh PostgreSQL dengan kode error `23505`.
  3. Error recovery handler di `createWatchSource()` (lines 196–219) menangkap kode `23505`. Jika request membawa URL yang sama, server mengembalikan record pemenang secara elegan. Jika membawa URL berbeda, server menampilkan error ramah bahasa Indonesia bahwa tautan utama sudah ada. **RACE-SAFE.**

---

## 6. Delete Fallback Analysis

### 6.1. Alur Suksesi Primary saat Dihapus
Didefinisikan pada `src/lib/watchSources.ts` (lines 341–396):
1. Periksa apakah sumber yang dihapus berstatus `is_primary = true`.
2. Jika ya, cari calon pengganti (`fallbackCandidateId`) dari sumber tersisa tertua:
   ```typescript
   .eq('movie_id', existing.movie_id)
   .neq('id', id)
   .order('created_at', { ascending: true })
   .limit(1)
   ```
3. Hapus sumber target dari database.
4. Update sumber pengganti menjadi `is_primary = true`.
5. Update `movies.watch_url` dengan URL sumber pengganti.
6. Jika tidak ada sumber tersisa, update `movies.watch_url = null`.

### 6.2. Evaluasi Potensi Kegagalan Suksesi
- **Non-Atomic Multi-step Execution:** Jika server crash atau koneksi putus tepat setelah query `DELETE` berhasil tetapi sebelum query `UPDATE is_primary = true` dijalankan:
  - Sumber target terhapus.
  - Sumber pengganti **belum** dipromosikan.
  - Film berada dalam status memiliki sumber non-primary tanpa ada sumber primary.
- **Rekomendasi Masa Depan:** Memindahkan logika suksesi primary delete ke dalam database trigger `AFTER DELETE ON public.movie_watch_sources` atau RPC atomic `delete_watch_source_with_fallback()` di level PostgreSQL.

---

## 7. Failure Handling & Logging

1. **Pencatatan Error:**
   - Pada `addMovie()` (`src/lib/movies.ts` line 261):
     ```typescript
     console.error('Watch Source sync failed for movie:', newId, syncErr);
     ```
     Error dicatat lengkap dengan `newId` dan stack trace.
2. **Keterpisahan Status:**
   - `created.watchSourceSync` memiliki 4 nilai diskret: `'synced'`, `'failed'`, `'none'`, `'invalid_url'`.
3. **Umpan Balik Pengguna:**
   - `AddMovieView.tsx` menampilkan pesan yang jujur dan terukur:
     - `'failed'`: Toast peringatan merah `"${newMovie.title}" masuk ke Kabin, namun tautan tontonan gagal disinkronkan.`
     - `'invalid_url'`: Toast peringatan merah `"${newMovie.title}" tersimpan tanpa tautan (format tautan tidak valid).`
     - `'synced'` / `'none'`: Toast hijau normal `"${newMovie.title}" masuk ke Kabin.`
   - Pengguna **tidak disesatkan** mengira tautan berhasil disinkronkan saat terjadi kegagalan.

---

## 8. Concurrency & Race Conditions Assessment

| Titik Potensi Konflik | Perlindungan yang Ada | Tingkat Ketahanan | Catatan Audit |
|---|---|---|---|
| **Concurrent Primary Insert** | Partial Unique Index `(movie_id) WHERE (is_primary = true)` + Error code `23505` recovery | **TINGGI (Race-Safe)** | Database engine menjamin integritas. |
| **Concurrent Primary Demote/Promote** | RPC `set_primary_watch_source()` dengan row locking di PostgreSQL | **TINGGI** | Transaksional di level DB. |
| **Concurrent Add Movie Submission** | Client-side button disabling (`saving` state) | **SEDANG** | Cukup untuk UI normal, namun tidak ada unique constraint di DB `movies`. |
| **Concurrent Delete Fallback** | Multi-step queries di Node.js | **SEDANG** | Rentan jika terjadi concurrent delete pada film yang sama. |

---

## 9. Test Coverage & Quality Assessment

### 9.1. Pengelompokan Jenis Tes Phase 16

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ KLASIFIKASI TEST SUITE PHASE 16 (Total: 46 Phase 16 Specific Tests)         │
├───────────────────────────────────┬──────────────┬──────────────────────────┤
│ Kategori Pengujian                │ Jumlah Uji   │ Berkas Sumber            │
├───────────────────────────────────┼──────────────┼──────────────────────────┤
│ 1. Static Source / SQL Inspection │ 17 Tests     │ phase16_watch_sources    │
│    (Memeriksa DDL, trigger SQL,   │              │ phase16_2_ui             │
│     AST regex, auth checks)       │              │ phase16_3_sync           │
├───────────────────────────────────┼──────────────┼──────────────────────────┤
│ 2. Pure Unit Tests                │ 16 Tests     │ phase16_watch_sources    │
│    (Validasi input, regex,        │              │ phase16_3_sync           │
│     detectPlatformFromUrl, errors)│              │                          │
├───────────────────────────────────┼──────────────┼──────────────────────────┤
│ 3. In-Memory Async Simulations    │ 13 Tests     │ phase16_watch_sources    │
│    (Simulasi alur Server Action,  │              │ phase16_3_sync           │
│     race condition 23505 mock,    │              │                          │
│     scenario A-E sync)            │              │                          │
├───────────────────────────────────┼──────────────┼──────────────────────────┤
│ 4. Live Database Integration Tests│ **0 Tests**  │ Belum ada runner live DB │
│    (Koneksi nyata ke PostgreSQL   │              │ yang aktif di test suite │
│     Supabase instance)            │              │ lokal.                   │
└───────────────────────────────────┴──────────────┴──────────────────────────┘
```

### 9.2. Identifikasi Gap Pengujian
1. **Live Postgres Constraint Verification:** Pengujian kode error `23505` dan trigger `P0003` saat ini divalidasi melalui static SQL parsing dan mock simulation. Belum diuji terhadap instance PostgreSQL hidup.
2. **Dual-Write Stale Check:** Belum ada automated test yang memverifikasi bahwa `updateWatchSource()` memperbarui `movies.watch_url`.
3. **UI State Desync:** Belum ada test DOM/render yang memverifikasi penghapusan sumber terakhir di `MovieDetailView` tidak memicu kemunculan kembali link lama sebagai tautan warisan.

---

## 10. Findings by Severity

### Finding 1: Desinkronisasi Dual-Write pada `updateWatchSource()`
- **Severity:** `MEDIUM`
- **File Path:** [src/lib/watchSources.ts](file:///c:/Users/Hype/Documents/PROJECT/Movie%20Cabin/src/lib/watchSources.ts#L278-L312)
- **Line Numbers:** Lines 278–312
- **Scenario:** Kurator memperbarui URL tontonan dari sumber yang berstatus primary (misal mengubah URL Netflix), atau mengubah sumber non-primary menjadi primary melalui modal edit.
- **Impact:** Baris di `public.movie_watch_sources` berhasil diperbarui, namun kolom `public.movies.watch_url` **tidak diperbarui**. Query atau sistem yang masih membaca `movies.watch_url` akan melihat URL lama (*stale data*).
- **Recommendation:** Pada `updateWatchSource()`, tambahkan logika dual-write: jika `data.is_primary === true` dan `data.source_url` tersedia, lakukan `UPDATE public.movies SET watch_url = data.source_url WHERE id = existing.movie_id`.

---

### Finding 2: Zombie Legacy Link di UI State saat Menghapus Sumber Terakhir
- **Severity:** `MEDIUM`
- **File Path:** [src/components/views/MovieDetailView.tsx](file:///c:/Users/Hype/Documents/PROJECT/Movie%20Cabin/src/components/views/MovieDetailView.tsx#L111-L133)
- **Line Numbers:** Lines 111–133 (`handleDeleteSourceConfirm`) dan lines 511–530
- **Scenario:** Film memiliki 1 sumber tontonan (yang disinkronkan dari `movies.watch_url`). Kurator menghapus sumber tersebut di detail view. Server Action `deleteWatchSource` berhasil menghapus sumber dan mengeset `movies.watch_url = null` di database.
- **Impact:** Di sisi client, `handleDeleteSourceConfirm` hanya memfilter array `watchSources`, namun **tidak memperbarui** state `movie.watchUrl` di memori React component (`setMovie` tidak dipanggil). Karena `watchSources` kini kosong (`length === 0`), UI mengevaluasi `hasSafeWatchUrl = /^https?:\/\/\S+$/i.test(movie.watchUrl)` yang masih bernilai `true` dari state lama! UI seketika menampilkan kotak *"Tautan Tontonan Warisan (Arsip): [URL yang baru saja dihapus]"*. Tautan yang sudah dihapus "bangkit kembali" di tampilan hingga pengguna me-refresh halaman.
- **Recommendation:** Di dalam `handleDeleteSourceConfirm`, perbarui juga state `movie`:
  ```typescript
  if (!result.newPrimaryId) {
    setMovie((prev) => ({ ...prev, watchUrl: '' }));
  }
  ```

---

### Finding 3: Multi-Step Non-Atomic Execution pada Delete Fallback
- **Severity:** `LOW`
- **File Path:** [src/lib/watchSources.ts](file:///c:/Users/Hype/Documents/PROJECT/Movie%20Cabin/src/lib/watchSources.ts#L341-L404)
- **Line Numbers:** Lines 341–404 (`deleteWatchSource`)
- **Scenario:** Terjadi network drop atau server crash tepat setelah query `DELETE` selesai dieksekusi, sebelum query promosi suksesi `UPDATE ... is_primary = true` selesai.
- **Impact:** Sumber lama terhapus, namun sumber pengganti belum dipromosikan, meninggalkan film dengan beberapa sumber non-primary tanpa sumber utama.
- **Recommendation:** Bungkus alur suksesi primary dalam database function PostgreSQL (misal `delete_watch_source_atomic`) pada Phase 16.4/Phase 17.

---

### Finding 4: Ketiadaan Idempotency Key pada Entitas `movies` saat Add Movie Retry
- **Severity:** `LOW`
- **File Path:** [src/lib/movies.ts](file:///c:/Users/Hype/Documents/PROJECT/Movie%20Cabin/src/lib/movies.ts#L210-L225)
- **Line Numbers:** Lines 210–225
- **Scenario:** Pengguna mengalami network timeout saat submit form Add Movie, lalu mengklik submit ulang.
- **Impact:** Menghasilkan dua baris film duplikat di tabel `movies` dengan judul dan tahun yang sama karena tidak ada unique constraint di database `movies`.
- **Recommendation:** Evaluasi penambahan composite unique index opsional atau client-side idempotency token untuk alur intake film.

---

### Finding 5: Ketiadaan Live Database Integration Tests di Test Runner Lokal
- **Severity:** `LOW`
- **File Path:** [tests/phase16_3_sync.test.mjs](file:///c:/Users/Hype/Documents/PROJECT/Movie%20Cabin/tests/phase16_3_sync.test.mjs)
- **Line Numbers:** N/A (Test suite architecture)
- **Scenario:** Seluruh 234 tests berjalan dalam memori menggunakan Node.js test runner tanpa koneksi ke live Supabase PostgreSQL socket.
- **Impact:** Integritas relasional dan konstrain database live baru dapat diverifikasi pada tahap live integration testing atau manual staging QA.
- **Recommendation:** Jalankan Phase 16.3.2 Integration Testing menggunakan koneksi database staging/dev aktif sebelum rilis produksi.

---

## 11. Recommended Fixes

Sebelum melangkah ke Production Migration (Phase 16.4), dua perbaikan berikut sangat disarankan:

### Perbaikan A: Tambahkan Dual-Write Sync pada `updateWatchSource()`
Pada [src/lib/watchSources.ts](file:///c:/Users/Hype/Documents/PROJECT/Movie%20Cabin/src/lib/watchSources.ts#L303):
```typescript
  // Sinkronisasi dual-write ke movies.watch_url jika sumber yang diperbarui adalah primary
  if (data.is_primary && data.source_url) {
    await supabase
      .from('movies')
      .update({ watch_url: data.source_url })
      .eq('id', existing.movie_id)
      .eq('user_id', user.id);
  }
```

### Perbaikan B: Bersihkan `movie.watchUrl` pada `MovieDetailView.tsx` saat Hapus Sumber Terakhir
Pada [src/components/views/MovieDetailView.tsx](file:///c:/Users/Hype/Documents/PROJECT/Movie%20Cabin/src/components/views/MovieDetailView.tsx#L125):
```typescript
  if (!result.newPrimaryId) {
    setMovie((prev) => ({ ...prev, watchUrl: '' }));
  }
```

---

## 12. Production Readiness Assessment

| Dimensi Evaluasi | Kesiapan | Keterangan |
|---|---|---|
| **Keamanan & Otorisasi (RLS)** | 🟢 Siap | RLS ketat, `auth.uid()`, trigger `P0003` cross-ownership aktif. |
| **Integritas Konstrain Database** | 🟢 Siap | Partial unique index menjamin maksimal 1 primary source. |
| **Alur Add Movie Intake** | 🟢 Siap | Cepat, sederhana, auto-detect platform 15+, non-blocking. |
| **Umpan Balik Pengguna (Toast)** | 🟢 Siap | Membedakan sukses, gagal sinkronisasi, dan URL tidak valid. |
| **Konsistensi Dual-Write** | 🟡 Perlu Penyesuaian Kecil | Diperlukan penambahan sync pada `updateWatchSource()` dan pembersihan UI state. |
| **Live Database Verification** | 🟡 Perlu Dilakukan | Memerlukan uji koneksi langsung ke Supabase staging/dev di Phase 16.3.2. |

---

## 13. Final Verdict

### Status: `PASS`
**Konsistensi arsitektur inti Add Movie dan Multiple Watch Sources cukup aman untuk melanjutkan ke tahapan Integration Testing.**

Tidak ditemukan kelemahan berstatus `CRITICAL` atau `HIGH` yang memblokir fungsionalitas utama aplikasi. Dua temuan berstatus `MEDIUM` (Dual-write update & UI zombie link state) adalah perbaikan lokal terisolasi yang dapat diterapkan sebelum migrasi penuh ke produksi.

---
*Laporan review ini disusun secara read-only tanpa mengubah kode sumber, database, atau state git MOCAB.*
