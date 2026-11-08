import type { Metadata } from 'next';
import { getJournalArchive } from '@/lib/journal';
import { JournalListView } from '@/components/views/journal/JournalListView';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Jurnal Arsip — MOCAB',
  description: 'Eksplorasi kronologis jejak batin dan renungan sinematik Beruang Sastra.',
};

export default async function JournalArchivePage() {
  let entries: Awaited<ReturnType<typeof getJournalArchive>>['entries'] = [];
  let total = 0;

  try {
    const data = await getJournalArchive(1, 100);
    entries = data.entries;
    total = data.total;
  } catch (error) {
    console.error('Gagal mengambil arsip jurnal di server:', error);
  }

  return <JournalListView initialEntries={entries} totalCount={total} mode="archive" />;
}
