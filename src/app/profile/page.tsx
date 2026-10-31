import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { listMovies } from '@/lib/movies';
import { listMoods } from '@/lib/moods';
import { ProfileView } from '@/components/views/ProfileView';

export const metadata: Metadata = {
  title: 'Profil — MOCAB',
  description: 'Pengaturan profil akun, preferensi tema, dan statistik koleksi Movie Cabin.',
};

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const [movies, moods] = await Promise.all([listMovies(), listMoods()]);

  return (
    <ProfileView
      userEmail={user.email || ''}
      movies={movies}
      moods={moods}
    />
  );
}
