'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { Movie, WatchLog } from '@/types';
import { buildPosterUrl } from '@/lib/tmdb';
import {
  isValidUuid,
  validateMovieInput,
  validateWatchLogInput,
  extractMoodNames,
  extractWatchLog,
  mapMovieRpcError,
  mapWatchLogRpcError,
} from '@/lib/validations';

export { isValidUuid };

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
      poster_path,
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
      posterUrl: row.poster_path ? buildPosterUrl(row.poster_path, 'w500') : null,
      posterPath: row.poster_path ?? null,
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
      poster_path,
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
    posterUrl: data.poster_path ? buildPosterUrl(data.poster_path, 'w500') : null,
    posterPath: data.poster_path ?? null,
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
  posterPath?: string | null;
}

/**
 * Menambahkan film baru secara atomik via RPC save_movie_with_moods
 */
export async function addMovie(input: AddMovieInput): Promise<Movie> {
  const { cleanTitle, cleanUrl, yearNum, runtimeNum } = validateMovieInput(input);

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
    p_title: cleanTitle,
    p_release_year: yearNum,
    p_runtime: runtimeNum,
    p_synopsis: input.synopsis || '',
    p_source_url: null,
    p_watch_url: cleanUrl || null,
    p_tmdb_id: input.tmdbId ?? null,
    p_mood_ids: moodIds,
    p_poster_path: input.posterPath || null,
  });

  if (rpcErr) {
    throw new Error(mapMovieRpcError(rpcErr));
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

  const { validRating, validPotential } = validateWatchLogInput(
    logData.rating,
    logData.contentPotential
  );

  const supabase = await createClient();

  const { error: rpcErr } = await supabase.rpc('save_watch_log', {
    p_movie_id: id,
    p_rating: validRating,
    p_potential: validPotential,
    p_theme: logData.theme || '',
    p_scene: logData.scene || '',
    p_angle: logData.angle || '',
    p_notes: logData.notes || '',
  });

  if (rpcErr) {
    throw new Error(mapWatchLogRpcError(rpcErr));
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
