# Panduan Migrasi Database & Setup Supabase - MOCAB (Phase 2)

Dokumen ini menjelaskan langkah-langkah menjalankan migrasi skema database dan mengonfigurasi kredensial Supabase untuk aplikasi MOCAB.

---

## 1. Menjalankan Migrasi Database

Terdapat 2 file migrasi yang wajib dijalankan secara berurutan:
1. `supabase/migrations/20261028000000_phase2_init_schema.sql` (Skema utama, tabel, RLS, constraint, trigger, RPC)
2. `supabase/migrations/20261028000001_phase2_security_patch.sql` (Patch keamanan: handle_updated_at SECURITY INVOKER & revoke all tables from anon)

### Langkah di Supabase Dashboard (SQL Editor)
1. Buka dashboard proyek Supabase Anda: [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Masuk ke menu **SQL Editor** di sidebar kiri.
3. Klik **New query**, salin seluruh isi file `20261028000000_phase2_init_schema.sql`, lalu klik **Run**.
4. Buka tab query baru, salin seluruh isi file `20261028000001_phase2_security_patch.sql`, lalu klik **Run**.
5. Pastikan semua query berhasil dijalankan tanpa error.
6. Periksa menu **Table Editor** untuk memastikan tabel berikut telah dibuat dan memiliki status **RLS Enabled**:
   - `movies`
   - `moods`
   - `movie_moods`
   - `watch_logs`

---

## 2. Konfigurasi Environment Variables (`.env.local`)

1. Buat file `.env.local` di root proyek:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxxxxxxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```
   > [!CAUTION]
   > DILARANG KERAS memasukkan `service_role` key ke dalam aplikasi ini. Aplikasi hanya menggunakan URL dan `anon` key dengan autentikasi berbasis sesi cookie pengguna (RLS). Pastikan `.env.local` selalu terdaftar di `.gitignore` dan tidak pernah di-commit.

---

## 3. Akun Pengguna & Default Moods

1. Di Supabase Dashboard > **Authentication** > **Users**, buat akun pengguna (Owner) dengan opsi **Auto Confirm User** dicentang.
2. Login melalui `/login`.
3. Setelah login berhasil, aplikasi otomatis memanggil `ensure_default_moods()` untuk menyisipkan 7 mood default (Psikologis, Emosional, Romantis, Coming of Age, Gelap, Intens, Reflektif).
