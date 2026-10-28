# MOCAB (Movie Cabin) - Project Rules & Guidelines

## 1. Scope & Fungsionalitas (Phase 1)
- **Fase Saat Ini**: Phase 1 — Foundation + Pemindahan UI Prototype v2 ke Next.js App Router.
- **Tujuan**: Memindahkan prototype HTML v2 menjadi aplikasi web terstruktur dan terawat tanpa menambah atau mengurangi fitur.
- **Penyimpanan Data**: In-memory store (`lib/mock-data.ts`) via abstraksi `lib/movies.ts`. Data hanya bertahan selama sesi berjalan.
- **Rute yang Diimplementasikan**:
  - `/` (Home): Rekomendasi 3 film acak belum ditonton sesuai filter mood, tombol acak lagi, empty state jika habis.
  - `/bank` (Movie Bank): Daftar semua film, filter mood (multi), filter status (Semua, Belum ditonton, Sudah ditonton), pencarian judul, pengurutan (Terbaru, Judul A-Z, Potensi tertinggi).
  - `/bank/[id]` (Detail Film): Poster tipografi dinamis, metadata, sinopsis, ubah mood langsung (minimal 1 mood), tombol tonton (eksternal tab baru), tombol ke halaman catat/edit catatan, konfirmasi hapus film inline.
  - `/bank/[id]/catat` (After Watch / Catat Ide): Rating (1-10) dan Potensi Konten (1-10) wajib diisi via 10 tombol angka, input tema, adegan nempel, angle konten, dan catatan bebas.
  - `/add` (Tambah Film): Cari judul dari mock katalog TMDB, pilihan fallback input manual, verifikasi duplikasi (tmdbId atau judul+tahun), pemilihan mood (minimal 1), validasi tautan tonton (http/https).
  - `/archive` (Creator Archive): Daftar film yang sudah ditonton diurutkan berdasarkan potensi konten tertinggi.
  - **Navigasi Bawah (BottomNav)**: Home, Bank, Tambah (+ di tengah), Arsip.

## 2. Tech Stack & Dependencies
- **Framework**: Next.js (App Router)
- **Language**: TypeScript (strict mode, no `any`)
- **Styling**: Tailwind CSS dengan konfigurasi CSS Variables / Design Tokens
- **Fonts**: `next/font/google` — `Fraunces` (heading/serif) dan `DM Sans` (body/sans)
- **Linter**: ESLint standar Next.js
- **Tanpa CDN Eksternal**: Dilarang memuat skrip/CSS via CDN. Dilarang menambah library third-party tanpa konfirmasi terlebih dahulu.

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

## 4. Aturan Kualitas & Aksesibilitas
- **Keamanan**: Dilarang menggunakan `dangerouslySetInnerHTML`. Tautan eksternal wajib diawali `http://` atau `https://` dan dilengkapi `rel="noopener noreferrer"`.
- **Semantik Interaksi**: Semua elemen interaktif harus elemen `<button>` atau `<a>` sungguhan.
- **Focus & Motion**: Menyediakan `:focus-visible` yang jelas (`outline: 2px solid #A78BFA`). Menghormati `prefers-reduced-motion: reduce`.
- **Tipografi & Kontras**: Ukuran teks minimal 13px. Kontras warna wajib patuh pada token yang ditentukan.
- **Responsivitas**: Desain mobile-first, rapi dan nyaman hingga desktop (maksimal lebar konten `880px`, di tengah / `margin: 0 auto`).
- **Pemisahan Server & Client Components**: Pisahkan server component (halaman dasar/layout) dari client component yang membutuhkan interaktivitas state secara sadar. Jangan menandai semua file dengan `"use client"`.

## 5. Di Luar Scope (Dilarang Dikerjakan di Phase 1)
- Integrasi database nyata / PostgreSQL / Supabase
- Sistem autentikasi pengguna / login / register
- API call ke TMDB nyata / secret API keys
- Next.js API Routes (`app/api/*`)
- Penyimpanan persisten (LocalStorage, IndexedDB, Cookies, dsb.)
- Riwayat rewatch (multiple logs per movie)
- Fitur AI / LLM / script generator
- Fitur sosial / komentar / multi-user
- PWA / offline caching
Setiap ide atau kebutuhan baru wajib dicatat ke `docs/BACKLOG.md` dan tidak diimplementasikan pada fase ini.

## 6. Keputusan Produk Mendatang (Phase 2+)
- **User Model**: Single-user dengan Supabase Auth + RLS (`user_id` di setiap tabel).
- **Log Model**: 1 catatan per film untuk MVP.
- **Penghapusan**: Menghapus film akan ikut menghapus catatan terkait (cascade).
- **Integritas Data**: Pencegahan duplikasi melalui kombinasi unik `user_id` dan `tmdb_id` (atau `title` + `year`).
