'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { Mood } from '@/types';

/**
 * Generate slug dari nama mood:
 * Lowercase, spasi jadi tanda hubung, karakter non-alfanumerik dibuang.
 * Bila kosong, gunakan fallback acak yang valid dan unik.
 */
export async function generateMoodSlug(name: string): Promise<string> {
  const clean = name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  if (!clean) {
    return `mood-${Date.now().toString(36)}`;
  }

  return clean.slice(0, 32);
}

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
  const name = rawName.trim();
  if (!name || name.length < 1 || name.length > 24) {
    throw new Error('Nama mood harus antara 1 sampai 24 karakter.');
  }

  const slug = await generateMoodSlug(name);
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
    // Tangani unique constraint violation (nama atau slug kembar)
    if (
      error.code === '23505' ||
      error.message.includes('unique') ||
      error.message.includes('duplicate')
    ) {
      throw new Error('Mood dengan nama ini sudah ada.');
    }
    throw new Error('Gagal menambahkan mood baru.');
  }

  revalidatePath('/');
  revalidatePath('/bank');
  revalidatePath('/add');

  return data as Mood;
}
