import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getNote } from '@/lib/notes';
import { isValidUuid } from '@/lib/journal-validations';
import { NoteEditorView } from '@/components/views/notes/NoteEditorView';

export const dynamic = 'force-dynamic';

interface NoteDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export async function generateMetadata({ params }: NoteDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  if (!id || !isValidUuid(id)) {
    return { title: 'Catatan — MOCAB' };
  }
  const note = await getNote(id);
  return {
    title: note?.title ? `${note.title} — MOCAB` : 'Detail Catatan — MOCAB',
  };
}

export default async function NoteDetailPage({ params }: NoteDetailPageProps) {
  const { id } = await params;
  if (!id || !isValidUuid(id)) {
    notFound();
  }

  const note = await getNote(id);
  if (!note) {
    notFound();
  }

  return <NoteEditorView mode="edit" initialNote={note} />;
}
