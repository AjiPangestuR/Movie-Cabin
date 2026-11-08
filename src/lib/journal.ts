'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import {
  type JournalEntry,
  type JournalMovieRelation,
  type CreateJournalInput,
  type UpdateJournalInput,
  type JournalListFilter,
} from '@/types';
import { buildPosterUrl } from '@/lib/tmdb';
import {
  isValidUuid,
  validateCreateJournalInput,
  validateUpdateJournalInput,
  validateResonanceNote,
  mapJournalDbError,
} from '@/lib/journal-validations';

/**
 * Helper internal untuk mendapatkan authenticated user dari session Supabase.
 * Jangan pernah mempercayai user_id dari client.
 */
async function getAuthenticatedUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('Autentikasi diperlukan. Silakan masuk terlebih dahulu.');
  }

  return { supabase, user };
}

/**
 * Helper untuk mapping row database journal_entries ke interface TypeScript JournalEntry.
 */
function mapJournalRow(row: {
  id: string;
  user_id: string;
  title: string;
  content: string;
  entry_date: string;
  mood: string | null;
  tags: string[];
  is_draft: boolean;
  created_at: string;
  updated_at: string;
}): JournalEntry {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    content: row.content,
    entryDate: row.entry_date,
    mood: (row.mood as JournalEntry['mood']) ?? null,
    tags: Array.isArray(row.tags) ? row.tags : [],
    isDraft: Boolean(row.is_draft),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Helper untuk mapping row database journal_movie_relations ke interface TypeScript JournalMovieRelation.
 */
function mapRelationRow(row: {
  id: string;
  user_id: string;
  journal_entry_id: string;
  movie_id: string;
  resonance_note: string | null;
  created_at: string;
  movies?:
    | {
        id: string;
        title: string;
        release_year: number | null;
        runtime: number | null;
        poster_path: string | null;
      }
    | Array<{
        id: string;
        title: string;
        release_year: number | null;
        runtime: number | null;
        poster_path: string | null;
      }>
    | null;
}): JournalMovieRelation {
  const movieData = Array.isArray(row.movies) ? row.movies[0] : row.movies;

  return {
    id: row.id,
    userId: row.user_id,
    journalEntryId: row.journal_entry_id,
    movieId: row.movie_id,
    resonanceNote: row.resonance_note ?? null,
    createdAt: row.created_at,
    movie: movieData
      ? {
          id: movieData.id,
          title: movieData.title,
          year: movieData.release_year ?? '?',
          runtime: movieData.runtime ?? '?',
          posterPath: movieData.poster_path ?? null,
          posterUrl: movieData.poster_path
            ? buildPosterUrl(movieData.poster_path, 'w500')
            : null,
        }
      : undefined,
  };
}

// ==============================================================================
// STEP 1 — JOURNAL DATA SERVICES
// ==============================================================================

/**
 * 1. Membuat entri jurnal baru (published atau draft).
 */
export async function createJournal(input: CreateJournalInput): Promise<JournalEntry> {
  const validated = validateCreateJournalInput(input);
  const { supabase, user } = await getAuthenticatedUser();

  const { data, error } = await supabase
    .from('journal_entries')
    .insert({
      user_id: user.id,
      title: validated.cleanTitle,
      content: validated.cleanContent,
      entry_date: validated.entryDate,
      mood: validated.mood,
      tags: validated.tags,
      is_draft: validated.isDraft,
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(mapJournalDbError(error, 'Gagal membuat entri jurnal.'));
  }

  revalidatePath('/journal');
  revalidatePath('/');

  return mapJournalRow(data);
}

/**
 * 2. Mendapatkan entri jurnal berdasarkan ID, termasuk relasi film terkait.
 */
export async function getJournal(id: string): Promise<JournalEntry | null> {
  if (!id || !isValidUuid(id)) {
    return null;
  }

  const { supabase } = await getAuthenticatedUser();

  const { data: journalRow, error: journalError } = await supabase
    .from('journal_entries')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (journalError || !journalRow) {
    return null;
  }

  const entry = mapJournalRow(journalRow);

  // Ambil film-film yang ditautkan ke jurnal ini
  const relations = await getRelatedMovies(id);
  entry.relatedMovies = relations;

  return entry;
}

/**
 * 3. Mendapatkan daftar jurnal dengan filter lengkap, pencarian, dan pagination.
 */
export async function listJournals(
  filter: JournalListFilter = {}
): Promise<{ entries: JournalEntry[]; total: number }> {
  const { supabase } = await getAuthenticatedUser();

  const page = Math.max(1, filter.page ?? 1);
  const limit = Math.max(1, Math.min(100, filter.limit ?? 20));
  const offset = (page - 1) * limit;

  let query = supabase
    .from('journal_entries')
    .select('*', { count: 'exact' });

  // Filter tanggal spesifik
  if (filter.entryDate) {
    query = query.eq('entry_date', filter.entryDate);
  }

  // Filter rentang tanggal
  if (filter.startDate) {
    query = query.gte('entry_date', filter.startDate);
  }
  if (filter.endDate) {
    query = query.lte('entry_date', filter.endDate);
  }

  // Filter mood preset
  if (filter.mood) {
    query = query.eq('mood', filter.mood);
  }

  // Filter status draft vs published
  if (filter.isDraft !== undefined) {
    query = query.eq('is_draft', filter.isDraft);
  }

  // Filter tag (array containment via Postgres @>)
  if (filter.tag) {
    query = query.contains('tags', [filter.tag.trim().toLowerCase()]);
  }

  // Filter pencarian teks pada judul dan konten
  if (filter.search) {
    const term = `%${filter.search.trim()}%`;
    query = query.or(`title.ilike.${term},content.ilike.${term}`);
  }

  // Pengurutan kronologis: tanggal terbaru lalu waktu pembuatan terbaru
  query = query
    .order('entry_date', { ascending: false })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  const { data, count, error } = await query;

  if (error) {
    console.error('Gagal memuat daftar jurnal:', error.message);
    throw new Error('Gagal memuat daftar jurnal dari database.');
  }

  return {
    entries: (data || []).map(mapJournalRow),
    total: count ?? (data ? data.length : 0),
  };
}

/**
 * 4. Memperbarui entri jurnal.
 */
export async function updateJournal(
  id: string,
  input: UpdateJournalInput
): Promise<JournalEntry> {
  if (!id || !isValidUuid(id)) {
    throw new Error('ID jurnal tidak valid.');
  }

  const validated = validateUpdateJournalInput(input);
  const { supabase, user } = await getAuthenticatedUser();

  // Dapatkan entri saat ini untuk memeriksa kondisi draft/published
  const { data: existing, error: fetchErr } = await supabase
    .from('journal_entries')
    .select('is_draft, content')
    .eq('id', id)
    .maybeSingle();

  if (fetchErr || !existing) {
    throw new Error('Entri jurnal tidak ditemukan.');
  }

  const newIsDraft =
    validated.isDraft !== undefined ? validated.isDraft : existing.is_draft;
  const newContent =
    validated.cleanContent !== undefined ? validated.cleanContent : existing.content;

  // Jika entri dalam status published, konten wajib memiliki isi
  if (!newIsDraft && (!newContent || newContent.trim().length < 1)) {
    throw new Error('Jurnal yang dipublikasikan wajib memiliki konten.');
  }

  const updatePayload: Record<string, unknown> = {};
  if (validated.cleanTitle !== undefined) updatePayload.title = validated.cleanTitle;
  if (validated.cleanContent !== undefined) updatePayload.content = validated.cleanContent;
  if (validated.entryDate !== undefined) updatePayload.entry_date = validated.entryDate;
  if (validated.mood !== undefined) updatePayload.mood = validated.mood;
  if (validated.tags !== undefined) updatePayload.tags = validated.tags;
  if (validated.isDraft !== undefined) updatePayload.is_draft = validated.isDraft;

  const { data, error } = await supabase
    .from('journal_entries')
    .update(updatePayload)
    .eq('id', id)
    .eq('user_id', user.id) // Pastikan ownership
    .select()
    .single();

  if (error || !data) {
    throw new Error(mapJournalDbError(error, 'Gagal memperbarui jurnal.'));
  }

  revalidatePath('/journal');
  revalidatePath('/');

  return mapJournalRow(data);
}

/**
 * 5. Menghapus entri jurnal.
 * Relasi ke film di journal_movie_relations otomatis terhapus via CASCADE.
 */
export async function deleteJournal(id: string): Promise<boolean> {
  if (!id || !isValidUuid(id)) {
    throw new Error('ID jurnal tidak valid.');
  }

  const { supabase, user } = await getAuthenticatedUser();

  const { error } = await supabase
    .from('journal_entries')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    throw new Error(mapJournalDbError(error, 'Gagal menghapus jurnal.'));
  }

  revalidatePath('/journal');
  revalidatePath('/');

  return true;
}

/**
 * 6. Menyimpan draft jurnal (konten boleh kosong).
 */
export async function saveDraft(input: CreateJournalInput): Promise<JournalEntry> {
  return createJournal({
    ...input,
    isDraft: true,
  });
}

/**
 * 7. Mempublikasikan draft jurnal menjadi entri resmi.
 */
export async function publishDraft(
  id: string,
  content?: string
): Promise<JournalEntry> {
  const updateInput: UpdateJournalInput = {
    isDraft: false,
  };
  if (content !== undefined) {
    updateInput.content = content;
  }
  return updateJournal(id, updateInput);
}

/**
 * 8. Mengambil arsip kronologis jurnal yang sudah dipublikasikan.
 */
export async function getJournalArchive(
  page = 1,
  limit = 20
): Promise<{ entries: JournalEntry[]; total: number }> {
  return listJournals({
    isDraft: false,
    page,
    limit,
  });
}

// ==============================================================================
// STEP 2 — JOURNAL MOVIE RELATIONS
// ==============================================================================

/**
 * 1. Menautkan film ke entri jurnal.
 * Validasi kepemilikan ganda (journal & movie milik user yang sama) ditegakkan
 * via trigger PostgreSQL dan RLS.
 */
export async function attachMovieToJournal(
  journalEntryId: string,
  movieId: string,
  resonanceNote?: string | null
): Promise<JournalMovieRelation> {
  if (!journalEntryId || !isValidUuid(journalEntryId)) {
    throw new Error('ID jurnal tidak valid.');
  }
  if (!movieId || !isValidUuid(movieId)) {
    throw new Error('ID film tidak valid.');
  }

  const cleanNote = validateResonanceNote(resonanceNote);
  const { supabase, user } = await getAuthenticatedUser();

  const { data, error } = await supabase
    .from('journal_movie_relations')
    .insert({
      user_id: user.id,
      journal_entry_id: journalEntryId,
      movie_id: movieId,
      resonance_note: cleanNote,
    })
    .select(`
      id,
      user_id,
      journal_entry_id,
      movie_id,
      resonance_note,
      created_at,
      movies (
        id,
        title,
        release_year,
        runtime,
        poster_path
      )
    `)
    .single();

  if (error || !data) {
    throw new Error(mapJournalDbError(error, 'Gagal menautkan film ke jurnal.'));
  }

  revalidatePath('/journal');

  return mapRelationRow(data);
}

/**
 * 2. Melepas tautan film dari entri jurnal.
 */
export async function removeMovieFromJournal(
  journalEntryId: string,
  movieId: string
): Promise<boolean> {
  if (!journalEntryId || !isValidUuid(journalEntryId)) {
    throw new Error('ID jurnal tidak valid.');
  }
  if (!movieId || !isValidUuid(movieId)) {
    throw new Error('ID film tidak valid.');
  }

  const { supabase, user } = await getAuthenticatedUser();

  const { error } = await supabase
    .from('journal_movie_relations')
    .delete()
    .eq('journal_entry_id', journalEntryId)
    .eq('movie_id', movieId)
    .eq('user_id', user.id);

  if (error) {
    throw new Error(mapJournalDbError(error, 'Gagal melepas tautan film.'));
  }

  revalidatePath('/journal');

  return true;
}

/**
 * 3. Mendapatkan daftar film yang ditautkan pada suatu entri jurnal.
 */
export async function getRelatedMovies(
  journalEntryId: string
): Promise<JournalMovieRelation[]> {
  if (!journalEntryId || !isValidUuid(journalEntryId)) {
    return [];
  }

  const { supabase } = await getAuthenticatedUser();

  const { data, error } = await supabase
    .from('journal_movie_relations')
    .select(`
      id,
      user_id,
      journal_entry_id,
      movie_id,
      resonance_note,
      created_at,
      movies (
        id,
        title,
        release_year,
        runtime,
        poster_path
      )
    `)
    .eq('journal_entry_id', journalEntryId)
    .order('created_at', { ascending: true });

  if (error || !data) {
    console.error('Gagal mengambil film terkait jurnal:', error?.message);
    return [];
  }

  return data.map(mapRelationRow);
}

/**
 * 4. Memperbarui catatan resonansi pada tautan film.
 */
export async function updateResonanceNote(
  relationId: string,
  resonanceNote: string | null
): Promise<JournalMovieRelation> {
  if (!relationId || !isValidUuid(relationId)) {
    throw new Error('ID relasi tidak valid.');
  }

  const cleanNote = validateResonanceNote(resonanceNote);
  const { supabase, user } = await getAuthenticatedUser();

  const { data, error } = await supabase
    .from('journal_movie_relations')
    .update({ resonance_note: cleanNote })
    .eq('id', relationId)
    .eq('user_id', user.id)
    .select(`
      id,
      user_id,
      journal_entry_id,
      movie_id,
      resonance_note,
      created_at,
      movies (
        id,
        title,
        release_year,
        runtime,
        poster_path
      )
    `)
    .single();

  if (error || !data) {
    throw new Error(mapJournalDbError(error, 'Gagal memperbarui catatan resonansi.'));
  }

  revalidatePath('/journal');

  return mapRelationRow(data);
}
