# Panduan Migrasi Database & Setup Supabase - MOCAB (Phase 2)

Dokumen ini menjelaskan langkah-langkah menjalankan migrasi skema database dan mengonfigurasi kredensial Supabase untuk aplikasi MOCAB.

---

## 1. Menjalankan Migrasi Database

File migrasi utama berada di:
`supabase/migrations/20261028000000_phase2_init_schema.sql`

Pilih salah satu metode berikut:

### Opsi A: Lewat Supabase Dashboard (SQL Editor) — Paling Mudah
1. Buka dashboard proyek Supabase Anda: [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Masuk ke menu **SQL Editor** di sidebar kiri.
3. Klik tombol **New query**.
4. Salin seluruh isi file `supabase/migrations/20261028000000_phase2_init_schema.sql`.
5. Tempelkan ke dalam SQL Editor, lalu klik **Run**.
6. Pastikan query berhasil dijalankan (`Success. No rows returned`).
7. Periksa menu **Table Editor** untuk memastikan tabel berikut telah dibuat:
   - `movies`
   - `moods`
   - `movie_moods`
   - `watch_logs`
   Serta pastikan status **RLS** pada keempat tabel tersebut bertanda **Enabled**.

### Opsi B: Lewat Supabase CLI
Jika Anda menggunakan Supabase CLI lokal:
```bash
# Login ke akun Supabase
supabase login

# Tautkan proyek lokal ke proyek Supabase Anda
supabase link --project-ref <project-ref>

# Jalankan migrasi
supabase db push
```

---

## 2. Konfigurasi Environment Variables (`.env.local`)

1. Duplikasi file `.env.example` menjadi `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
2. Dapatkan kredensial dari Supabase Dashboard:
   - Masuk ke menu **Project Settings** > **API**.
   - Salin **Project URL**.
   - Salin **anon** / **public** API Key.
3. Buka file `.env.local` dan isi nilainya:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxxxxxxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```
   > [!CAUTION]
   > DILARANG KERAS memasukkan `service_role` key ke dalam aplikasi ini. Aplikasi hanya menggunakan `anon` key dengan autentikasi berbasis sesi pengguna (RLS). Pastikan `.env.local` selalu terdaftar di `.gitignore`.

---

## 3. Membuat Akun Pengguna Pertama (Owner)

Karena aplikasi MOCAB beroperasi dalam model **single-user** (tanpa form pendaftaran publik di UI):
1. Masuk ke Supabase Dashboard > **Authentication** > **Users**.
2. Klik **Add user** > **Create user**.
3. Masukkan Email dan Password untuk pemilik.
4. Pastikan opsi **Auto Confirm User?** dicentang agar tidak memerlukan verifikasi email.
5. Gunakan kredensial ini untuk login melalui halaman `/login` di browser.
6. Saat pertama kali login, sistem akan otomatis memanggil fungsi `ensure_default_moods()` untuk menyisipkan 7 mood bawaan (Psikologis, Emosional, Romantis, Coming of Age, Gelap, Intens, Reflektif).
