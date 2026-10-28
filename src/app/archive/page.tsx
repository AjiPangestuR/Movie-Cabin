import { ArchiveView } from '@/components/views/ArchiveView';
import { listMovies } from '@/lib/movies';

export default async function ArchivePage() {
  const movies = await listMovies();
  return <ArchiveView initialMovies={movies} />;
}
