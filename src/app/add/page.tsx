import type { Metadata } from 'next';
import { AddMovieView } from '@/components/views/AddMovieView';
import { listMoods } from '@/lib/moods';

export const metadata: Metadata = {
  title: 'Tambah Film — MOCAB',
};

export default async function AddPage() {
  const moods = await listMoods();
  return <AddMovieView initialMoods={moods.map((m) => m.name)} />;
}
