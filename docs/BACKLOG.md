# MOCAB - Product Backlog (Future Phases)

Dokumen ini menampung ide dan kebutuhan fitur yang berada di luar cakupan Phase 1 (MVP UI Migration).

## Phase 2: Database & Movie Management
- [ ] Integrasi PostgreSQL / Supabase
- [ ] Supabase Auth (Single-user mode dengan Row Level Security)
- [ ] Skema database: `movies`, `moods`, `movie_moods`, `watch_logs`
- [ ] Migrasi data dari in-memory store ke database persisten

## Phase 3: TMDB Metadata Integration
- [ ] Pengambilan data asli via TMDB API (pencarian judul, poster resmi, metadata lengkap)
- [ ] Penyimpanan key TMDB aman di server (environment variables)
- [ ] Fallback caching untuk pencarian judul

## Phase 4: Creator Archive & Advanced Research
- [ ] Riwayat rewatch (multiple watch logs per movie di masa depan)
- [ ] Ekspor catatan ide konten ke format Markdown / Notion / Clipboard
- [ ] Filter film berdasarkan potensi konten dan tag kustom

## Ide & Eksplorasi Lanjutan (Post-MVP)
- [ ] AI research assistant / outline generator untuk video essay 60 detik Beruang Sastra
- [ ] Integrasi penanda waktu (timestamps) untuk adegan film
- [ ] Mode PWA untuk akses cepat di perangkat mobile
