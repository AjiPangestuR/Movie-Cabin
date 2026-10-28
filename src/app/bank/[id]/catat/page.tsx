import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CatatView } from '@/components/views/CatatView';
import { getMovie, isValidUuid } from '@/lib/movies';

interface CatatPageProps {
  params: Promise<{
    id: string;
  }>;
}

export async function generateMetadata({ params }: CatatPageProps): Promise<Metadata> {
  const { id } = await params;
  if (!id || !(await isValidUuid(id))) {
    return { title: 'Catat Tontonan — MOCAB' };
  }
  const movie = await getMovie(id);
  return {
    title: movie ? `Catat: ${movie.title} — MOCAB` : 'Catat Tontonan — MOCAB',
  };
}

export default async function CatatPage({ params }: CatatPageProps) {
  const { id } = await params;
  if (!id || !(await isValidUuid(id))) {
    notFound();
  }

  const movie = await getMovie(id);
  if (!movie) {
    notFound();
  }

  return <CatatView movie={movie} />;
}
