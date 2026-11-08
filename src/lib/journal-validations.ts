import type {
  CreateJournalInput,
  UpdateJournalInput,
  CreateNoteInput,
  UpdateNoteInput,
} from '@/types';

/**
 * Validasi apakah string adalah format UUID v4 yang valid.
 */
export function isValidUuid(id: string): boolean {
  if (!id || typeof id !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id.trim());
}

/**
 * 8 Preset mood retro resmi untuk jurnal pribadi.
 */
export const JOURNAL_MOODS = [
  'Melankolis',
  'Kontemplatif',
  'Nostalgia',
  'Tenang',
  'Resah',
  'Hangat',
  'Puitis',
  'Soliter',
] as const;

export type JournalMood = (typeof JOURNAL_MOODS)[number];

/**
 * Validasi apakah nilai adalah mood preset jurnal yang valid.
 */
export function isValidJournalMood(mood: unknown): mood is JournalMood {
  if (typeof mood !== 'string') return false;
  return (JOURNAL_MOODS as readonly string[]).includes(mood);
}

/**
 * Validasi format tanggal YYYY-MM-DD.
 */
export function isValidDateString(dateStr: string): boolean {
  if (!dateStr || typeof dateStr !== 'string') return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
  if (!match) return false;

  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);

  if (year < 1900 || year > 2100) return false;
  if (month < 1 || month > 12) return false;

  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return day >= 1 && day <= daysInMonth;
}

/**
 * Format tanggal saat ini sebagai YYYY-MM-DD (UTC).
 */
export function getCurrentDateString(): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Sanitasi dan normalisasi daftar tags.
 */
export function sanitizeTags(tags?: unknown): string[] {
  if (!tags || !Array.isArray(tags)) return [];
  const cleanList = tags
    .filter((t): t is string => typeof t === 'string')
    .map((t) => t.trim().toLowerCase())
    .filter((t) => t.length > 0 && t.length <= 50);

  // Deduplikasi menggunakan Set
  return Array.from(new Set(cleanList));
}

/**
 * Validasi data input pembuatan jurnal baru.
 */
export function validateCreateJournalInput(input: CreateJournalInput): {
  cleanTitle: string;
  cleanContent: string;
  entryDate: string;
  mood: JournalMood | null;
  tags: string[];
  isDraft: boolean;
} {
  const cleanTitle = (input.title || '').trim();
  if (!cleanTitle || cleanTitle.length < 1) {
    throw new Error('Judul jurnal wajib diisi.');
  }
  if (cleanTitle.length > 200) {
    throw new Error('Judul jurnal maksimal 200 karakter.');
  }

  const isDraft = Boolean(input.isDraft);
  const rawContent = input.content ?? '';

  if (rawContent.length > 50000) {
    throw new Error('Konten jurnal maksimal 50.000 karakter.');
  }

  // Published entries must have at least one non-whitespace character
  if (!isDraft && rawContent.trim().length < 1) {
    throw new Error('Jurnal yang dipublikasikan wajib memiliki konten.');
  }

  const cleanContent = rawContent;

  let entryDate = getCurrentDateString();
  if (input.entryDate) {
    const trimmedDate = input.entryDate.trim();
    if (!isValidDateString(trimmedDate)) {
      throw new Error('Format tanggal jurnal harus YYYY-MM-DD yang valid.');
    }
    entryDate = trimmedDate;
  }

  let mood: JournalMood | null = null;
  if (input.mood !== undefined && input.mood !== null) {
    if (!isValidJournalMood(input.mood)) {
      throw new Error(
        `Mood '${input.mood}' tidak valid. Pilihan: ${JOURNAL_MOODS.join(', ')}.`
      );
    }
    mood = input.mood;
  }

  const tags = sanitizeTags(input.tags);

  return {
    cleanTitle,
    cleanContent,
    entryDate,
    mood,
    tags,
    isDraft,
  };
}

/**
 * Validasi data input pembaruan jurnal.
 */
export function validateUpdateJournalInput(input: UpdateJournalInput): {
  cleanTitle?: string;
  cleanContent?: string;
  entryDate?: string;
  mood?: JournalMood | null;
  tags?: string[];
  isDraft?: boolean;
} {
  const result: ReturnType<typeof validateUpdateJournalInput> = {};

  if (input.title !== undefined) {
    const cleanTitle = input.title.trim();
    if (!cleanTitle || cleanTitle.length < 1) {
      throw new Error('Judul jurnal wajib diisi.');
    }
    if (cleanTitle.length > 200) {
      throw new Error('Judul jurnal maksimal 200 karakter.');
    }
    result.cleanTitle = cleanTitle;
  }

  if (input.content !== undefined) {
    if (input.content.length > 50000) {
      throw new Error('Konten jurnal maksimal 50.000 karakter.');
    }
    result.cleanContent = input.content;
  }

  if (input.entryDate !== undefined) {
    const trimmedDate = input.entryDate.trim();
    if (!isValidDateString(trimmedDate)) {
      throw new Error('Format tanggal jurnal harus YYYY-MM-DD yang valid.');
    }
    result.entryDate = trimmedDate;
  }

  if (input.mood !== undefined) {
    if (input.mood === null) {
      result.mood = null;
    } else if (isValidJournalMood(input.mood)) {
      result.mood = input.mood;
    } else {
      throw new Error(
        `Mood '${input.mood}' tidak valid. Pilihan: ${JOURNAL_MOODS.join(', ')}.`
      );
    }
  }

  if (input.tags !== undefined) {
    result.tags = sanitizeTags(input.tags);
  }

  if (input.isDraft !== undefined) {
    result.isDraft = Boolean(input.isDraft);
  }

  return result;
}

/**
 * Validasi resonance note untuk relasi jurnal-film (opsional, maks 500 karakter).
 */
export function validateResonanceNote(note?: string | null): string | null {
  if (note === undefined || note === null) return null;
  const trimmed = note.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.length > 500) {
    throw new Error('Resonance note maksimal 500 karakter.');
  }
  return trimmed;
}

/**
 * Validasi data input pembuatan catatan pribadi.
 */
export function validateCreateNoteInput(input: CreateNoteInput): {
  cleanTitle: string;
  cleanContent: string;
  tags: string[];
  isPinned: boolean;
} {
  const rawTitle = (input.title || '').trim();
  if (rawTitle.length > 200) {
    throw new Error('Judul catatan maksimal 200 karakter.');
  }

  const rawContent = (input.content || '').trim();
  if (!rawContent || rawContent.length < 1) {
    throw new Error('Konten catatan wajib diisi.');
  }
  if (input.content.length > 10000) {
    throw new Error('Konten catatan maksimal 10.000 karakter.');
  }

  const tags = sanitizeTags(input.tags);
  const isPinned = Boolean(input.isPinned);

  return {
    cleanTitle: rawTitle,
    cleanContent: input.content,
    tags,
    isPinned,
  };
}

/**
 * Validasi data input pembaruan catatan pribadi.
 */
export function validateUpdateNoteInput(input: UpdateNoteInput): {
  cleanTitle?: string;
  cleanContent?: string;
  tags?: string[];
  isPinned?: boolean;
} {
  const result: ReturnType<typeof validateUpdateNoteInput> = {};

  if (input.title !== undefined) {
    const rawTitle = input.title.trim();
    if (rawTitle.length > 200) {
      throw new Error('Judul catatan maksimal 200 karakter.');
    }
    result.cleanTitle = rawTitle;
  }

  if (input.content !== undefined) {
    const rawContent = input.content.trim();
    if (!rawContent || rawContent.length < 1) {
      throw new Error('Konten catatan wajib diisi.');
    }
    if (input.content.length > 10000) {
      throw new Error('Konten catatan maksimal 10.000 karakter.');
    }
    result.cleanContent = input.content;
  }

  if (input.tags !== undefined) {
    result.tags = sanitizeTags(input.tags);
  }

  if (input.isPinned !== undefined) {
    result.isPinned = Boolean(input.isPinned);
  }

  return result;
}

/**
 * Pemetaan error database Postgres / Supabase ke pesan ramah pengguna.
 * Mencegah kebocoran struktur internal atau credential ke client.
 */
export function mapJournalDbError(err: unknown, defaultMessage = 'Terjadi kesalahan pada database.'): string {
  if (!err) return defaultMessage;

  const errorObj = err as { code?: string; message?: string; details?: string };
  const message = errorObj.message || '';
  const code = errorObj.code || '';

  // Cross-ownership trigger error codes
  if (code === 'P0001' || message.includes('P0001') || message.includes('journal entry does not belong')) {
    return 'Entri jurnal tidak ditemukan atau bukan milik akun Anda.';
  }

  if (code === 'P0002' || message.includes('P0002') || message.includes('movie does not belong')) {
    return 'Film tidak ditemukan atau bukan milik akun Anda.';
  }

  // Unique constraint violation (duplicate relation)
  if (code === '23505' || message.includes('journal_movie_unique')) {
    return 'Film ini sudah ditautkan ke entri jurnal.';
  }

  // Check constraint on published content
  if (code === '23514' || message.includes('journal_entries_content_check')) {
    return 'Jurnal yang dipublikasikan wajib memiliki konten yang tidak kosong.';
  }

  // Foreign key cascade / missing reference
  if (code === '23503') {
    return 'Data referensi (film atau jurnal) tidak ditemukan.';
  }

  // RLS violation
  if (code === '42501' || message.includes('row-level security') || message.includes('RLS')) {
    return 'Akses ditolak oleh kebijakan keamanan data.';
  }

  if (err instanceof Error && err.message) {
    // Only return error message if it's already a safe user-facing message
    if (!err.message.includes('relation') && !err.message.includes('syntax') && !err.message.includes('schema')) {
      return err.message;
    }
  }

  return defaultMessage;
}
