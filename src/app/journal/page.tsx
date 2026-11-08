import type { Metadata } from 'next';
import { listJournals } from '@/lib/journal';
import { JournalListView } from '@/components/views/journal/JournalListView';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'My Journal — MOCAB',
  description: 'Ruang renungan batin harian dan jejak kontemplasi sinematik Beruang Sastra.',
};

export default async function JournalPage() {
  let entries: Awaited<ReturnType<typeof listJournals>>['entries'] = [];
  let total = 0;

  try {
    const data = await listJournals({ page: 1, limit: 50 });
    entries = data.entries;
    total = data.total;
  } catch (error) {
    console.error('Gagal mengambil daftar jurnal di server:', error);
  }

  return <JournalListView initialEntries={entries} totalCount={total} mode="stream" />;
}
