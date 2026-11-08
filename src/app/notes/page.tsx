import type { Metadata } from 'next';
import { listNotes } from '@/lib/notes';
import { NotesListView } from '@/components/views/notes/NotesListView';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Personal Notes — MOCAB',
  description: 'Papan ide dan catatan pribadi Beruang Sastra untuk menangkap inspirasi kilat.',
};

export default async function NotesPage() {
  let notes: Awaited<ReturnType<typeof listNotes>>['notes'] = [];
  let total = 0;

  try {
    const data = await listNotes({ page: 1, limit: 50 });
    notes = data.notes;
    total = data.total;
  } catch (error) {
    console.error('Gagal mengambil daftar catatan di server:', error);
  }

  return <NotesListView initialNotes={notes} totalCount={total} />;
}
