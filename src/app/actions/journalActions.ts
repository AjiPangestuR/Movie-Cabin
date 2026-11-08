'use server';

import {
  type JournalEntry,
  type JournalMovieRelation,
  type CreateJournalInput,
  type UpdateJournalInput,
  type ActionResponse,
} from '@/types';
import {
  createJournal,
  updateJournal,
  deleteJournal,
  saveDraft,
  publishDraft,
  attachMovieToJournal,
  removeMovieFromJournal,
  updateResonanceNote,
} from '@/lib/journal';
import { isValidUuid } from '@/lib/journal-validations';

/**
 * Server Action: Membuat entri jurnal baru.
 */
export async function createJournalAction(
  input: CreateJournalInput
): Promise<ActionResponse<JournalEntry>> {
  try {
    const entry = await createJournal(input);
    return { success: true, data: entry };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Gagal membuat jurnal.';
    return { success: false, error: errorMsg };
  }
}

/**
 * Server Action: Memperbarui entri jurnal.
 */
export async function updateJournalAction(
  id: string,
  input: UpdateJournalInput
): Promise<ActionResponse<JournalEntry>> {
  try {
    if (!id || !isValidUuid(id)) {
      return { success: false, error: 'ID jurnal tidak valid.' };
    }
    const entry = await updateJournal(id, input);
    return { success: true, data: entry };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Gagal memperbarui jurnal.';
    return { success: false, error: errorMsg };
  }
}

/**
 * Server Action: Menghapus entri jurnal.
 */
export async function deleteJournalAction(
  id: string
): Promise<ActionResponse<boolean>> {
  try {
    if (!id || !isValidUuid(id)) {
      return { success: false, error: 'ID jurnal tidak valid.' };
    }
    await deleteJournal(id);
    return { success: true, data: true };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Gagal menghapus jurnal.';
    return { success: false, error: errorMsg };
  }
}

/**
 * Server Action: Menyimpan draft jurnal.
 */
export async function saveDraftAction(
  input: CreateJournalInput
): Promise<ActionResponse<JournalEntry>> {
  try {
    const entry = await saveDraft(input);
    return { success: true, data: entry };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Gagal menyimpan draft.';
    return { success: false, error: errorMsg };
  }
}

/**
 * Server Action: Mempublikasikan draft jurnal.
 */
export async function publishDraftAction(
  id: string,
  content?: string
): Promise<ActionResponse<JournalEntry>> {
  try {
    if (!id || !isValidUuid(id)) {
      return { success: false, error: 'ID jurnal tidak valid.' };
    }
    const entry = await publishDraft(id, content);
    return { success: true, data: entry };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Gagal mempublikasikan draft.';
    return { success: false, error: errorMsg };
  }
}

/**
 * Server Action: Menautkan film ke jurnal.
 */
export async function attachMovieAction(
  journalEntryId: string,
  movieId: string,
  resonanceNote?: string | null
): Promise<ActionResponse<JournalMovieRelation>> {
  try {
    if (!journalEntryId || !isValidUuid(journalEntryId)) {
      return { success: false, error: 'ID jurnal tidak valid.' };
    }
    if (!movieId || !isValidUuid(movieId)) {
      return { success: false, error: 'ID film tidak valid.' };
    }
    const relation = await attachMovieToJournal(journalEntryId, movieId, resonanceNote);
    return { success: true, data: relation };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Gagal menautkan film ke jurnal.';
    return { success: false, error: errorMsg };
  }
}

/**
 * Server Action: Melepas tautan film dari jurnal.
 */
export async function removeMovieAction(
  journalEntryId: string,
  movieId: string
): Promise<ActionResponse<boolean>> {
  try {
    if (!journalEntryId || !isValidUuid(journalEntryId)) {
      return { success: false, error: 'ID jurnal tidak valid.' };
    }
    if (!movieId || !isValidUuid(movieId)) {
      return { success: false, error: 'ID film tidak valid.' };
    }
    await removeMovieFromJournal(journalEntryId, movieId);
    return { success: true, data: true };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Gagal melepas tautan film.';
    return { success: false, error: errorMsg };
  }
}

/**
 * Server Action: Memperbarui catatan resonansi.
 */
export async function updateResonanceNoteAction(
  relationId: string,
  resonanceNote: string | null
): Promise<ActionResponse<JournalMovieRelation>> {
  try {
    if (!relationId || !isValidUuid(relationId)) {
      return { success: false, error: 'ID relasi tidak valid.' };
    }
    const relation = await updateResonanceNote(relationId, resonanceNote);
    return { success: true, data: relation };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Gagal memperbarui catatan resonansi.';
    return { success: false, error: errorMsg };
  }
}
