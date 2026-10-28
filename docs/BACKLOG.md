# MOCAB - Product Backlog (Future Phases)

Dokumen ini menampung ide dan kebutuhan fitur yang berada di luar cakupan Phase 2.

## Mood Management (Post Phase 2)
- [ ] Ubah nama mood kustom
- [ ] Hapus mood kustom (dengan handling relasi ke film terkait)
- [ ] Warna/tag kustom per mood

## Phase 3: TMDB Metadata Integration
- [ ] Pengambilan data asli via TMDB API (pencarian judul, poster resmi, metadata lengkap)
- [ ] Penyimpanan key TMDB aman di server (environment variables)
- [ ] Fallback caching untuk pencarian judul
- [ ] Pertahankan poster tipografi generatif sebagai fallback jika TMDB tidak memiliki poster

## Phase 4: Creator Archive & Advanced Research
- [ ] Riwayat rewatch (multiple watch logs per movie di masa depan dengan mencabut constraint unique movie_id)
- [ ] Ekspor catatan ide konten ke format Markdown / Notion / Clipboard
- [ ] Filter film berdasarkan potensi konten dan tag kustom

## Ide & Eksplorasi Lanjutan (Post-MVP)
- [ ] AI research assistant / outline generator untuk video essay 60 detik Beruang Sastra
- [ ] Integrasi penanda waktu (timestamps) untuk adegan film
- [ ] Mode PWA untuk akses cepat di perangkat mobile
- [ ] Fitur export/import database lokal JSON
