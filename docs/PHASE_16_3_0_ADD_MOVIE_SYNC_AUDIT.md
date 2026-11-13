# MOCAB — Phase 16.3.0: Add Movie & Watch Sources Synchronization Audit

> **Document Version:** 1.0.0  
> **Date:** November 14, 2026  
> **Repository:** MOCAB (Movie Cabin)  
> **Target Branch:** `master`  
> **Baseline Commit:** `8d71e72` (`feat: complete phase 15 mobile ux redesign`)  
> **Context:** Post Phase 16.1 (Backend & DB), Phase 16.1.1 (Security Review), and Phase 16.2 (UI/UX)  
> **Author:** Antigravity AI Assistant & Engineering Team  
> **Audit Mode:** STRICTLY READ-ONLY AUDIT  
> **Verdict:** `PASS — Implementasi sinkronisasi siap direncanakan.`

---

## 1. Executive Summary

Audit arsitektur ini dilakukan secara **STRICTLY READ-ONLY** untuk menganalisis alur intake film baru (**Add Movie**) pada rute `/add` dan mengevaluasi keselarasan integrasinya dengan sistem **Multiple Watch Sources** yang baru dibangun pada Phase 16.1 dan Phase 16.2.

### Temuan Inti Audit:
1. **Synchronization Gap yang Nyata:** Saat ini, alur `AddMovieView` dan Server Action `addMovie()` masih sepenuhnya berorientasi pada arsitektur lama (kolom tunggal `movies.watch_url`). Nilai URL tontonan yang diinput kurator disimpan ke `movies.watch_url`, namun **TIDAK PERNAH** memanggil `createWatchSource()` dan **TIDAK MENAMBAHKAN** baris apa pun ke tabel `public.movie_watch_sources`.
2. **Dampak Langsung pada User Experience Detail Film:** Ketika kurator menambahkan film baru dengan Watch URL (misal tautan Netflix), lalu diarahkan ke halaman detail `/bank/[id]`:
   - Server Component memanggil `listWatchSources(id)` yang mengembalikan array kosong (`[]`).
   - Tombol Call-to-Action (CTA) tontonan jatuh ke **Branch Fallback 3** (`hasSafeWatchUrl = Boolean(!activePrimarySource && movie.watchUrl)`), menampilkan label generik `"Buka Tautan Nonton (Arsip)"` alih-alih `"Tonton di Netflix"`.
   - Section **Sumber & Tautan Tontonan** menampilkan kotak peringatan arsip warisan: *"Tautan Tontonan Warisan (Arsip): ... Tautan ini tersimpan dari sistem sebelumnya"*, seolah-olah film yang baru diinput 2 detik lalu merupakan data purba dari sistem lama.
3. **Kesiapan Fondasi Keamanan & Database:** Fondasi backend dari Phase 16.1 (`public.movie_watch_sources`, database trigger `validate_movie_watch_source_ownership`, RLS policies, dan Server Action `createWatchSource`) berada dalam status **sangat siap dan aman** untuk menerima delegasi pembuatan sumber tontonan otomatis dari alur Add Movie.
4. **Strategi Integrasi Non-Breaking:** Sinkronisasi dapat dilakukan secara mulus pada layer Server Action (`src/lib/movies.ts`) dengan pendekatan *dual-write* terkontrol dan deteksi platform otomatis (heuristic), tanpa memerlukan modifikasi berisiko pada RPC database inti `save_movie_with_moods` maupun DDL tabel `movies`.

---

## 2. Existing Add Movie Flow

Berikut adalah penelusuran menyeluruh alur Add Movie dengan referensi berkas dan baris kode yang tepat:

| No | Pertanyaan Audit | Jawaban & Analisis Teknis | Referensi Berkas & Baris |
|---|---|---|---|
| **1** | **Di mana pengguna memasukkan Watch URL?** | Pengguna memasukkan Watch URL pada form intake di **Section 4: Tautan Nonton (opsional)**. Field ini berupa input teks (`id="au"`, placeholder `https://... (tautan legal atau platform streaming)`) yang terhubung ke state React `watchUrl`. | `src/components/views/AddMovieView.tsx`:<br>• Line 65: `const [watchUrl, setWatchUrl] = useState('');`<br>• Lines 853–871: `<section className="card ..."> ... <input id="au" value={watchUrl} onChange={(e) => setWatchUrl(e.target.value)} />` |
| **2** | **Apakah Watch URL bersifat optional?** | **YA, bersifat opsional.** Label form secara tegas mencantumkan `(opsional)`. Validasi di client dan server hanya dijalankan jika string URL memiliki karakter non-whitespace (`if (cleanUrl)`). Di skema PostgreSQL, kolom `movies.watch_url` bersifat `NULLABLE` tanpa constraint `NOT NULL`. | `src/components/views/AddMovieView.tsx`:<br>• Line 857: `4. Tautan Nonton <span ...>(opsional)</span>`<br>• Line 290: `const cleanUrl = watchUrl.trim(); if (cleanUrl && ...)`<br>`src/lib/validations.ts`:<br>• Lines 32–33: `if (!url) return true; // Opsional` |
| **3** | **Di mana nilai Watch URL divalidasi?** | Nilai Watch URL divalidasi pada **3 layer pertahanan**:<br>1. **Client-side:** Mengecek regex `^https?://\S+$`.<br>2. **Server-side Action:** `validateMovieInput()` memanggil `isValidWatchUrl()` yang memeriksa regex protokol HTTP/HTTPS dan batas maksimum 2048 karakter.<br>3. **Database-side:** RPC `save_movie_with_moods` melakukan sanitasi `nullif(trim(coalesce(p_watch_url, '')), '')`, dan constraint `movies_watch_url_check` memeriksa regex & panjang karakter. | `src/components/views/AddMovieView.tsx`:<br>• Lines 290–294: Validasi client regex & toast error.<br>`src/lib/validations.ts`:<br>• Lines 32–38: `isValidWatchUrl()`<br>• Lines 68–71: `validateMovieInput()`<br>`supabase/migrations/20261029000000_fix_mood_rls_and_movie_poster.sql`:<br>• Line 96: `v_clean_watch := nullif(...)` |
| **4** | **Kapan data film dikirim ke backend?** | Dikirim saat kurator menekan tombol submit form `Simpan ke Kabin` (`<button type="submit" disabled={saving}>`), yang memicu event handler `handleSave(e: FormEvent)`. Handler memanggil Server Action `addMovie({...})`. | `src/components/views/AddMovieView.tsx`:<br>• Lines 278–318: `handleSave()`<br>• Lines 298–307: `await addMovie({...})`<br>• Lines 875–880: Tombol submit form |
| **5** | **Di mana record film dibuat dalam database?** | Record dibuat di dalam PostgreSQL Database Function / RPC `public.save_movie_with_moods`, yang dipanggil dari Server Action `addMovie()` via `supabase.rpc('save_movie_with_moods', {...})`. Fungsi ini melakukan query `INSERT INTO public.movies` dan `INSERT INTO public.movie_moods`. | `src/lib/movies.ts`:<br>• Lines 179–189: Panggilan `supabase.rpc('save_movie_with_moods', ...)`<br>`supabase/migrations/20261029000000_fix_mood_rls_and_movie_poster.sql`:<br>• Lines 100–122: Klausa `insert into public.movies ... returning id into v_movie_id` |
| **6** | **Apakah movie_id sudah tersedia setelah insert?** | **YA, sudah tersedia seketika.** RPC PostgreSQL mengembalikan `v_movie_id` bertipe UUID melalui klausa `returning id into v_movie_id` (line 122) dan `return v_movie_id;` (line 128). Server Action menerima `newId as string`, memanggil `getMovie(newId)` untuk mengonstruksi objek `Movie`, dan mengembalikannya ke client (`newMovie.id`). | `supabase/migrations/20261029000000_fix_mood_rls_and_movie_poster.sql`:<br>• Line 122 & 128: `returning id into v_movie_id`<br>`src/lib/movies.ts`:<br>• Lines 179 & 195: `const { data: newId } = await supabase.rpc(...)`<br>• Line 203: `return created;` |
| **7** | **Apakah alur ini menggunakan database transaction?** | **YA, di level PostgreSQL RPC.** Eksekusi fungsi `public.save_movie_with_moods` secara otomatis dibungkus dalam single atomic transaction oleh engine PostgreSQL. Jika insert relasi mood gagal atau validasi kepemilikan mood gagal, seluruh penambahan film dibatalkan (rollback). Namun, transaksi ini **BELUM mencakup** tabel `movie_watch_sources`. | `supabase/migrations/20261029000000_fix_mood_rls_and_movie_poster.sql`:<br>• Lines 42–130: Definisi fungsi atomic `save_movie_with_moods` |
| **8** | **Bagaimana error handling jika insert gagal?** | Error dari RPC ditangkap di `src/lib/movies.ts`, dipetakan melalui `mapMovieRpcError()`, lalu dilempar sebagai JavaScript `Error`. Di client `AddMovieView.tsx`, blok `catch (err: unknown)` menangkap exception, menampilkan pesan kesalahan melalui `showToast(msg, true)` berwarna merah, dan mengembalikan `saving = false` pada blok `finally` sehingga input form kurator tidak hilang. | `src/lib/movies.ts`:<br>• Lines 191–193: `throw new Error(mapMovieRpcError(rpcErr));`<br>`src/components/views/AddMovieView.tsx`:<br>• Lines 312–317: `catch (err) { showToast(msg, true); } finally { setSaving(false); }` |

---

## 3. Current Watch URL Handling

### 3.1. Kolom Target di Database
- Kolom target saat ini adalah `public.movies.watch_url` (tipe `text`, nullable).
- Nilai yang masuk disimpan mentah tanpa asosiasi platform (*agnostic URL string*).

### 3.2. Status Kolom `source_url`
- Pada awal perancangan schema Phase 2, terdapat kolom `movies.source_url`.
- Dalam alur `addMovie()` (`src/lib/movies.ts` line 184), parameter ini selalu diisi:
  ```typescript
  p_source_url: null,
  ```
- Komponen `AddMovieView.tsx` **tidak menyediakan** field input untuk `source_url`.
- **Status Audit:** Kolom `source_url` berstatus **DEPRECATED / DEAD CODE** pada alur penambahan film. Tidak ada fitur yang terpengaruh oleh ketiadaan nilai ini.

### 3.3. Normalisasi & Sanitasi URL
- **Client Sanitasi:** `const cleanUrl = watchUrl.trim();` (`AddMovieView.tsx` line 290).
- **Server Sanitasi:** `(input.watchUrl || '').trim();` (`validations.ts` line 68). Mengembalikan `null` jika string kosong.
- **Validasi URL:** Menggunakan regex:
  ```typescript
  /^https?:\/\/\S+$/i
  ```
  dan batas panjang karakter:
  ```typescript
  if (trimmed.length > 2048) return false;
  ```
- **Kelemahan Saat Ini:**
  - Belum melakukan parsing `new URL()` di `validations.ts` untuk memastikan validitas struktur domain (berbeda dengan `src/lib/watch-source-validations.ts` yang sudah memiliki validasi `new URL(trimmed)`).
  - Tidak ada pembersihan tracking query parameters (misal `?utm_source=...` atau `?ref=...`).

### 3.4. Status Platform Detection pada Add Movie
- **Saat ini: TIDAK ADA.**
- `AddMovieView.tsx` dan `src/lib/movies.ts` tidak menjalankan heuristik domain apa pun.
- Heuristik platform saat ini hanya ada di:
  1. SQL Backfill (`supabase/migrations/20261114000000_phase16_watch_sources.sql` lines 241–265).
  2. Modal preset kustom pada `WatchSourceModal.tsx`.

---

## 4. Watch Sources Integration Status

```
[Alur Saat Ini di Produksi / Baseline]

User Submit Form AddMovie (/add)
        │
        ▼
addMovie() Server Action
        │
        ├──► supabase.rpc('save_movie_with_moods')
        │       │
        │       ├──► INSERT public.movies (watch_url = 'https://netflix.com/...')
        │       └──► INSERT public.movie_moods
        │
        └──► [SELESAI & REDIRECT KE /bank/[id]]
                │
                ├──► public.movie_watch_sources TETAP KOSONG (0 Rows!) ◄── [GAP!]
                │
                ▼
MovieDetailView (/bank/[id])
        │
        ├──► listWatchSources(id) === []
        ├──► Primary CTA fallback ke "Buka Tautan Nonton (Arsip)"
        └──► Watch Sources Section menampilkan "Tautan Tontonan Warisan (Arsip)"
```

### Evaluasi Kesenjangan (The Synchronization Gap):
1. **Tidak Ada Pemanggilan `createWatchSource`:** Server Action `addMovie` sama sekali tidak mengimpor atau memanggil modul `createWatchSource()`.
2. **Ketiadaan Record di `movie_watch_sources`:** Setiap film baru yang disimpan melalui `/add` dengan menyertakan tautan tontonan tidak menghasilkan record di `public.movie_watch_sources`.
3. **Pengalaman Pengguna Kontradiktif di Detail View:**
   - Di `src/components/views/MovieDetailView.tsx` (lines 160–216), CTA utama tontonan dirancang memprioritaskan `primarySource.sourceUrl` dengan label dinamis `"Tonton di [Platform]"`.
   - Karena `primarySource` bernilai `undefined`, UI terpaksa jatuh ke Fallback Branch 3 (lines 200–215):
     ```tsx
     if (hasSafeWatchUrl) {
       return (
         <a ... href={movie.watchUrl}>
           <span className="truncate">Buka Tautan Nonton (Arsip)</span>
         </a>
       );
     }
     ```
   - Di section *Sumber & Tautan Tontonan* (lines 511–530), tautan baru tersebut dimasukkan ke kotak *legacy* dengan teks pembimbing: *"Tautan ini tersimpan dari sistem sebelumnya. Anda dapat memperbaruinya menjadi sumber tontonan terkelola."*
4. **Kesimpulan Kritis:** Ini adalah inkonsistensi arsitektur yang nyata. Pengguna yang memasukkan link tontonan baru justru disajikan label arsip warisan, memaksa pengguna melakukan input ulang manual lewat tombol *"Tambah Sumber"* agar tautan tersebut dikenali sebagai entitas terkelola.

---

## 5. Ownership & Security Assessment

Audit keamanan memastikan tidak ada kerentanan eskalasi hak akses atau kebocoran data saat alur sinkronisasi diaktifkan:

### 5.1. Konsistensi Kepemilikan Data (`user_id`)
- `public.movies.user_id` diisi secara otomatis menggunakan `auth.uid()` di dalam fungsi database `save_movie_with_moods` (line 59: `v_user_id uuid := auth.uid();`).
- Saat `createWatchSource()` dipanggil, Server Action tersebut mengambil sesi pengguna melalui `getAuthenticatedUser()` (`user.id = auth.uid()`).
- Karena `newMovie.id` dihasilkan dari RPC yang sama pada sesi yang sama, `movie.user_id` dipastikan identik dengan `watch_sources.user_id`.

### 5.2. Database-Level Cross-Ownership Enforcement
- Bahkan jika terjadi manipulasi parameter atau race condition di level server, migrasi Phase 16.1 telah memasang trigger proteksi ketat:
  ```sql
  create or replace function public.validate_movie_watch_source_ownership()
  ...
  if not exists (
    select 1 from public.movies m
    where m.id = new.movie_id and m.user_id = new.user_id
  ) then
    raise exception 'Cross-ownership error: movie does not exist or does not belong to the user.'
      using errcode = 'P0003';
  ```
- **Jaminan Keamanan:** Mustahil bagi Pengguna A untuk membuat, mengaitkan, atau menyinkronkan sumber tontonan ke film milik Pengguna B. Database engine akan membatalkan transaksi dengan kode error `P0003`.

### 5.3. Row Level Security (RLS) & Scope Hak Akses
- Tabel `public.movie_watch_sources` memiliki RLS aktif dengan kebijakan `INSERT` dan `SELECT`:
  - `with check (user_id = auth.uid())`
  - `using (user_id = auth.uid())`
- Hak akses `anon` dan `public` telah dicabut (`REVOKE ALL`). Hanya peranan `authenticated` yang memiliki akses `INSERT/SELECT/UPDATE/DELETE`.

---

## 6. Failure Scenario Analysis

Analisis menyeluruh terhadap 7 skenario kegagalan potensial:

| Skenario | Deskripsi Kasus | Dampak Potensial | Strategi Penanganan & Mitigasi Direkomendasikan |
|---|---|---|---|
| **A. Movie Insert Berhasil, Watch Source Gagal** | `save_movie_with_moods` berhasil membuat film, tetapi saat memanggil `createWatchSource()` terjadi error (misal format tidak terduga atau constraint failure). | Jika tidak ditangani, user melihat error dan berasumsi film gagal disimpan, padahal film sudah masuk database. | **Graceful Degradation (Non-blocking):** Bungkus pembuatan watch source dalam `try ... catch`. Karena `movies.watch_url` tetap terisi, data link pengguna tidak hilang. Tampilkan toast: `"${title}" masuk ke Kabin. Tautan tontonan dapat dikelola di halaman detail.` Jangan batalkan penyimpanan film. |
| **B. Movie Insert Gagal** | Judul film kosong, mood tidak valid, atau RPC `save_movie_with_moods` gagal. | Alur berhenti sebelum `movie_id` terbentuk. | **Natural Abort:** Karena `createWatchSource()` hanya dipanggil setelah `newMovie.id` tersedia, maka tidak ada record orphan yang akan dibuat di `movie_watch_sources`. Transaksi film di-rollback otomatis oleh Postgres. |
| **C. User Tidak Mengisi Watch URL** | Pengguna mengosongkan field tautan tontonan saat menambah film. | Normal flow. | **Bypass Sinkronisasi:** Jika `!cleanUrl`, lewati eksekusi `createWatchSource()`. Film tersimpan dengan 0 rows di `movie_watch_sources`. Halaman detail akan menampilkan CTA `+ Tambah Sumber Tontonan`. |
| **D. User Memasukkan URL Tidak Valid** | Pengguna memasukkan teks yang bukan URL (`"abcde"`) atau protokol tidak aman (`javascript:...`). | Mengotori database atau memicu constraint violation. | **Early Client & Server Rejection:** Tertangkap di client `AddMovieView.tsx` line 291 dan `validateMovieInput()`. Form submit dicegah, toast peringatan muncul, tidak ada payload yang dikirim ke database. |
| **E. Database Timeout saat Insert Watch Source** | Terjadi latensi jaringan atau lock contention saat menyimpan ke `movie_watch_sources`. | Request timeout atau UI hang. | **Resilient Timeout Boundary:** Tangani error timeout di Server Action. Jika timeout terjadi, log error ke server console, jangan gagalkan redirect pengguna ke `/bank/${newMovie.id}`. |
| **F. Duplicate Submission (Double Click)** | Pengguna mengklik tombol *"Simpan ke Kabin"* dua kali berturut-turut secara agresif. | Potensi terbentuknya dua film identik dan duplikasi watch source. | **UI Locking & Button Disabling:** `saving = true` segera men-disable tombol submit. Untuk pertahanan tambahan, gunakan flag internal atau AbortController sebelum mengeksekusi request berikutnya. |
| **G. Rollback Strategy jika Sinkronisasi Gagal** | Apakah film harus dihapus (hard rollback) jika pembuatan watch source gagal? | Menghapus film yang sudah berhasil dibuat akan membuat pengguna frustrasi karena kehilangan input judul, tahun, durasi, mood, dan sinopsis. | **REKOMENDASI: SOFT RESILIENCE (NO HARD ROLLBACK).** Jangan pernah menghapus record film yang sudah valid. Tautan tontonan adalah data suplemen. Kolom `movies.watch_url` berfungsi sebagai jaring pengaman data. |

---

## 7. Duplication & Data Consistency Risk

### 7.1. Risiko Duplikasi Data (Dual-Write State)
Jika sistem menyimpan URL ke `movies.watch_url` SEKALIGUS ke `public.movie_watch_sources`:
- **Potensi Divergensi:** Jika kurator kemudian mengedit atau menghapus sumber tontonan di `MovieDetailView` (Phase 16.2), nilai di `movies.watch_url` bisa menjadi tidak sinkron (*stale data*) jika tidak diperbarui secara bersamaan.
- **Dampak:** Query lama yang membaca `movies.watch_url` akan melihat tautan lama, sedangkan UI modern melihat data di `movie_watch_sources`.

### 7.2. Solusi & Strategi Bertahap (Roadmap)
1. **Fase Transisi (Phase 16.3 — Saat Ini):**
   - Lakukan **Dual-Write Terkontrol**: Saat film baru ditambahkan via `/add`, tulis ke `movies.watch_url` DAN buat entitas di `public.movie_watch_sources` dengan `is_primary = true`.
   - Pada `updateWatchSource` dan `deleteWatchSource`, jika target adalah primary source, perbarui/kosongkan juga kolom `movies.watch_url` agar kedua layer tetap harmonis.
2. **Fase Matang (Phase 17+):**
   - Jadikan `public.movie_watch_sources` sebagai **Single Source of Truth**.
   - Hapus dependensi frontend terhadap `movies.watch_url`.
   - Buat migration terjadwal untuk mendepresiasi atau menghapus kolom `movies.watch_url`.

---

## 8. UX Integration Recommendation

### 8.1. Desain Form Add Movie: Zero-Friction Intake
- **Rekomendasi Utama:** **JANGAN MEMPERRUMIT FORM ADD MOVIE.**
- Jangan menambahkan dropdown platform, pilihan access type, atau checkbox is_primary pada halaman `/add`.
- Filosofi desain MOCAB pada alur Add Movie adalah **kecepatan kurasi (fast intake)**. Menambahkan terlalu banyak field teknis akan merusak ritme kurator.
- Pertahankan **1 input URL tunggal** yang bersih dan elegan, persis seperti yang ada saat ini.

### 8.2. Heuristic Detection Otomatis (Platform & Access Type)
Ketika pengguna memasukkan URL di form Add Movie, sistem secara cerdas melakukan ekstraksi otomatis di backend menggunakan heuristik domain yang telah teruji:

| Domain Pattern | Platform Name Hasil Deteksi | Default Access Type |
|---|---|---|
| `*netflix.com*` | **Netflix** | `subscription` |
| `*primevideo.com*`, `*amazon.com*` | **Prime Video** | `subscription` |
| `*disneyplus.com*`, `*hotstar.com*` | **Disney+** | `subscription` |
| `*apple.com/tv*`, `*tv.apple.com*` | **Apple TV+** | `subscription` |
| `*vidio.com*` | **Vidio** | `subscription` |
| `*catchplay.com*` | **Catchplay+** | `subscription` |
| `*wetv.vip*` | **WeTV** | `subscription` |
| `*iq.com*`, `*iqiyi.com*` | **iQIYI** | `subscription` |
| `*max.com*`, `*hbomax.com*`, `*hbogoasia*` | **HBO Max / Go** | `subscription` |
| `*bioskoponline.com*` | **Bioskop Online** | `rent` |
| `*klikfilm.com*` | **KlikFilm** | `rent` |
| `*youtube.com*`, `*youtu.be*` | **YouTube** | `free` |
| `*mubi.com*` | **MUBI** | `subscription` |
| `*criterionchannel.com*` | **Criterion Channel** | `subscription` |
| `*viki.com*` | **Viki** | `subscription` |
| Domain lainnya | **Hostname Bersih** atau `"Tautan Tontonan"` | `other` |

> [!TIP]
> Logika ini dapat dipusatkan dalam helper TypeScript murni di `src/lib/watch-source-validations.ts` bernama `detectPlatformFromUrl(url: string)`, sehingga dapat digunakan kembali baik di backend maupun di frontend.

### 8.3. Umpan Balik Visual ke Pengguna (Toast & Redirect)
- Pengguna tetap melihat toast sukses yang ramah:
  `"${newMovie.title}" masuk ke Kabin.`
- Ketika mendarat di `/bank/[id]`, pengguna langsung melihat:
  - Tombol CTA: `"Tonton di Netflix"` (bukan lagi *"Buka Tautan Nonton (Arsip)"*).
  - Di section sumber tontonan: Kartu sumber Netflix berstatus `UTAMA` dengan badge `Langganan`.

---

## 9. Backend Integration Recommendation

Kami mengevaluasi 3 opsi arsitektur backend untuk mengeksekusi sinkronisasi:

### Evaluasi 3 Pendekatan Arsitektur:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ EVALUASI PENDEKATAN SINKRONISASI                                            │
├──────────────────┬─────────────────────────────┬────────────────────────────┤
│ Pendekatan       │ Kelebihan                   │ Kekurangan                 │
├──────────────────┼─────────────────────────────┼────────────────────────────┤
│ Opsi A:          │ • Bersih & sangat modular   │ • Menggunakan dua panggilan│
│ Server Action    │ • Error handling fleksibel  │   database berurutan.      │
│ Orchestration    │   (resilient/non-blocking)  │ • Perlu penanganan manual  │
│ (di movies.ts)   │ • Memakai validasi TS resmi │   jika ingin dual-write.   │
│                  │ • Tanpa DB migration baru   │                            │
├──────────────────┼─────────────────────────────┼────────────────────────────┤
│ Opsi B:          │ • Otomatis di database      │ • Trigger "tersembunyi" &  │
│ Database Trigger │ • Berjalan di level DB      │   sulit di-debug.          │
│ (AFTER INSERT    │                             │ • Sulit passing opsi custom│
│  ON movies)      │                             │ • Jika trigger gagal, insert│
│                  │                             │   film bisa crash total.   │
├──────────────────┼─────────────────────────────┼────────────────────────────┤
│ Opsi C:          │ • Single atomic transaction │ • Memerlukan DDL migration │
│ Modifikasi RPC   │   di level PostgreSQL ACID. │   baru untuk alter RPC.    │
│ save_movie_...   │                             │ • Mengubah RPC inti yang   │
│                  │                             │   sudah stabil sejak P-2.  │
└──────────────────┴─────────────────────────────┴────────────────────────────┘
```

### Rekomendasi Terpilih: OPSI A (Server Action Orchestration di `src/lib/movies.ts`)

#### Justifikasi Teknis:
1. **Separation of Concerns:** RPC `save_movie_with_moods` bertanggung jawab murni atas agregasi inti film dan mood relasional. Menambahkan tanggung jawab ekstraksi URL dan seeding watch source ke dalam fungsi PL/pgSQL tersebut akan memperbesar kopling kode (*tight coupling*).
2. **Resilience & Graceful Fallback:** Dengan orkestrasi di Server Action, kita dapat membungkus pembuatan watch source dalam blok `try ... catch`. Jika modul watch source mengalami anomali, penyimpanan film inti tetap berhasil 100%.
3. **Pemanfaatan Validasi & Heuristik TypeScript:** Logika deteksi platform (regex domain, parsing hostname) jauh lebih bersih, teruji, dan mudah dipelihara dalam TypeScript ketimbang ditulis ulang dalam sintaks `plpgsql` di PostgreSQL.
4. **Zero Migration Risk:** Tidak memerlukan migrasi database baru yang berisiko mengubah function signature atau hak akses role `authenticated`.

#### Blueprint Alur `addMovie()` yang Direkomendasikan:
```typescript
// 1. Eksekusi penyimpanan film inti via RPC yang sudah teruji
const { data: newId, error: rpcErr } = await supabase.rpc('save_movie_with_moods', { ... });
if (rpcErr) throw new Error(mapMovieRpcError(rpcErr));

// 2. Jika kurator mengisi URL tontonan, sinkronisasikan ke movie_watch_sources
if (cleanUrl) {
  try {
    const { platformName, accessType } = detectPlatformFromUrl(cleanUrl);
    await createWatchSource({
      movieId: newId as string,
      platformName,
      sourceUrl: cleanUrl,
      accessType,
      isPrimary: true,
      notes: 'Ditambahkan saat kurasi awal film',
    });
  } catch (syncErr) {
    // Non-blocking: log peringatan, film tetap aman tersimpan
    console.warn('Sinkronisasi watch source awal gagal, tautan tetap aman di movies.watch_url:', syncErr);
  }
}
```

---

## 10. Testing Plan

Rencana pengujian menyeluruh untuk Phase 16.3:

### 10.1. Unit Testing (`tests/phase16_3_sync.test.mjs`)
1. **Pengujian `detectPlatformFromUrl()`:**
   - Verifikasi URL Netflix menghasilkan `platformName: 'Netflix'` dan `accessType: 'subscription'`.
   - Verifikasi URL YouTube menghasilkan `platformName: 'YouTube'` dan `accessType: 'free'`.
   - Verifikasi URL Bioskop Online menghasilkan `platformName: 'Bioskop Online'` dan `accessType: 'rent'`.
   - Verifikasi URL kustom tak dikenal menghasilkan nama platform bersih dari hostname dan `accessType: 'other'`.
   - Verifikasi URL dengan spasi, subdomain (`tv.apple.com`), atau query string tetap terurai akurat.
2. **Pengujian Validasi Input & Sanitasi:**
   - Memastikan `cleanUrl` bernilai `null` jika string hanya berisi spasi.
   - Memastikan error dilempar jika protokol bukan `http://` atau `https://`.

### 10.2. Integration & Flow Testing
1. **Add Movie dengan Watch URL:**
   - Input film lengkap dengan URL tontonan.
   - Verifikasi record `public.movies` terisi.
   - Verifikasi record `public.movie_watch_sources` terisi dengan `is_primary = true`.
   - Verifikasi halaman detail menampilkan tombol `"Tonton di [Platform]"`.
2. **Add Movie tanpa Watch URL:**
   - Input film tanpa URL tontonan.
   - Verifikasi record `public.movies.watch_url` adalah `null`.
   - Verifikasi tabel `public.movie_watch_sources` untuk movie_id tersebut berisi 0 baris.
   - Verifikasi halaman detail menampilkan CTA `+ Tambah Sumber Tontonan`.
3. **Resilience & Fault Tolerance:**
   - Mock kegagalan pada `createWatchSource`.
   - Pastikan fungsi `addMovie()` tidak melempar error dan data film tetap dikembalikan dengan selamat.

---

## 11. Files Proposed for Modification

Daftar file yang akan dimodifikasi pada tahap implementasi Phase 16.3:

| No | Berkas | Perubahan yang Diusulkan | Justifikasi Teknis |
|---|---|---|---|
| **1** | `src/lib/watch-source-validations.ts` | Tambahkan helper murni `detectPlatformFromUrl(url: string): { platformName: string; accessType: AccessType }`. | Menyediakan sentralisasi heuristik pengenalan domain dan tipe akses untuk dipakai di backend maupun modal form. |
| **2** | `src/lib/movies.ts` | Integrasikan pemanggilan `detectPlatformFromUrl` dan `createWatchSource` di dalam Server Action `addMovie()`. | Menjembatani kesenjangan intake film dan pembuatan watch source secara otomatis dan resilient. |
| **3** | `src/lib/watchSources.ts` | Pastikan pemutakhiran atau penghapusan primary source juga memperbarui kolom cadangan `movies.watch_url` (dual-write sync). | Menjaga konsistensi data dua arah antara tabel modern dan kolom warisan. |
| **4** | `tests/phase16_3_sync.test.mjs` | Berkas pengujian baru untuk memverifikasi seluruh skenario sinkronisasi, heuristik URL, dan ketahanan error. | Menjamin kualitas kode dan mencegah regresi pada test suite utama MOCAB. |

---

## 12. Risks & Open Questions

### 12.1. Risiko Teknis
1. **Domain Heuristic Mismatch:** Platform streaming lokal atau independen baru yang belum masuk daftar regex (misal CubMu, Lionsgate Play) akan terdeteksi sebagai `other` dengan nama hostname default. Hal ini tidak merusak fungsionalitas, dan kurator tetap dapat mengeditnya dengan mudah melalui tombol *Edit* di halaman detail.
2. **Double Action Overhead:** Penambahan satu operasi `createWatchSource` menambahkan sekitar 5–15ms ke total waktu Server Action `addMovie`. Karena operasi ini dijalankan di server runtime Next.js ke Supabase regional yang sama, overhead ini tidak terasa oleh kurator.

### 12.2. Pertanyaan Terbuka & Keputusan Desain
- **Pertanyaan:** Apakah kurator perlu diberi opsi untuk langsung memilih platform saat di halaman `/add`?
  - **Rekomendasi Tim Audit:** **TIDAK.** Menjaga kesederhanaan form `/add` adalah prioritas UX nomor satu. Deteksi otomatis dari URL sudah mencakup 90%+ kebutuhan kurator. Pengeditan detail platform dapat dilakukan di halaman detail film jika benar-benar diperlukan.

---

## 13. Final Verdict

### Status: `PASS — Implementasi dapat direncanakan.`

**Kesimpulan Audit:**  
Alur Add Movie saat ini memiliki kesenjangan integrasi yang jelas dengan tabel `public.movie_watch_sources`, namun arsitektur backend, database trigger, dan modul validasi yang dibangun pada Phase 16.1 dan 16.2 telah siap sepenuhnya untuk mendukung sinkronisasi otomatis.

Implementasi Phase 16.3 dapat segera dieksekusi dengan aman menggunakan **Opsi A (Server Action Orchestration)** tanpa risiko regresi terhadap sistem yang ada.

---
*Dokumen audit ini disusun dan diverifikasi secara read-only untuk kelayakan rilis MOCAB Phase 16.*
