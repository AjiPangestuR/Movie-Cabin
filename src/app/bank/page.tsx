import { BankView } from '@/components/views/BankView';
import { listMovies } from '@/lib/movies';
import { listMoods } from '@/lib/moods';

export default async function BankPage() {
  const [movies, moods] = await Promise.all([listMovies(), listMoods()]);
  return <BankView initialMovies={movies} initialMoods={moods.map((m) => m.name)} />;
}
