import type { Metadata } from 'next';
import { ArchiveView } from '@/components/views/ArchiveView';
import { listMovies } from '@/lib/movies';

export const metadata: Metadata = {
  title: 'Arsip Creator — MOCAB',
};

export default async function ArchivePage() {
  const movies = await listMovies();
  return <ArchiveView initialMovies={movies} />;
}
