import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { MovieDetailView } from '@/components/views/MovieDetailView';
import { getMovie, isValidUuid } from '@/lib/movies';
import { listMoods } from '@/lib/moods';
import { getTmdbMovieDetail, isTmdbConfigured } from '@/lib/tmdb';

interface MovieDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export async function generateMetadata({ params }: MovieDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  if (!id || !(await isValidUuid(id))) {
    return { title: 'Detail Film — MOCAB' };
  }
  const movie = await getMovie(id);
  return {
    title: movie ? `${movie.title} — MOCAB` : 'Detail Film — MOCAB',
  };
}

export default async function MovieDetailPage({ params }: MovieDetailPageProps) {
  const { id } = await params;
  if (!id || !(await isValidUuid(id))) {
    notFound();
  }

  const [movie, moods] = await Promise.all([getMovie(id), listMoods()]);
  if (!movie) {
    notFound();
  }

  // Jika film memiliki tmdbId dan token TMDB dikonfigurasi pada server,
  // ambil metadata detail TMDB secara aman untuk menampilkan poster resmi
  let posterUrl: string | null = null;
  if (movie.tmdbId && isTmdbConfigured()) {
    try {
      const detail = await getTmdbMovieDetail(movie.tmdbId);
      posterUrl = detail.posterUrl;
    } catch {
      // Abaikan bila TMDB offline atau rate limited; fallback tipografis generatif MOCAB akan aktif
    }
  }

  return (
    <MovieDetailView
      initialMovie={movie}
      initialMoods={moods.map((m) => m.name)}
      posterUrl={posterUrl}
    />
  );
}
