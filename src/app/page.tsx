import type { Metadata } from 'next';
import { HomeView } from '@/components/views/HomeView';
import { listMovies } from '@/lib/movies';
import { listMoods } from '@/lib/moods';

export const metadata: Metadata = {
  title: 'Home — MOCAB',
};

export default async function HomePage() {
  const [movies, moods] = await Promise.all([listMovies(), listMoods()]);
  return <HomeView initialMovies={movies} initialMoods={moods.map((m) => m.name)} />;
}
