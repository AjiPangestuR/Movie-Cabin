import type { Metadata } from 'next';
import { NoteEditorView } from '@/components/views/notes/NoteEditorView';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Catatan Baru — MOCAB',
  description: 'Tulis ide kilat, kutipan, potongan dialog, atau inspirasi singkat.',
};

export default function NewNotePage() {
  return <NoteEditorView mode="create" />;
}
