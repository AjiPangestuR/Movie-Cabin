'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ensureDefaultMoods } from '@/lib/moods';

export interface LoginState {
  error?: string;
}

export async function loginAction(
  _prevState: LoginState | null,
  formData: FormData
): Promise<LoginState> {
  const email = ((formData.get('email') as string) || '').trim();
  const password = ((formData.get('password') as string) || '').trim();

  if (!email || !password) {
    return { error: 'Email atau password salah' };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: 'Email atau password salah' };
  }

  // Panggil ensure_default_moods() sekali setelah login berhasil
  try {
    await ensureDefaultMoods();
  } catch (err: unknown) {
    console.error('Error invoking ensureDefaultMoods:', err);
    return {
      error: 'Berhasil login, tetapi gagal menyiapkan mood default di database. Silakan coba masuk kembali.',
    };
  }

  redirect('/');
}

export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
