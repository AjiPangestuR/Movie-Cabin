# MOCAB — Phase 16.1.1: Security & Architecture Code Review
## Watch Sources Foundation & Data Services

> **Document Version:** 1.0.0  
> **Date:** November 13, 2026  
> **Repository:** MOCAB (Movie Cabin)  
> **Target Branch:** `master`  
> **Baseline Commit:** `8d71e72`  
> **Review Scope:** READ-ONLY Code Review on Phase 16.1 Implementation  
> **Verdict:** `PASS — Aman untuk lanjut ke Phase 16.2.`

---

## 1. Executive Summary

Laporan ini merupakan hasil audit independen dan **READ-ONLY CODE REVIEW** terhadap seluruh implementasi fondasi database, tipe data, validasi, dan Server Actions pada **Phase 16.1** untuk fitur *Watch Sources Management*.

Audit difokuskan pada enam pilar utama:
1. **Security RPC Function:** Evaluasi privilege, `SECURITY DEFINER`, `search_path`, mitigasi null pada `auth.uid()`, dan proteksi eksekusi.
2. **Row Level Security (RLS) & Ownership:** Verifikasi granularitas policy (SELECT, INSERT, UPDATE, DELETE) dan database trigger cross-ownership.
3. **Primary Source Integrity:** Analisis partial unique index, pencegahan *race conditions*, serta semantik "maksimal satu primary" vs "minimal satu primary".
4. **Legacy Backfill:** Verifikasi sifat idempoten, proteksi duplikasi, pelestarian data `movies.watch_url`, dan preservasi string URL asli.
5. **Server Actions Security:** Pemeriksaan autentikasi wajib, mitigasi IDOR (*Insecure Direct Object References*), validasi input, dan revalidasi cache.
6. **Test Quality & Coverage:** Evaluasi pemisahan antara inspeksi statis, unit tests, simulasi lifecycle, dan keterbatasan live database integration tests.

Berdasarkan bukti kode sumber dan nomor baris aktual, **tidak ditemukan celah keamanan kritis (*zero critical vulnerabilities*)**. Arsitektur dinilai aman dan siap melangkah ke **Phase 16.2 (UI/UX Integration)**.

---

## 2. Security RPC Audit (`public.set_primary_watch_source`)

Audit terhadap fungsi RPC pada [`supabase/migrations/20261114000000_phase16_watch_sources.sql`](file:///c:/Users/Hype/Documents/PROJECT/Movie%20Cabin/supabase/migrations/20261114000000_phase16_watch_sources.sql) (baris 118–166):

```sql
118: create or replace function public.set_primary_watch_source(p_source_id uuid)
119: returns public.movie_watch_sources
120: language plpgsql
121: security definer
122: set search_path = ''
123: as $$
...
134:   if not found then
135:     raise exception 'Watch source not found.' using errcode = 'P0004';
136:   end if;
137: 
138:   if v_target.user_id <> auth.uid() then
139:     raise exception 'Unauthorized: watch source does not belong to the user.' using errcode = '42501';
140:   end if;
...
165: revoke all on function public.set_primary_watch_source(uuid) from anon, public;
166: grant execute on function public.set_primary_watch_source(uuid) to authenticated;
```

### 2.1. Analisis `SECURITY DEFINER` vs `INVOKER`
- **Temuan (Baris 121):** Fungsi menggunakan atribut `SECURITY DEFINER`.
- **Evaluasi:** Pemilihan `SECURITY DEFINER` tepat dan terukur. Fungsi ini membutuhkan hak untuk melakukan dua operasi mutasi berurutan (*demote* primary lama dan *promote* target) secara transaksional tanpa terhambat oleh modifikasi session luar.

### 2.2. Proteksi `search_path` Hijacking
- **Temuan (Baris 122):** `set search_path = ''`.
- **Evaluasi:** Sesuai standar keamanan tertinggi PostgreSQL & Supabase hardening. Dengan mengosongkan `search_path`, potensi serangan *schema object shadowing/hijacking* dicegah secara mutlak. Seluruh tabel di dalam blok fungsi dipanggil dengan kualifikasi skema eksplisit `public.movie_watch_sources` (baris 131, 144, 149, 156).

### 2.3. Validasi `auth.uid()` & Otorisasi Pengguna
- **Temuan (Baris 138–140):** Pengecekan eksplisit `v_target.user_id <> auth.uid()`.
- **Evaluasi:**
  - Fungsi memeriksa apakah `user_id` pemilik record sumber tontonan sama dengan `auth.uid()`. Jika berbeda, exception `42501` (`insufficient_privilege`) dilempar secara langsung.
  - **Catatan Analisis Null-Safety:** Dalam logika 3-nilai SQL (*three-valued logic*), ekspresi `'uuid' <> NULL` menghasilkan `NULL` (bukan `TRUE`). Namun pada sistem ini, pemanggilan unauthenticated dicegah di lapisan terluar oleh baris 165 (`REVOKE ALL FROM anon, public`). Untuk standar *defense-in-depth* jangka panjang, klausa dapat disempurnakan menjadi `v_target.user_id IS DISTINCT FROM auth.uid() OR auth.uid() IS NULL`.
- **Hasil Audit:** User **TIDAK DAPAT** mengubah primary source milik pengguna lain.

### 2.4. Hardening Hak Eksekusi (`GRANT` / `REVOKE`)
- **Temuan (Baris 165–166):**
  - `revoke all on function public.set_primary_watch_source(uuid) from anon, public;`
  - `grant execute on function public.set_primary_watch_source(uuid) to authenticated;`
- **Evaluasi:** Hak eksekusi dicabut sepenuhnya dari publik dan pengguna anonim. Hanya kurator dengan token JWT valid (`authenticated`) yang diizinkan memanggil fungsi ini melalui RPC PostgREST.

---

## 3. Row Level Security (RLS) & Data Ownership

Audit terhadap baris 89–111 dan baris 171–220 pada berkas migrasi:

### 3.1. Kebijakan Granular RLS
| Operasi | Policy Name | Baris | Ekspresi Keamanan |
| :--- | :--- | :---: | :--- |
| **SELECT** | `"Users can select own watch sources"` | 175–178 | `USING (user_id = auth.uid())` |
| **INSERT** | `"Users can insert own watch sources"` | 181–192 | `WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM movies m WHERE m.id = movie_id AND m.user_id = auth.uid()))` |
| **UPDATE** | `"Users can update own watch sources"` | 195–207 | `USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM movies m WHERE m.id = movie_id AND m.user_id = auth.uid()))` |
| **DELETE** | `"Users can delete own watch sources"` | 210–214 | `USING (user_id = auth.uid())` |

### 3.2. Double-Walled Ownership Verification
Sistem menerapkan perlindungan lapis ganda (*defense-in-depth*):
1. **Lapisan Pertama (RLS Policies - Baris 186–191 & 201–206):**
   Mencegah kurator memasukkan `movie_id` yang bukan miliknya dengan memeriksa `m.user_id = auth.uid()`.
2. **Lapisan Kedua (Database Trigger - Baris 89–111):**
   Fungsi trigger `validate_movie_watch_source_ownership()` memeriksa langsung pada level PostgreSQL row trigger (`BEFORE INSERT OR UPDATE`):
   ```sql
   96: if not exists (
   97:   select 1 from public.movies m
   98:   where m.id = new.movie_id and m.user_id = new.user_id
   99: ) then
   100:   raise exception 'Cross-ownership error: movie does not exist or does not belong to the user.'
   101:     using errcode = 'P0003';
   102: end if;
   ```
   Bahkan jika operasi database dieksekusi melalui *service role* atau mekanisme internal yang melewati RLS, trigger ini tetap dieksekusi dan menggagalkan manipulasi relasi silang (*cross-ownership tampering*).

### 3.3. Evaluasi Unauthorized Access
- Kolom kepemilikan pada `movies` terverifikasi akurat sebagai `user_id` (sesuai `20261028000000_phase2_init_schema.sql`).
- Tidak ada celah bagi pengguna terautentikasi untuk membaca, menambah, mengubah, atau menghapus sumber tontonan milik kurator lain.

---

## 4. Primary Source Integrity & Concurrency

Audit terhadap integritas partial index dan operasi primary source:

### 4.1. Partial Unique Index Semantics
- **Temuan (Baris 81–83):**
  ```sql
  81: create unique index if not exists movie_watch_sources_primary_unique 
  82:   on public.movie_watch_sources (movie_id) 
  83:   where (is_primary = true);
  ```
- **Evaluasi Semantik:**
  - Index ini hanya mengindeks baris yang memiliki nilai `is_primary = true`.
  - **Maksimal Satu Primary:** Jika untuk suatu `movie_id` dicoba dimasukkan dua baris dengan `is_primary = true`, PostgreSQL langsung melempar error `23505` (`unique_violation`).
  - **Minimal Satu Primary:** Index ini **TIDAK** menjamin setiap film selalu memiliki sumber utama. Sebuah film diperbolehkan memiliki 0 baris primary (misalnya saat film belum memiliki sumber sama sekali, atau jika kurator menonaktifkan seluruh link utama). Hal ini adalah perilaku yang benar secara relasional.

### 4.2. Mitigasi Race Condition pada Pembaruan Primary
1. **Pada Jalur RPC (`set_primary_watch_source`):**
   - Transaksi PostgreSQL melakukan `UPDATE is_primary = false` terlebih dahulu pada primary lama (baris 149–153), sehingga slot pada partial unique index langsung bebas.
   - Kemudian melakukan `UPDATE is_primary = true` pada target (baris 156–159).
   - Seluruh operasi berlangsung dalam satu transaksi atomik. Jika terjadi crash di tengah operasi, transaksi di-rollback secara penuh.
2. **Pada Jalur Server Action (`src/lib/watchSources.ts`):**
   - `createWatchSource` (baris 148–155): Jika sumber baru diminta menjadi primary, server action menurunkan primary lama terlebih dahulu sebelum melakukan `INSERT`.
   - `updateWatchSource` (baris 210–218): Jika status primary diaktifkan, server action menurunkan primary lama terlebih dahulu.
   - Jika dua *request* konkuren tiba bersamaan (*concurrent race condition*), partial unique index PostgreSQL menjadi jaring pengaman terakhir yang menggagalkan salah satu transaksi dengan kode `23505`, yang kemudian ditangkap dan dipetakan secara ramah oleh `mapWatchSourceDbError` (baris 245–247).

### 4.3. Fallback Primary saat Penghapusan
- **Temuan (`src/lib/watchSources.ts`, baris 282–325):**
  - Saat sumber primary dihapus, sistem memeriksa apakah masih ada sumber lain untuk film tersebut (`order by created_at asc limit 1`).
  - Jika ada, sumber tertua otomatis dipromosikan menjadi primary baru (`is_primary = true`).
  - Jika sumber yang dihapus adalah satu-satunya sumber film tersebut, penghapusan berhasil dan film kembali ke kondisi 0 sumber tanpa inkonsistensi data.
- **Rekomendasi Non-Blocking:** Untuk Phase mendatang, operasi delete + fallback promotion dapat dikemas ke dalam database RPC tunggal agar keduanya berada dalam transaksi database terisolasi.

---

## 5. Legacy Data Backfill Audit

Audit terhadap blok migrasi data lama (baris 227–277 pada migration file):

```sql
227: insert into public.movie_watch_sources (...)
238: select
239:   m.id as movie_id,
240:   m.user_id as user_id,
...
259:   trim(m.watch_url) as source_url,
...
266:   true as is_primary,
267:   'Migrasi otomatis dari tautan tontonan lama' as notes,
...
271: where m.watch_url is not null
272:   and trim(m.watch_url) <> ''
273:   and m.watch_url ~* '^https?://\S+$'
274:   and not exists (
275:     select 1 from public.movie_watch_sources ws
276:     where ws.movie_id = m.id
277:   );
```

### 5.1. Evaluasi Kriteria Backfill
1. **Idempotency (Baris 274–276):**
   Klausa `NOT EXISTS (SELECT 1 FROM public.movie_watch_sources ws WHERE ws.movie_id = m.id)` menjamin bahwa jika migrasi dijalankan ulang pada database yang sudah termigrasi, **0 baris baru yang akan ditambahkan**. Tidak ada duplikasi data.
2. **Penyaringan String Kosong & Format URL (Baris 271–273):**
   Mengeliminasi nilai `NULL`, string kosong, spasi kosong, dan URL yang tidak diawali `http://` atau `https://`.
3. **Preservasi URL Asli (Baris 259):**
   Nilai URL asli dipertahankan secara utuh (`trim(m.watch_url)`) tanpa mutasi path, slug, atau parameter query.
4. **Pemetaan Kepemilikan (Baris 240):**
   `m.user_id as user_id` memetakan langsung pemilik film lama ke pemilik sumber tontonan baru, memenuhi validasi trigger cross-ownership.
5. **Integritas Kolom Lama `movies.watch_url`:**
   Diverifikasi bahwa skrip migrasi **TIDAK** memuat `ALTER TABLE DROP COLUMN watch_url` maupun `UPDATE movies SET watch_url = NULL`. Kolom lama tetap utuh untuk menjaga kompatibilitas aplikasi.
6. **Deteksi Domain & Platform:**
   Pola regex mengenali platform utama (Netflix, Prime Video, Disney+, Apple TV+, YouTube, Bioskop Online, dll.) dan memetakan tipe akses secara cerdas (`subscription`, `free`, `rent`), dengan fallback aman ke `'Tautan Tontonan'` dan `'other'` jika domain tidak terdaftar.

---

## 6. Server Actions & Services Audit

Audit terhadap berkas [`src/lib/watchSources.ts`](file:///c:/Users/Hype/Documents/PROJECT/Movie%20Cabin/src/lib/watchSources.ts):

### 6.1. Autentikasi & Autorisasi
- Seluruh Server Actions diawali dengan pemanggilan helper `getAuthenticatedUser()` (baris 21–33) yang mengekstrak session dari cookies via `@/lib/supabase/server`.
- Jika sesi tidak ada atau kadaluarsa, Server Action langsung melempar error sebelum menyentuh data.

### 6.2. Proteksi IDOR (Insecure Direct Object References)
- **`listWatchSources(movieId)` (Baris 80–89):**
  Tidak hanya mempercayai `movieId` dari client, melainkan memverifikasi terlebih dahulu bahwa film tersebut ada dan dimiliki oleh kurator yang sedang login:
  ```ts
  .select('id').eq('id', movieId).eq('user_id', user.id).maybeSingle();
  ```
- **`createWatchSource(input)` (Baris 118–127 & 161):**
  Memverifikasi kepemilikan film, dan menyuntikkan `user_id = user.id` dari session server. Nilai `user_id` dari client diabaikan sepenuhnya.
- **`updateWatchSource(id, input)` (Baris 197–206 & 241):**
  Memverifikasi bahwa sumber tontonan dengan ID tersebut terdaftar atas `user_id` kurator yang sedang aktif.
- **`deleteWatchSource(id)` (Baris 271–280 & 304):**
  Hanya menghapus jika `id` dan `user_id` cocok.
- **`setPrimaryWatchSource(id)` (Baris 346–355):**
  Memverifikasi kepemilikan lokal dan diteruskan ke database RPC yang memverifikasi `auth.uid()`.

### 6.3. Validasi Input & Normalisasi
- Berkas [`src/lib/watch-source-validations.ts`](file:///c:/Users/Hype/Documents/PROJECT/Movie%20Cabin/src/lib/watch-source-validations.ts):
  - Memeriksa UUID v4 secara ketat via `isValidUuid`.
  - Nama platform wajib diisi, trimmed, panjang 1–100 karakter (baris 39–43).
  - Tautan URL tontonan diuji dengan skema aman `http/https`, regex, serta parsing `new URL()` (baris 49–69). Skema berbahaya seperti `javascript:`, `data:`, `file:` ditolak mutlak.
  - Tipe akses wajib berada dalam 7 anggota `ACCESS_TYPES` (baris 31–34).
  - Catatan dibatasi maksimal 500 karakter (baris 83–87).

### 6.4. Revalidasi Cache Next.js
- Setiap aksi mutasi (`create`, `update`, `delete`, `setPrimary`) memanggil:
  ```ts
  revalidatePath(`/bank/${movieId}`);
  revalidatePath('/bank');
  ```
  Memastikan cache halaman detail film dan daftar katalog film langsung diperbarui.

---

## 7. Test Quality & Verification Evaluation

Audit terhadap [`tests/phase16_watch_sources.test.mjs`](file:///c:/Users/Hype/Documents/PROJECT/Movie%20Cabin/tests/phase16_watch_sources.test.mjs):

```
✔ Phase 16.1 SQL Migration: Migration file exists and defines movie_watch_sources schema (1.28ms)
✔ Phase 16.1 SQL Constraints: platform_name, source_url, access_type, and notes constraints (6.29ms)
✔ Phase 16.1 SQL Indexes: Indexes and Partial Unique Index for Primary Source (0.23ms)
✔ Phase 16.1 SQL Triggers: updated_at trigger and Cross-Ownership trigger with P0003 (0.22ms)
✔ Phase 16.1 SQL Atomic Function: set_primary_watch_source RPC (0.23ms)
✔ Phase 16.1 SQL Security & RLS: RLS enabled, granular policies, and anon privilege revocation (0.22ms)
✔ Phase 16.1 SQL Backfill: Idempotent legacy migration preserving movies.watch_url (0.32ms)
✔ Unit: isValidUuid validates UUID v4 formats in watch source validations (0.19ms)
✔ Unit: isValidAccessType validates the 7 official access types (0.18ms)
✔ Unit: isValidPlatformName enforces 1–100 characters non-whitespace (0.15ms)
✔ Unit: isValidSourceUrl accepts valid HTTP/HTTPS and rejects insecure/malformed schemes (0.31ms)
✔ Unit: normalizeSourceUrl and normalizeNotes handle trimming and nulls cleanly (0.15ms)
✔ Unit: isValidNotes enforces maximum 500 characters (0.12ms)
✔ Unit: validateCreateWatchSourceInput sanitizes input and throws on invalid fields (0.76ms)
✔ Unit: validateUpdateWatchSourceInput validates partial fields and rejects empty updates (0.25ms)
✔ Unit: mapWatchSourceDbError translates PostgreSQL error codes to user-facing messages (0.23ms)
✔ Simulation: Multi-Source lifecycle with primary promotion, demotion, and deletion fallback (1.24ms)
✔ Simulation: Ownership enforcement and cross-ownership attack rejection (0.34ms)
✔ Simulation: Idempotent legacy data backfill logic with domain recognition and null/empty handling (0.40ms)
```

### 7.1. Klasifikasi Pengujian
1. **Static Source Code & DDL Inspection (Test 1–7):**
   Memeriksa integritas teks SQL migration, memastikan semua klausa DDL, check constraints, RLS policies, trigger definition, dan revoke/grant terpasang sesuai arsitektur.
2. **Deterministic Unit Tests (Test 8–16):**
   Menguji fungsi validasi murni, URL regex, batas panjang karakter, sanitasi input, dan pemetaan kode error database.
3. **Behavioral Simulation Tests (Test 17–19):**
   Mensimulasikan transisi status primary, demosi primary saat penambahan sumber baru, promosi sumber tertua saat primary dihapus, penolakan relasi silang lintas akun, dan idempotensi backfill.

### 7.2. Pernyataan Keterbatasan Uji Coba (*Test Limitations Disclosure*)
> [!IMPORTANT]
> Test suite otomatis yang dijalankan di Node.js Test Runner memverifikasi logika sintaksis DDL, validasi DTO, dan kontrak Server Actions secara statis dan simulatif. Uji coba ini **bukan pengganti live database integration test** terhadap socket PostgreSQL aktif. Evaluasi penegakan RLS aktual di level engine database hanya dapat dipastikan 100% setelah migrasi SQL diaplikasikan pada instance Supabase nyata.

---

## 8. Summary of Evidence & Line References

| Aspek Audit | Berkas Target | Baris Kode | Status |
| :--- | :--- | :---: | :---: |
| **RPC Function Definition** | `20261114000000_phase16_watch_sources.sql` | 118–163 | **PASS** |
| **RPC `search_path = ''`** | `20261114000000_phase16_watch_sources.sql` | 122 | **PASS** |
| **RPC `auth.uid()` Validation** | `20261114000000_phase16_watch_sources.sql` | 138–140 | **PASS** |
| **RPC Permission Hardening** | `20261114000000_phase16_watch_sources.sql` | 165–166 | **PASS** |
| **Partial Unique Index** | `20261114000000_phase16_watch_sources.sql` | 81–83 | **PASS** |
| **Cross-Ownership Trigger (P0003)** | `20261114000000_phase16_watch_sources.sql` | 89–111 | **PASS** |
| **RLS Granular Policies** | `20261114000000_phase16_watch_sources.sql` | 171–214 | **PASS** |
| **Backfill Idempotency** | `20261114000000_phase16_watch_sources.sql` | 274–277 | **PASS** |
| **Preservation of `watch_url`** | `20261114000000_phase16_watch_sources.sql` | 224–226 | **PASS** |
| **Auth & IDOR Checks** | `src/lib/watchSources.ts` | 77–89, 115–127, 194–206, 268–280, 343–355 | **PASS** |
| **Server-side Input Validation** | `src/lib/watch-source-validations.ts` | 49–69, 108–152, 163–219 | **PASS** |
| **Error Handling & Sanitization** | `src/lib/watch-source-validations.ts` | 222–283 | **PASS** |
| **Cache Revalidation** | `src/lib/watchSources.ts` | 176–177, 250–251, 327–328, 397–398 | **PASS** |
| **Test Quality & Simulation** | `tests/phase16_watch_sources.test.mjs` | 1–637 | **PASS** |

---

## 9. Final Verdict

# `PASS — Aman untuk lanjut ke Phase 16.2.`

Implementasi fondasi database, integritas skema, validasi server, kebijakan RLS, mitigasi IDOR, fungsi RPC atomik, dan backfill idempoten telah diaudit secara teliti. Seluruh parameter keamanan dan integritas data terpenuhi dengan baik tanpa catatan pemblokir (*zero blockers*). MOCAB siap melanjutkan ke **Phase 16.2 (UI/UX Integration)**.
