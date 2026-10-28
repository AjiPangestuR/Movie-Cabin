# MOCAB (Movie Cabin) - Project Rules & Guidelines

## 1. Scope & Fungsionalitas (Phase 3: TMDB Integration)
- **Fase Saat Ini**: Phase 3 — Integrasi TMDB API + Persistensi Supabase + Editorial UI.
- **Tujuan**: Memungkinkan pencarian judul film terintegrasi via The Movie Database (TMDB) API di server-side, autofill metadata film ke form penambahan film, penyimpanan terverifikasi ke Supabase dengan dukungan `tmdb_id`, serta mempertahankan alur input manual dan fallback poster tipografis generatif.
- **Rute yang Diimplementasikan & Dilindungi**:
  - `/login`: Halaman login email + password, konsisten dengan design token MOCAB.
  - `/` (Home): Rekomendasi 3 film acak belum ditonton sesuai filter mood, tombol acak lagi, empty state jika habis.
  - `/bank` (Movie Bank): Daftar semua film, filter mood (multi), filter status (Semua, Belum ditonton, Sudah ditonton), pencarian judul, pengurutan (Terbaru, Judul A-Z, Potensi tertinggi).
  - `/bank/[id]` (Detail Film): Poster tipografi dinamis & gambar TMDB, metadata, sinopsis, ubah mood langsung (minimal 1 mood), tombol tonton (eksternal tab baru), tombol ke halaman catat/edit catatan, konfirmasi hapus film inline (cascade log & moods).
  - `/bank/[id]/catat` (After Watch / Catat Ide): Rating (1-10) dan Potensi Konten (1-10) wajib diisi via 10 tombol angka, input tema, adegan nempel, angle konten, dan catatan bebas. Menyimpan catatan otomatis memperbarui status film menjadi `watched`.
  - `/add` (Tambah Film): Pencarian live via TMDB API dengan fallback katalog simulasi/input manual, verifikasi duplikasi (`tmdb_id` atau `lower(title)+release_year`), pemilihan mood (minimal 1), penambahan mood kustom baru, validasi tautan tonton (http/https).
  - `/archive` (Creator Archive): Daftar film yang sudah ditonton diurutkan berdasarkan potensi konten tertinggi.
  - **Navigasi Atas & Bawah**: Header desktop dengan link navigasi dan logout; BottomNav khusus perangkat mobile (`md:hidden`).

## 2. Tech Stack & Dependencies
- **Framework**: Next.js (App Router)
- **Language**: TypeScript (strict mode, no `any`)
- **Styling**: Tailwind CSS dengan konfigurasi CSS Variables / Design Tokens
- **Fonts**: `next/font/google` — `Fraunces` (heading/serif) dan `DM Sans` (body/sans)
- **Database & Auth**: Supabase (`@supabase/ssr`, `@supabase/supabase-js`)
- **Metadata Provider**: The Movie Database (TMDB) API v3 via server-side Bearer token
- **Linter & Test**: ESLint standar Next.js & Node.js native test runner (`node:test`)

## 3. Design Tokens (Strict Palette)
Hanya ada 1 warna aksen. Dilarang menambahkan warna baru di luar token:
- `bg`: `#121017`
- `surface`: `#1A1622`
- `line`: `#292336`
- `text`: `#F3EEF8`
- `muted`: `#9E94AC`
- `accent`: `#A78BFA`
- `accent-soft`: `rgba(167, 139, 250, 0.12)`
- `ok`: `#8FB89A`
- `danger`: `#E06C8B`
- `amber`: `#E5A967`

## 4. Keamanan & Kebijakan Data (Wajib)
- **RLS Aktif di SEMUA Tabel**:
  - `movies`, `moods`, `movie_moods`, `watch_logs`.
  - Seluruh operasi (SELECT/INSERT/UPDATE/DELETE) wajib memenuhi `user_id = auth.uid()`.
  - Tabel relasi (`movie_moods`, `watch_logs`) wajib memvalidasi kepemilikan parent movie milik `auth.uid()`.
- **Penggunaan Kunci & Token**:
  - DILARANG KERAS menggunakan `service_role` key di mana pun dalam kode.
  - Hanya `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_ANON_KEY` yang digunakan untuk koneksi Supabase.
  - Token TMDB (`TMDB_API_READ_ACCESS_TOKEN`) bersifat **server-only** (tanpa prefix `NEXT_PUBLIC_`), tidak boleh bocor ke bundle client, log, atau query URL.
  - Variabel lingkungan ditaruh di `.env` / `.env.local` dan tidak pernah di-commit ke Git.
- **Proteksi Rute**:
  - Seluruh rute dilindungi proxy middleware (`src/proxy.ts`) kecuali `/login` dan asset statis. Pengguna belum terautentikasi otomatis diarahkan ke `/login`.
- **Validasi Server-Side & Pure Validation Layer**:
  - Seluruh fungsi validasi data murni (input movie, watch log, mood slug, UUID, watch URL) dan pemetaan error RPC dipusatkan di `src/lib/validations.ts` tanpa dependensi I/O eksternal.
  - Judul wajib diisi, minimal 1 mood per film, rating & potensi konten 1-10, URL tonton hanya diawali http/https, nama mood 1-24 karakter dan case-insensitive unique.
  - Validasi tidak hanya mengandalkan form client.
  - Pesan error ke pengguna berbahasa Indonesia yang aman tanpa membocorkan internal database.

## 5. Integrasi TMDB & Atribusi
- Pencarian dan pengambilan detail film dilakukan melalui internal server route (`/api/tmdb/search` dan `/api/tmdb/movie/[id]`).
- UI wajib menyertakan logo resmi TMDB dan teks atribusi: *"This product uses the TMDB API but is not endorsed or certified by TMDB."*
- Jika token TMDB belum diset di server, aplikasi wajib memberikan fallback ke katalog simulasi atau input manual tanpa error fatal.
- Tidak ada operasi penulisan ke database Supabase saat pencarian berlangsung.

## 6. Di Luar Scope (Dilarang Dikerjakan di Phase 3)
- Riwayat rewatch (banyak catatan per film)
- Ubah nama / hapus mood (masuk backlog)
- Fitur multi-user publik / pendaftaran akun terbuka
- Kolaborasi / fitur sosial / shareable link publik
- PWA / offline sync
- AI assist / video essay script generator

## 7. Automated Testing & Verification
- Pengujian unit otomatis dijalankan menggunakan test runner bawaan Node.js (`node:test` & `node:assert/strict`) tanpa menambah third-party dependencies (`npm test`).
- File tes diletakkan di `tests/**/*.test.mjs`.
- Semua validasi logika bisnis murni, parsing tipe, mapper TMDB, dan error mapping wajib memiliki test coverage di unit test.
