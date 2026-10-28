'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { Movie, WatchLog } from '@/types';

/**
 * Validasi apakah string adalah UUID v4 yang valid
 */
export async function isValidUuid(id: string): Promise<boolean> {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

function parseYear(val: number | string | undefined): number | null {
  if (val === undefined || val === null || val === '') return null;
  const num = typeof val === 'number' ? val : parseInt(String(val).trim(), 10);
  return isNaN(num) ? null : num;
}

function parseRuntime(val: number | string | undefined): number | null {
  if (val === undefined || val === null || val === '') return null;
  const num = typeof val === 'number' ? val : parseInt(String(val).trim(), 10);
  return isNaN(num) || num <= 0 ? null : num;
}

function extractMoodNames(movieMoods: unknown): string[] {
  if (!Array.isArray(movieMoods)) return [];
  const names: string[] = [];
  for (const item of movieMoods) {
    if (item && typeof item === 'object' && 'moods' in item) {
      const m = (item as { moods: unknown }).moods;
      if (Array.isArray(m)) {
        for (const sub of m) {
          if (sub && typeof sub === 'object' && 'name' in sub && typeof sub.name === 'string') {
            names.push(sub.name);
          }
        }
      } else if (
        m &&
        typeof m === 'object' &&
        'name' in m &&
        typeof (m as { name: unknown }).name === 'string'
      ) {
        names.push((m as { name: string }).name);
      }
    }
  }
  return names;
}

function extractWatchLog(watchLogs: unknown): WatchLog | undefined {
  if (!watchLogs) return undefined;
  const row = Array.isArray(watchLogs) ? watchLogs[0] : watchLogs;
  if (!row || typeof row !== 'object') return undefined;

  const r = row as Record<string, unknown>;
  const rating = typeof r.movie_rating === 'number' ? r.movie_rating : undefined;
  const contentPotential =
    typeof r.content_potential === 'number' ? r.content_potential : undefined;

  if (rating === undefined || contentPotential === undefined) return undefined;

  return {
    rating,
    contentPotential,
    theme: typeof r.theme === 'string' ? r.theme : '',
    scene: typeof r.scene === 'string' ? r.scene : '',
    angle: typeof r.angle === 'string' ? r.angle : '',
    notes: typeof r.notes === 'string' ? r.notes : '',
  };
}

/**
 * Mendapatkan daftar seluruh film dari Supabase (RLS user_id = auth.uid())
 */
export async function listMovies(): Promise<Movie[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('movies')
    .select(`
      id,
      tmdb_id,
      title,
      release_year,
      runtime,
      synopsis,
      source_url,
      watch_url,
      status,
      created_at,
      movie_moods (
        moods (
          id,
          name
        )
      ),
      watch_logs (
        movie_rating,
        content_potential,
        theme,
        scene,
        angle,
        notes
      )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Gagal mengambil daftar film:', error.message);
    throw new Error('Gagal memuat film dari database.');
  }

  return (data || []).map((row) => {
    const moods = extractMoodNames(row.movie_moods);
    const log = extractWatchLog(row.watch_logs);

    return {
      id: row.id,
      tmdbId: row.tmdb_id,
      title: row.title,
      year: row.release_year ?? '?',
      runtime: row.runtime ?? '?',
      moods,
      synopsis: row.synopsis || '',
      watchUrl: row.watch_url || '',
      done: row.status === 'watched',
      log,
    };
  });
}

/**
 * Mendapatkan detail film berdasarkan ID
 */
export async function getMovie(id: string): Promise<Movie | undefined> {
  if (!id || !(await isValidUuid(id))) {
    return undefined;
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('movies')
    .select(`
      id,
      tmdb_id,
      title,
      release_year,
      runtime,
      synopsis,
      source_url,
      watch_url,
      status,
      created_at,
      movie_moods (
        moods (
          id,
          name
        )
      ),
      watch_logs (
        movie_rating,
        content_potential,
        theme,
        scene,
        angle,
        notes
      )
    `)
    .eq('id', id)
    .maybeSingle();

  if (error || !data) {
    return undefined;
  }

  const moods = extractMoodNames(data.movie_moods);
  const log = extractWatchLog(data.watch_logs);

  return {
    id: data.id,
    tmdbId: data.tmdb_id,
    title: data.title,
    year: data.release_year ?? '?',
    runtime: data.runtime ?? '?',
    moods,
    synopsis: data.synopsis || '',
    watchUrl: data.watch_url || '',
    done: data.status === 'watched',
    log,
  };
}

export interface AddMovieInput {
  tmdbId?: number | null;
  title: string;
  year: number | string;
  runtime: number | string;
  moods: string[]; // nama mood
  synopsis: string;
  watchUrl?: string;
}

/**
 * Menambahkan film baru secara atomik via RPC save_movie_with_moods
 */
export async function addMovie(input: AddMovieInput): Promise<Movie> {
  const trimmedTitle = input.title.trim();
  if (!trimmedTitle || trimmedTitle.length < 1) {
    throw new Error('Judul wajib diisi.');
  }

  if (trimmedTitle.length > 200) {
    throw new Error('Judul maksimal 200 karakter.');
  }

  if (!input.moods || input.moods.length === 0) {
    throw new Error('Pilih minimal satu mood.');
  }

  const cleanUrl = (input.watchUrl || '').trim();
  if (cleanUrl) {
    if (cleanUrl.length > 2048 || !/^https?:\/\/\S+$/i.test(cleanUrl)) {
      throw new Error('Tautan harus diawali http:// atau https://');
    }
  }

  const yearNum = parseYear(input.year);
  if (yearNum !== null && (yearNum < 1870 || yearNum > 2100)) {
    throw new Error('Tahun rilis harus antara 1870 sampai 2100.');
  }

  const runtimeNum = parseRuntime(input.runtime);

  const supabase = await createClient();

  // Dapatkan UUID mood dari nama-nama mood
  const { data: moodRows, error: moodErr } = await supabase
    .from('moods')
    .select('id, name')
    .in('name', input.moods);

  if (moodErr || !moodRows || moodRows.length === 0) {
    throw new Error('Pilih minimal satu mood yang valid.');
  }

  const moodIds = (moodRows as Array<{ id: string }>).map((m) => m.id);

  // Panggil atomic RPC save_movie_with_moods
  const { data: newId, error: rpcErr } = await supabase.rpc('save_movie_with_moods', {
    p_title: trimmedTitle,
    p_release_year: yearNum,
    p_runtime: runtimeNum,
    p_synopsis: input.synopsis || '',
    p_source_url: null,
    p_watch_url: cleanUrl || null,
    p_tmdb_id: input.tmdbId ?? null,
    p_mood_ids: moodIds,
  });

  if (rpcErr) {
    if (
      rpcErr.code === '23505' ||
      rpcErr.message.includes('unique') ||
      rpcErr.message.includes('duplicate')
    ) {
      throw new Error('Film ini sudah ada di Kabin.');
    }
    if (rpcErr.message.includes('minimal satu mood')) {
      throw new Error('Pilih minimal satu mood.');
    }
    throw new Error('Gagal menyimpan film ke database.');
  }

  const created = await getMovie(newId as string);
  if (!created) {
    throw new Error('Gagal memuat film yang baru disimpan.');
  }

  revalidatePath('/');
  revalidatePath('/bank');

  return created;
}

/**
 * Mengubah mood film di detail secara atomik via RPC update_movie_moods
 */
export async function updateMovieMoods(id: string, moods: string[]): Promise<Movie> {
  if (!id || !(await isValidUuid(id))) {
    throw new Error('ID film tidak valid.');
  }

  if (!moods || moods.length === 0) {
    throw new Error('Minimal satu mood.');
  }

  const supabase = await createClient();

  // Dapatkan UUID mood dari nama mood
  const { data: moodRows, error: moodErr } = await supabase
    .from('moods')
    .select('id, name')
    .in('name', moods);

  if (moodErr || !moodRows || moodRows.length === 0) {
    throw new Error('Minimal satu mood yang valid.');
  }

  const moodIds = (moodRows as Array<{ id: string }>).map((m) => m.id);

  const { error: rpcErr } = await supabase.rpc('update_movie_moods', {
    p_movie_id: id,
    p_mood_ids: moodIds,
  });

  if (rpcErr) {
    if (rpcErr.message.includes('Minimal satu mood')) {
      throw new Error('Minimal satu mood.');
    }
    throw new Error('Gagal memperbarui mood.');
  }

  const updated = await getMovie(id);
  if (!updated) {
    throw new Error('Film tidak ditemukan.');
  }

  revalidatePath('/');
  revalidatePath('/bank');
  revalidatePath('/archive');
  revalidatePath(`/bank/${id}`);

  return updated;
}

/**
 * Menyimpan catatan after-watch secara atomik via RPC save_watch_log
 */
export async function saveLog(id: string, logData: WatchLog): Promise<Movie> {
  if (!id || !(await isValidUuid(id))) {
    throw new Error('ID film tidak valid.');
  }

  if (!logData.rating || !logData.contentPotential) {
    throw new Error('Isi rating dan potensi konten dulu.');
  }

  if (logData.rating < 1 || logData.rating > 10) {
    throw new Error('Rating harus antara 1 sampai 10.');
  }

  if (logData.contentPotential < 1 || logData.contentPotential > 10) {
    throw new Error('Potensi konten harus antara 1 sampai 10.');
  }

  const supabase = await createClient();

  const { error: rpcErr } = await supabase.rpc('save_watch_log', {
    p_movie_id: id,
    p_rating: logData.rating,
    p_potential: logData.contentPotential,
    p_theme: logData.theme || '',
    p_scene: logData.scene || '',
    p_angle: logData.angle || '',
    p_notes: logData.notes || '',
  });

  if (rpcErr) {
    if (rpcErr.message.includes('Rating') || rpcErr.message.includes('Potensi')) {
      throw new Error('Isi rating dan potensi konten dulu.');
    }
    throw new Error('Gagal menyimpan catatan.');
  }

  const updated = await getMovie(id);
  if (!updated) {
    throw new Error('Film tidak ditemukan.');
  }

  revalidatePath('/');
  revalidatePath('/bank');
  revalidatePath('/archive');
  revalidatePath(`/bank/${id}`);

  return updated;
}

/**
 * Menghapus film dan seluruh catatannya (cascade)
 */
export async function deleteMovie(id: string): Promise<boolean> {
  if (!id || !(await isValidUuid(id))) {
    throw new Error('ID film tidak valid.');
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from('movies')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Gagal menghapus film:', error.message);
    throw new Error('Gagal menghapus film.');
  }

  revalidatePath('/');
  revalidatePath('/bank');
  revalidatePath('/archive');

  return true;
}
