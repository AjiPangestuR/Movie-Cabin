import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { MovieDetailView } from '@/components/views/MovieDetailView';
import { getMovie, isValidUuid } from '@/lib/movies';
import { listMoods } from '@/lib/moods';

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

  return <MovieDetailView initialMovie={movie} initialMoods={moods.map((m) => m.name)} />;
}
