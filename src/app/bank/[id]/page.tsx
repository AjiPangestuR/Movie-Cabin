import { notFound } from 'next/navigation';
import { MovieDetailView } from '@/components/views/MovieDetailView';
import { getMovie, isValidUuid } from '@/lib/movies';
import { listMoods } from '@/lib/moods';

interface MovieDetailPageProps {
  params: Promise<{
    id: string;
  }>;
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
