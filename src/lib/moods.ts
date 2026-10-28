'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { Mood } from '@/types';
import { generateMoodSlug, validateMoodName, mapMoodRpcError } from '@/lib/validations';

export { generateMoodSlug };

/**
 * Memanggil RPC ensure_default_moods() sekali setelah login.
 * Jika percobaan pertama gagal, lakukan retry 1 kali.
 * Jika tetap gagal, lemparkan error agar tidak ditelan diam-diam.
 */
export async function ensureDefaultMoods(): Promise<void> {
  const supabase = await createClient();
  let { error } = await supabase.rpc('ensure_default_moods');

  // Retry satu kali jika panggilan pertama gagal
  if (error) {
    console.warn('Percobaan pertama ensure_default_moods gagal, mencoba ulang...', error.message);
    const retry = await supabase.rpc('ensure_default_moods');
    error = retry.error;
  }

  if (error) {
    console.error('Gagal memastikan mood default setelah retry:', error.message);
    throw new Error('Gagal menyiapkan mood default: ' + error.message);
  }
}

/**
 * Mengambil seluruh daftar mood milik user yang sedang aktif
 */
export async function listMoods(): Promise<Mood[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('moods')
    .select('id, name, slug')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Gagal mengambil daftar mood:', error.message);
    return [];
  }

  // Jika user aktif belum memiliki mood di database (misal sesi sudah aktif sebelum migrasi dijalankan),
  // jalankan ensureDefaultMoods() sebagai inisialisasi agar halaman mood tidak kosong tanpa penjelasan.
  if (!data || data.length === 0) {
    try {
      await ensureDefaultMoods();
      const refetched = await supabase
        .from('moods')
        .select('id, name, slug')
        .order('created_at', { ascending: true });
      return (refetched.data || []) as Mood[];
    } catch (e) {
      console.warn('Fallback inisialisasi mood default di listMoods dilewati:', e);
    }
  }

  return (data || []) as Mood[];
}

/**
 * Menambahkan mood kustom baru (1-24 karakter, unik case-insensitive)
 */
export async function createCustomMood(rawName: string): Promise<Mood> {
  const name = validateMoodName(rawName);
  const slug = generateMoodSlug(name);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('moods')
    .insert({
      name,
      slug,
    })
    .select('id, name, slug')
    .single();

  if (error) {
    throw new Error(mapMoodRpcError(error));
  }

  revalidatePath('/');
  revalidatePath('/bank');
  revalidatePath('/add');

  return data as Mood;
}
