# MOCAB — Phase 16.3.1: Add Movie & Watch Sources Synchronization Implementation Report

> **Document Version:** 1.0.0  
> **Date:** November 14, 2026  
> **Repository:** MOCAB (Movie Cabin)  
> **Target Branch:** `master`  
> **Baseline Commit:** `8d71e72` (`feat: complete phase 15 mobile ux redesign`)  
> **Context:** Post Phase 16.1 (Backend & DB), Phase 16.1.1 (Security Review), Phase 16.2 (UI/UX), and Phase 16.3.0 (Audit)  
> **Author:** Antigravity AI Assistant & Engineering Team  
> **Verdict:** `PASS — Sinkronisasi otomatis Add Movie dan Watch Sources berhasil diimplementasikan, resilient, dan lolos seluruh test suite.`

---

## 1. Executive Summary

Pada **Phase 16.3.1**, MOCAB berhasil mengintegrasikan sinkronisasi otomatis antara alur penambahan film baru (**Add Movie** pada rute `/add`) dan sistem **Multiple Watch Sources** (`public.movie_watch_sources`).

### Pencapaian Utama:
1. **Zero-Friction UX Preserved:** Tampilan dan kesederhanaan form `AddMovieView` dipertahankan 100%. Kurator tetap hanya perlu memasukkan satu URL tontonan opsional tanpa dibebani dropdown platform atau access type manual.
2. **Server Action Orchestration:** Orkestrasi sinkronisasi diintegrasikan secara bersih di dalam `src/lib/movies.ts` setelah RPC PostgreSQL inti `save_movie_with_moods` berhasil mengeksekusi penyimpanan film.
3. **Automated Platform & Access Type Detection:** Disediakan helper reusable `detectPlatformFromUrl()` di `src/lib/watch-source-validations.ts` yang mengenali 15+ platform streaming legal populer (Netflix, Prime Video, Disney+, YouTube, Criterion Channel, Vidio, Bioskop Online, Apple TV+, MUBI, KlikFilm, Catchplay+, WeTV, iQIYI, HBO Max, Viki) dengan pemetaan `access_type` (`subscription`, `free`, `rent`, `other`).
4. **Idempotency & Race-Safe Duplicate Protection:** Mengimplementasikan pengecekan duplikasi pada level Server Action dan penanganan graceful error kode `23505` (`movie_watch_sources_primary_unique`) untuk menjamin tidak ada duplikasi data akibat network retry atau double-submission.
5. **High Resilience (Non-Blocking):** Kegagalan pembuatan watch source atau ketidakvalidan format URL tidak pernah membatalkan penyimpanan film inti (`save_movie_with_moods`). Kolom `movies.watch_url` tetap terisi untuk backward compatibility (dual-write).
6. **Distinct User Feedback:** Komponen `AddMovieView` membedakan umpan balik notifikasi (Toast) berdasarkan status sinkronisasi (`synced`, `failed`, `none`, `invalid_url`).
7. **Comprehensive Test Suite:** Menambahkan 14 pengujian otomatis di `tests/phase16_3_sync.test.mjs`. Seluruh 234 tests MOCAB lulus 100% tanpa error, dan ESLint/TypeScript check lolos tanpa peringatan.

---

## 2. File yang Berubah & Dibuat

### Berkas yang Dimodifikasi:
1. `src/types/watchSource.ts`:
   - Menambahkan tipe `WatchSourceSyncStatus = 'synced' | 'failed' | 'none' | 'invalid_url'`.
   - Menambahkan interface `DetectedPlatform { platformName: string; accessType: AccessType }`.
2. `src/types/index.ts`:
   - Menambahkan field opsional `watchSourceSync?: import('./watchSource').WatchSourceSyncStatus` pada interface `Movie`.
3. `src/lib/watch-source-validations.ts`:
   - Mengimplementasikan fungsi reusable `detectPlatformFromUrl(url?: string | null): DetectedPlatform`.
   - Memastikan domain parsing aman berbasis WHATWG `URL`, pembersihan prefix `www.`, dan fallback yang aman.
4. `src/lib/watchSources.ts`:
   - Mengekspor `detectPlatformFromUrl` dan `type DetectedPlatform`.
   - Menambahkan perlindungan idempotensi pada `createWatchSource()` (mencegah duplikasi URL yang sama).
   - Menambahkan recovery handler terhadap race condition pada partial unique index `movie_watch_sources_primary_unique` (Postgres error `23505`).
   - Menerapkan sinkronisasi dual-write ke `movies.watch_url` pada operasi pembuatan, pemutakhiran, dan penghapusan primary source.
5. `src/lib/movies.ts`:
   - Memodifikasi `addMovie()` untuk mengorkestrasikan pembuatan primary watch source secara otomatis ketika `cleanUrl` tersedia.
   - Menangani 4 skenario sinkronisasi (A: synced, B: failed, C: none, D: invalid_url) secara non-blocking.
   - Menambahkan revalidasi path `/bank/${newId}` di samping `/` dan `/bank`.
6. `src/components/views/AddMovieView.tsx`:
   - Menyesuaikan handler submit untuk menampilkan umpan balik Toast yang berbeda saat sinkronisasi sukses, gagal, atau URL tidak valid.

### Berkas yang Dibuat:
7. `tests/phase16_3_sync.test.mjs`: Test suite otomatis untuk platform detection, failure handling, retry protection, dan regression audit.
8. `docs/PHASE_16_3_0_ADD_MOVIE_SYNC_AUDIT.md`: Dokumen audit read-only alur Add Movie & Watch Sources.
9. `docs/PHASE_16_3_1_IMPLEMENTATION_REPORT.md`: Laporan implementasi ini.

---

## 3. Alur Sinkronisasi (Synchronization Architecture)

```
[Kurator Mengisi Form /add]
               │
               ▼
        Submit Form
               │
               ▼
[src/lib/movies.ts: addMovie(input)]
               │
               ├── 1. Validasi Input Dasar (Judul, Moods, Year, Runtime)
               │      • Jika URL invalid: Catat isUrlInvalid = true, tetap lanjutkan simpan film
               │
               ├── 2. Eksekusi RPC Inti: supabase.rpc('save_movie_with_moods')
               │      • INSERT INTO public.movies (watch_url = cleanUrl)
               │      • INSERT INTO public.movie_moods (atomik dalam transaksi PostgreSQL)
               │      • Dapatkan newId (UUID)
               │
               ├── 3. SINKRONISASI WATCH SOURCES OTOMATIS
               │      │
               │      ├─► [isUrlInvalid === true]
               │      │     └── set status: 'invalid_url' (tanpa insert watch source)
               │      │
               │      ├─► [!cleanUrl (Kosong / Whitespace)]
               │      │     └── set status: 'none' (tanpa insert watch source)
               │      │
               │      └─► [cleanUrl Valid]
               │            │
               │            ├── 4. detectPlatformFromUrl(cleanUrl)
               │            │      └── Hasilkan { platformName, accessType }
               │            │
               │            └── 5. createWatchSource({...})
               │                   ├── Cek Idempotensi (URL sama sudah ada?)
               │                   ├── Set isPrimary = true
               │                   ├── INSERT INTO public.movie_watch_sources
               │                   ├── Catch 23505 race condition jika ada
               │                   ├── Sync dual-write ke movies.watch_url
               │                   └── set status: 'synced'
               │
               │      [Jika createWatchSource melempar error]
               │      └── Catch block: Log error, set status: 'failed'
               │          (Film tetap 100% aman tersimpan di database!)
               │
               ├── 6. Revalidasi Cache:
               │      • revalidatePath('/')
               │      • revalidatePath('/bank')
               │      • revalidatePath('/bank/${newId}')
               │
               ▼
       Redirect ke /bank/${newId}
               │
               ▼
[MovieDetailView (/bank/${newId})]
       • Tombol CTA Tontonan langsung menampilkan: "Tonton di [Platform]"
       • Section Sumber Tontonan menampilkan kartu platform resmi (Status: UTAMA)
```

---

## 4. Platform Detection Heuristics

Fungsi `detectPlatformFromUrl(url?: string | null)` pada `src/lib/watch-source-validations.ts` menganalisis hostname dan pathname URL secara deterministik:

| Platform | Domain / Path Patterns | Access Type Default |
|---|---|---|
| **Netflix** | `netflix.com`, `*.netflix.com` | `subscription` |
| **Prime Video** | `primevideo.com`, `*.primevideo.com`, `amazon.com`, `amazon.co.jp`, `amazon.co.uk` | `subscription` |
| **Disney+** | `disneyplus.com`, `*.disneyplus.com`, `hotstar.com`, `*.hotstar.com` | `subscription` |
| **Apple TV+** | `tv.apple.com`, `apple.com/tv`, `apple.com/tv-pr` | `subscription` |
| **Vidio** | `vidio.com`, `*.vidio.com` | `subscription` |
| **Bioskop Online** | `bioskoponline.com`, `*.bioskoponline.com` | `rent` |
| **YouTube** | `youtube.com`, `*.youtube.com`, `youtu.be` | `free` |
| **Criterion Channel** | `criterionchannel.com`, `*.criterionchannel.com` | `subscription` |
| **MUBI** | `mubi.com`, `*.mubi.com` | `subscription` |
| **Catchplay+** | `catchplay.com`, `*.catchplay.com` | `subscription` |
| **WeTV** | `wetv.vip`, `*.wetv.vip` | `subscription` |
| **iQIYI** | `iq.com`, `*.iq.com`, `iqiyi.com`, `*.iqiyi.com` | `subscription` |
| **HBO Max / Go** | `max.com`, `*.max.com`, `hbomax.com`, `hbogoasia` | `subscription` |
| **KlikFilm** | `klikfilm.com`, `*.klikfilm.com` | `rent` |
| **Viki** | `viki.com`, `*.viki.com` | `subscription` |
| **Platform Lain** | Domain valid lainnya (misal: `archive.org`) | `other` (nama platform diambil dari hostname bersih) |
| **Fallback** | String kosong, null, atau unparseable | `other` (`platformName: 'Tautan Tontonan'`) |

---

## 5. Failure Handling (Skenario Kegagalan)

| Skenario | Penanganan di Server Action (`movies.ts`) | Umpan Balik Pengguna (`AddMovieView.tsx`) |
|---|---|---|
| **A. Movie Sukses + Source Sukses** | `created.watchSourceSync = 'synced'` | Toast Hijau: `"${newMovie.title}" masuk ke Kabin.` |
| **B. Movie Sukses + Source Gagal** | Ditangkap pada blok `catch`, dicatat ke console server, status diset `created.watchSourceSync = 'failed'`. Penyimpanan film **tidak dibatalkan**. | Toast Kuning/Merah Peringatan: `"${newMovie.title}" masuk ke Kabin, namun tautan tontonan gagal disinkronkan.` Kurator dapat menambahkan ulang tautan di halaman detail. |
| **C. Watch URL Kosong** | Sinkronisasi diabaikan, status diset `created.watchSourceSync = 'none'`. | Toast Hijau: `"${newMovie.title}" masuk ke Kabin.` |
| **D. URL Tidak Valid** | Film tetap disimpan tanpa URL tontonan, status diset `created.watchSourceSync = 'invalid_url'`. | Toast Peringatan: `"${newMovie.title}" tersimpan tanpa tautan (format tautan tidak valid).` |
| **E. Network Timeout / Retry** | Idempotency protection dan partial unique index recovery menangani retry tanpa duplikasi. | Normal redirect ke `/bank/${newMovie.id}`. |

---

## 6. Idempotency & Duplication Strategy

Sesuai instruksi dan audit arsitektur, **TIDAK ADA MIGRATION DATABASE BARU** yang dijalankan pada fase ini. Proteksi duplikasi diimplementasikan melalui strategi berlapis:

1. **Pre-Insert Idempotency Check (`createWatchSource`):**
   Sebelum melakukan query insert, sistem mengecek apakah sudah ada sumber tontonan untuk `movie_id` dan `user_id` yang sama dengan `source_url` yang persis sama:
   ```typescript
   if (validated.cleanSourceUrl) {
     const { data: existingSameUrl } = await supabase
       .from('movie_watch_sources')
       .select('*')
       .eq('movie_id', validated.movieId)
       .eq('user_id', user.id)
       .eq('source_url', validated.cleanSourceUrl)
       .maybeSingle();

     if (existingSameUrl) {
       if (shouldBePrimary && !existingSameUrl.is_primary) {
         return await setPrimaryWatchSource(existingSameUrl.id);
       }
       return mapWatchSourceRow(existingSameUrl);
     }
   }
   ```
2. **Database Engine Partial Unique Index Race Guard:**
   Indeks parsial PostgreSQL dari Phase 16.1:
   ```sql
   create unique index movie_watch_sources_primary_unique 
     on public.movie_watch_sources (movie_id) 
     where (is_primary = true);
   ```
   menjamin di level disk bahwa **maksimal 1 sumber utama** dapat eksis untuk suatu film. Jika dua request bersaing pada milidetik yang sama, salah satunya akan ditolak oleh Postgres dengan kode `23505`.
3. **Graceful `23505` Recovery:**
   Jika kode `23505` terjadi saat insert primary source, sistem menangkapnya dan mengambil baris primary yang baru saja dimenangkan oleh transaksi paralel. Jika URL-nya cocok, sistem mengembalikannya sebagai sukses idempoten tanpa melempar crash ke kurator.

---

## 7. Hasil Pengujian (Test Results)

Pengujian dijalankan melalui runner resmi Node.js (`node --test tests/**/*.test.mjs`):

```
> movie-cabin@0.1.0 test
> node --no-warnings=MODULE_TYPELESS_PACKAGE_JSON --test tests/**/*.test.mjs

...
✔ Phase 16.3 Unit Test: ACCESS_TYPES definition and isValidUuid validation (0.7581ms)
✔ Phase 16.3 Unit Test: detectPlatformFromUrl recognizes all officially supported platforms (1.1092ms)
✔ Phase 16.3 Unit Test: detectPlatformFromUrl handles unknown platform with other access type (0.3541ms)
✔ Phase 16.3 Unit Test: detectPlatformFromUrl handles empty, null, and malformed URLs gracefully (0.4285ms)
✔ Phase 16.3 Unit Test: URL Validation rigorously filters invalid and unsafe protocols (0.2811ms)
✔ Phase 16.3 Orchestration: Scenario A — Add Movie with valid Watch URL creates primary watch source (0.3551ms)
✔ Phase 16.3 Orchestration: Scenario B — Movie remains saved when Watch Source creation fails (0.2982ms)
✔ Phase 16.3 Orchestration: Scenario C — Add Movie without Watch URL skips source creation (0.3412ms)
✔ Phase 16.3 Orchestration: Scenario D — Add Movie with invalid URL marks status without crashing (0.3204ms)
✔ Phase 16.3 Orchestration: Scenario E & 8 — Duplicate retry protection avoids duplicate rows (0.4188ms)
✔ Phase 16.3 Orchestration: Concurrency race condition on 23505 partial unique index is handled (0.3621ms)
✔ Phase 16.3 Security: Server Actions enforce server-side auth.uid() and forbid client user_id (3.8676ms)
✔ Phase 16.3 Database Architecture: Trigger P0003 and partial unique index are preserved (4.1205ms)
✔ Phase 16.3 UX & Regression: AddMovieView preserves Retro VHS styling and distinguishes toast feedback (1.9297ms)

ℹ tests 234
ℹ suites 0
ℹ pass 234
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 707.589ms
```

- **Total Test Cases:** 234 tests (100% PASS).
- **ESLint Quality:** 0 errors, 0 warnings (`npm run lint`).
- **TypeScript Static Verification:** 0 errors (`npx tsc --noEmit`).

---

## 8. Status Git (Pre-Commit State)

Pemeriksaan `git status`:
```
On branch master
Your branch is up to date with 'origin/master'.

Changes not staged for commit:
	modified:   src/app/bank/[id]/page.tsx
	modified:   src/components/views/AddMovieView.tsx
	modified:   src/components/views/MovieDetailView.tsx
	modified:   src/lib/movies.ts
	modified:   src/types/index.ts
	tests/phase14_3_journal_ui.test.mjs
	tests/phase14_4_personal_notes_ui.test.mjs

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
*Sesuai batasan sistem: Tidak ada commit, tidak ada push, dan tidak ada deployment yang dilakukan pada turn ini.*

---

## 9. Risiko Tersisa & Rekomendasi Tahap Berikutnya

### Risiko yang Diantisipasi:
1. **Layanan Streaming Baru:** Layanan streaming lokal baru yang belum terdaftar di regex heuristik (misal: Catchplay versi regional tertentu) akan secara default menggunakan access type `other`. Kurator tetap dapat memperbaruinya menjadi `subscription` melalui modal edit di halaman detail.
2. **Ketergantungan Masa Depan pada Dual-Write:** Selama fase transisi, kolom `movies.watch_url` terus disinkronkan secara dual-write. Pada Phase 17+, disarankan untuk mempensiunkan kolom `watch_url` secara penuh agar `movie_watch_sources` menjadi Single Source of Truth sejati.

### Langkah Selanjutnya:
- **Phase 16.3.2:** End-to-End Integration Testing & Visual Verification.
- **Phase 16.4:** Production Migration & Rollout.

---

## 10. Final Verdict

### Status: `PASS`
Implementasi sinkronisasi Add Movie ke Multiple Watch Sources telah selesai dengan standar keamanan tinggi, non-blocking resilience, deteksi platform yang akurat, proteksi idempotensi, dan lolos uji 100% pada seluruh 234 test cases.
