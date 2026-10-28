import { MovieDetailView } from '@/components/views/MovieDetailView';

interface MovieDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function MovieDetailPage({ params }: MovieDetailPageProps) {
  const { id } = await params;
  return <MovieDetailView id={Number(id)} />;
}
