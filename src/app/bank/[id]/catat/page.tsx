import { notFound } from 'next/navigation';
import { CatatView } from '@/components/views/CatatView';
import { getMovie, isValidUuid } from '@/lib/movies';

interface CatatPageProps {
  params: Promise<{
    id: string;
  }>;
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
