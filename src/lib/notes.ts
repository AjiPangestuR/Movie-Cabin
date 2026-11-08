'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import {
  type PersonalNote,
  type CreateNoteInput,
  type UpdateNoteInput,
  type NoteListFilter,
} from '@/types';
import {
  isValidUuid,
  validateCreateNoteInput,
  validateUpdateNoteInput,
  mapJournalDbError,
} from '@/lib/journal-validations';

/**
 * Helper internal untuk mendapatkan authenticated user dari session Supabase.
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
 * Helper untuk mapping row database personal_notes ke interface TypeScript PersonalNote.
 */
function mapNoteRow(row: {
  id: string;
  user_id: string;
  title: string;
  content: string;
  tags: string[];
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}): PersonalNote {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    content: row.content,
    tags: Array.isArray(row.tags) ? row.tags : [],
    isPinned: Boolean(row.is_pinned),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ==============================================================================
// STEP 3 — PERSONAL NOTES DATA SERVICES
// ==============================================================================

/**
 * 1. Membuat catatan pribadi baru.
 * Title bersifat opsional (default ''), content wajib diisi (1-10.000 karakter).
 */
export async function createNote(input: CreateNoteInput): Promise<PersonalNote> {
  const validated = validateCreateNoteInput(input);
  const { supabase, user } = await getAuthenticatedUser();

  const { data, error } = await supabase
    .from('personal_notes')
    .insert({
      user_id: user.id,
      title: validated.cleanTitle,
      content: validated.cleanContent,
      tags: validated.tags,
      is_pinned: validated.isPinned,
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(mapJournalDbError(error, 'Gagal membuat catatan pribadi.'));
  }

  revalidatePath('/notes');
  revalidatePath('/');

  return mapNoteRow(data);
}

/**
 * 2. Mendapatkan catatan pribadi berdasarkan ID.
 */
export async function getNote(id: string): Promise<PersonalNote | null> {
  if (!id || !isValidUuid(id)) {
    return null;
  }

  const { supabase } = await getAuthenticatedUser();

  const { data, error } = await supabase
    .from('personal_notes')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return mapNoteRow(data);
}

/**
 * 3. Mendapatkan daftar catatan pribadi dengan filter, tag, search, dan pagination.
 * Terurut secara default: is_pinned DESC, updated_at DESC.
 */
export async function listNotes(
  filter: NoteListFilter = {}
): Promise<{ notes: PersonalNote[]; total: number }> {
  const { supabase } = await getAuthenticatedUser();

  const page = Math.max(1, filter.page ?? 1);
  const limit = Math.max(1, Math.min(100, filter.limit ?? 30));
  const offset = (page - 1) * limit;

  let query = supabase
    .from('personal_notes')
    .select('*', { count: 'exact' });

  // Filter pinned status
  if (filter.isPinned !== undefined) {
    query = query.eq('is_pinned', filter.isPinned);
  }

  // Filter tag
  if (filter.tag) {
    query = query.contains('tags', [filter.tag.trim().toLowerCase()]);
  }

  // Filter pencarian teks pada judul dan konten
  if (filter.search) {
    const term = `%${filter.search.trim()}%`;
    query = query.or(`title.ilike.${term},content.ilike.${term}`);
  }

  // Pengurutan: catatan yang disematkan (pinned) selalu paling atas, lalu updated_at terbaru
  query = query
    .order('is_pinned', { ascending: false })
    .order('updated_at', { ascending: false })
    .range(offset, offset + limit - 1);

  const { data, count, error } = await query;

  if (error) {
    console.error('Gagal memuat catatan pribadi:', error.message);
    throw new Error('Gagal memuat catatan dari database.');
  }

  return {
    notes: (data || []).map(mapNoteRow),
    total: count ?? (data ? data.length : 0),
  };
}

/**
 * 4. Memperbarui catatan pribadi.
 */
export async function updateNote(
  id: string,
  input: UpdateNoteInput
): Promise<PersonalNote> {
  if (!id || !isValidUuid(id)) {
    throw new Error('ID catatan tidak valid.');
  }

  const validated = validateUpdateNoteInput(input);
  const { supabase, user } = await getAuthenticatedUser();

  const updatePayload: Record<string, unknown> = {};
  if (validated.cleanTitle !== undefined) updatePayload.title = validated.cleanTitle;
  if (validated.cleanContent !== undefined) updatePayload.content = validated.cleanContent;
  if (validated.tags !== undefined) updatePayload.tags = validated.tags;
  if (validated.isPinned !== undefined) updatePayload.is_pinned = validated.isPinned;

  const { data, error } = await supabase
    .from('personal_notes')
    .update(updatePayload)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error || !data) {
    throw new Error(mapJournalDbError(error, 'Gagal memperbarui catatan pribadi.'));
  }

  revalidatePath('/notes');
  revalidatePath('/');

  return mapNoteRow(data);
}

/**
 * 5. Menghapus catatan pribadi.
 */
export async function deleteNote(id: string): Promise<boolean> {
  if (!id || !isValidUuid(id)) {
    throw new Error('ID catatan tidak valid.');
  }

  const { supabase, user } = await getAuthenticatedUser();

  const { error } = await supabase
    .from('personal_notes')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    throw new Error(mapJournalDbError(error, 'Gagal menghapus catatan pribadi.'));
  }

  revalidatePath('/notes');
  revalidatePath('/');

  return true;
}

/**
 * 6. Menyematkan (pin) catatan ke atas memo board.
 */
export async function pinNote(id: string): Promise<PersonalNote> {
  return updateNote(id, { isPinned: true });
}

/**
 * 7. Melepas sematan (unpin) catatan.
 */
export async function unpinNote(id: string): Promise<PersonalNote> {
  return updateNote(id, { isPinned: false });
}
