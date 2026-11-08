'use server';

import {
  type PersonalNote,
  type CreateNoteInput,
  type UpdateNoteInput,
  type ActionResponse,
} from '@/types';
import {
  createNote,
  updateNote,
  deleteNote,
  pinNote,
  unpinNote,
} from '@/lib/notes';
import { isValidUuid } from '@/lib/journal-validations';

/**
 * Server Action: Membuat catatan pribadi baru.
 */
export async function createNoteAction(
  input: CreateNoteInput
): Promise<ActionResponse<PersonalNote>> {
  try {
    const note = await createNote(input);
    return { success: true, data: note };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Gagal membuat catatan.';
    return { success: false, error: errorMsg };
  }
}

/**
 * Server Action: Memperbarui catatan pribadi.
 */
export async function updateNoteAction(
  id: string,
  input: UpdateNoteInput
): Promise<ActionResponse<PersonalNote>> {
  try {
    if (!id || !isValidUuid(id)) {
      return { success: false, error: 'ID catatan tidak valid.' };
    }
    const note = await updateNote(id, input);
    return { success: true, data: note };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Gagal memperbarui catatan.';
    return { success: false, error: errorMsg };
  }
}

/**
 * Server Action: Menghapus catatan pribadi.
 */
export async function deleteNoteAction(
  id: string
): Promise<ActionResponse<boolean>> {
  try {
    if (!id || !isValidUuid(id)) {
      return { success: false, error: 'ID catatan tidak valid.' };
    }
    await deleteNote(id);
    return { success: true, data: true };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Gagal menghapus catatan.';
    return { success: false, error: errorMsg };
  }
}

/**
 * Server Action: Menyematkan (pin) catatan.
 */
export async function pinNoteAction(
  id: string
): Promise<ActionResponse<PersonalNote>> {
  try {
    if (!id || !isValidUuid(id)) {
      return { success: false, error: 'ID catatan tidak valid.' };
    }
    const note = await pinNote(id);
    return { success: true, data: note };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Gagal menyematkan catatan.';
    return { success: false, error: errorMsg };
  }
}

/**
 * Server Action: Melepas sematan (unpin) catatan.
 */
export async function unpinNoteAction(
  id: string
): Promise<ActionResponse<PersonalNote>> {
  try {
    if (!id || !isValidUuid(id)) {
      return { success: false, error: 'ID catatan tidak valid.' };
    }
    const note = await unpinNote(id);
    return { success: true, data: note };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Gagal melepas sematan catatan.';
    return { success: false, error: errorMsg };
  }
}
