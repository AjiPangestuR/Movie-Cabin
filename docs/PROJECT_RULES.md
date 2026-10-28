# MOCAB (Movie Cabin) - Project Rules & Guidelines

## 1. Scope & Fungsionalitas (Phase 2)
- **Fase Saat Ini**: Phase 2 — Database + Auth + CRUD Persisten. Belum ada TMDB (itu Phase 3).
- **Tujuan**: Mengganti penyimpanan in-memory menjadi Supabase (PostgreSQL) dengan autentikasi single-user, memastikan data persisten setelah reload/restart dan koleksi bersifat privat.
- **Rute yang Diimplementasikan & Dilindungi**:
  - `/login`: Halaman login email + password, konsisten dengan design token MOCAB.
  - `/` (Home): Rekomendasi 3 film acak belum ditonton sesuai filter mood, tombol acak lagi, empty state jika habis.
  - `/bank` (Movie Bank): Daftar semua film, filter mood (multi), filter status (Semua, Belum ditonton, Sudah ditonton), pencarian judul, pengurutan (Terbaru, Judul A-Z, Potensi tertinggi).
  - `/bank/[id]` (Detail Film): Poster tipografi dinamis, metadata, sinopsis, ubah mood langsung (minimal 1 mood), tombol tonton (eksternal tab baru), tombol ke halaman catat/edit catatan, konfirmasi hapus film inline (cascade log & moods).
  - `/bank/[id]/catat` (After Watch / Catat Ide): Rating (1-10) dan Potensi Konten (1-10) wajib diisi via 10 tombol angka, input tema, adegan nempel, angle konten, dan catatan bebas. Menyimpan catatan otomatis memperbarui status film menjadi `watched`.
  - `/add` (Tambah Film): Cari judul dari mock katalog TMDB, pilihan fallback input manual, verifikasi duplikasi (tmdb_id atau lower(title)+release_year), pemilihan mood (minimal 1), penambahan mood kustom baru, validasi tautan tonton (http/https).
  - `/archive` (Creator Archive): Daftar film yang sudah ditonton diurutkan berdasarkan potensi konten tertinggi.
  - **Navigasi Bawah (BottomNav)**: Home, Bank, Tambah (+ di tengah), Arsip (tanpa item logout baru). Tombol keluar ditempatkan di header / halaman arsip.

## 2. Tech Stack & Dependencies
- **Framework**: Next.js (App Router)
- **Language**: TypeScript (strict mode, no `any`)
- **Styling**: Tailwind CSS dengan konfigurasi CSS Variables / Design Tokens
- **Fonts**: `next/font/google` — `Fraunces` (heading/serif) dan `DM Sans` (body/sans)
- **Database & Auth**: Supabase (`@supabase/ssr`, `@supabase/supabase-js`)
- **Linter**: ESLint standar Next.js

## 3. Design Tokens (Strict Palette)
Hanya ada 1 warna aksen. Dilarang menambahkan warna baru di luar token:
- `bg`: `#15111F`
- `surface`: `#1F1A2E`
- `line`: `#2F2744`
- `text`: `#EDE7F6`
- `muted`: `#A79FBF`
- `accent`: `#A78BFA` (teks di atas warna aksen: `#15111F`)
- `accent-soft`: `rgba(167, 139, 250, 0.15)`
- `ok`: `#8FB89A`
- `danger`: `#E06C8B`

## 4. Keamanan & Kebijakan Data (Wajib)
- **RLS Aktif di SEMUA Tabel**:
  - `movies`, `moods`, `movie_moods`, `watch_logs`.
  - Seluruh operasi (SELECT/INSERT/UPDATE/DELETE) wajib memenuhi `user_id = auth.uid()`.
  - Tabel relasi (`movie_moods`, `watch_logs`) wajib memvalidasi kepemilikan parent movie milik `auth.uid()`.
- **Penggunaan Kunci**:
  - DILARANG KERAS menggunakan `service_role` key di mana pun dalam kode.
  - Hanya `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_ANON_KEY` yang digunakan.
  - Variabel lingkungan ditaruh di `.env.local` dan tidak pernah di-commit ke Git.
- **Proteksi Rute**:
  - Seluruh rute dilindungi middleware kecuali `/login` dan asset statis. Pengguna belum terautentikasi otomatis diarahkan ke `/login`.
- **Validasi Server-Side & Pure Validation Layer**:
  - Seluruh fungsi validasi data murni (input movie, watch log, mood slug, UUID, watch URL) dan pemetaan error RPC dipusatkan di `src/lib/validations.ts` tanpa dependensi I/O eksternal.
  - Judul wajib diisi, minimal 1 mood per film, rating & potensi konten 1-10, URL tonton hanya diawali http/https, nama mood 1-24 karakter dan case-insensitive unique.
  - Validasi tidak hanya mengandalkan form client.
  - Pesan error ke pengguna berbahasa Indonesia yang aman tanpa membocorkan internal database.

## 5. Di Luar Scope (Dilarang Dikerjakan di Phase 2)
- Integrasi API TMDB nyata & poster resmi (Phase 3)
- Riwayat rewatch (banyak catatan per film)
- Ubah nama / hapus mood (masuk backlog)
- Fitur multi-user publik / pendaftaran akun terbuka
- Kolaborasi / fitur sosial / shareable link publik
- PWA / offline sync
- AI assist / video essay script generator

## 6. Automated Testing & Verification
- Pengujian unit otomatis dijalankan menggunakan test runner bawaan Node.js (`node:test` & `node:assert/strict`) tanpa menambah third-party dependencies (`npm test`).
- File tes diletakkan di `tests/**/*.test.mjs`.
- Semua validasi logika bisnis murni, parsing tipe, dan error mapping wajib memiliki test coverage di unit test.

## 7. Keputusan Produk Mendatang (Phase 3+)
- TMDB API server-side fetching & caching
- Fallback poster tipografi generatif tetap dipertahankan jika poster resmi TMDB tidak tersedia
