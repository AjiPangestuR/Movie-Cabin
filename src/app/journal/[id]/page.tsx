import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getJournal } from '@/lib/journal';
import { isValidUuid } from '@/lib/journal-validations';
import { JournalDetailView } from '@/components/views/journal/JournalDetailView';

export const dynamic = 'force-dynamic';

interface JournalDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export async function generateMetadata({ params }: JournalDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  if (!id || !isValidUuid(id)) {
    return { title: 'Detail Jurnal — MOCAB' };
  }
  const journal = await getJournal(id);
  return {
    title: journal ? `${journal.title} — MOCAB` : 'Detail Jurnal — MOCAB',
  };
}

export default async function JournalDetailPage({ params }: JournalDetailPageProps) {
  const { id } = await params;
  if (!id || !isValidUuid(id)) {
    notFound();
  }

  const journal = await getJournal(id);
  if (!journal) {
    notFound();
  }

  return <JournalDetailView entry={journal} />;
}
