import { CatalogMovie } from '@/types';

/**
 * Katalog Simulasi Pencarian Film (Phase 2 -> Phase 3 Boundary)
 *
 * Digunakan secara khusus oleh AddMovieView untuk mensimulasikan hasil pencarian judul film
 * sebelum integrasi resmi dengan TMDB API diimplementasikan pada Phase 3.
 * Data di bawah ini TIDAK digunakan sebagai fallback penyimpanan database film sungguhan.
 */
export const CATALOG: CatalogMovie[] = [
  {
    tmdb: 496243,
    title: 'Parasite',
    year: 2019,
    runtime: 132,
    syn: 'Keluarga miskin menyusup ke kehidupan keluarga kaya, dan semuanya mulai tak terkendali.',
  },
  {
    tmdb: 666277,
    title: 'Past Lives',
    year: 2023,
    runtime: 106,
    syn: 'Dua teman masa kecil bertemu lagi puluhan tahun kemudian dan menimbang jalan yang tak jadi diambil.',
  },
  {
    tmdb: 38,
    title: 'Eternal Sunshine of the Spotless Mind',
    year: 2004,
    runtime: 108,
    syn: 'Pasangan yang patah hati memutuskan menghapus ingatan satu sama lain.',
  },
  {
    tmdb: 153,
    title: 'Lost in Translation',
    year: 2003,
    runtime: 102,
    syn: 'Dua orang asing yang sama-sama tersesat bertemu di sebuah hotel di Tokyo.',
  },
  {
    tmdb: 129,
    title: 'Spirited Away',
    year: 2001,
    runtime: 125,
    syn: 'Anak perempuan terjebak di dunia roh dan harus bekerja untuk menyelamatkan orang tuanya.',
  },
  {
    tmdb: 76,
    title: 'Before Sunrise',
    year: 1995,
    runtime: 101,
    syn: 'Dua orang asing ngobrol sepanjang malam di Wina sebelum berpisah.',
  },
];
