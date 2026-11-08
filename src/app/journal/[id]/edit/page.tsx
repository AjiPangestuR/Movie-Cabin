import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getJournal } from '@/lib/journal';
import { listMovies } from '@/lib/movies';
import { isValidUuid } from '@/lib/journal-validations';
import { JournalEditorView } from '@/components/views/journal/JournalEditorView';
import { Movie } from '@/types';

export const dynamic = 'force-dynamic';

interface EditJournalPageProps {
  params: Promise<{
    id: string;
  }>;
}

export async function generateMetadata({ params }: EditJournalPageProps): Promise<Metadata> {
  const { id } = await params;
  if (!id || !isValidUuid(id)) {
    return { title: 'Edit Jurnal — MOCAB' };
  }
  const journal = await getJournal(id);
  return {
    title: journal ? `Edit: ${journal.title} — MOCAB` : 'Edit Jurnal — MOCAB',
  };
}

export default async function EditJournalPage({ params }: EditJournalPageProps) {
  const { id } = await params;
  if (!id || !isValidUuid(id)) {
    notFound();
  }

  let movies: Movie[] = [];
  try {
    movies = await listMovies();
  } catch (err) {
    console.error('Gagal mengambil daftar film untuk edit jurnal:', err);
  }

  const journal = await getJournal(id);
  if (!journal) {
    notFound();
  }

  return <JournalEditorView mode="edit" initialJournal={journal} availableMovies={movies} />;
}
