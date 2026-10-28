import { AddMovieView } from '@/components/views/AddMovieView';
import { listMoods } from '@/lib/moods';

export default async function AddPage() {
  const moods = await listMoods();
  return <AddMovieView initialMoods={moods.map((m) => m.name)} />;
}
