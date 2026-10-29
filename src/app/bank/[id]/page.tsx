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

  // Gunakan posterUrl yang sudah dipersist di database jika ada.
  // Fallback: Untuk film lama yang belum memiliki poster_path di database,
  // ambil dari TMDB jika tmdbId tersedia dan TMDB dikonfigurasi.
  let posterUrl: string | null = movie.posterUrl ?? null;
  if (!posterUrl && movie.tmdbId && isTmdbConfigured()) {
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
