import type { Metadata } from 'next';
import { listMovies } from '@/lib/movies';
import { JournalEditorView } from '@/components/views/journal/JournalEditorView';
import { Movie } from '@/types';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Tulis Jurnal Baru — MOCAB',
  description: 'Tulis renungan batin harian atau catat resonansinya dengan film pilihanmu.',
};

export default async function NewJournalPage() {
  let movies: Movie[] = [];
  try {
    movies = await listMovies();
  } catch (error) {
    console.error('Gagal mengambil daftar film untuk editor jurnal:', error);
  }

  return <JournalEditorView mode="create" availableMovies={movies} />;
}
