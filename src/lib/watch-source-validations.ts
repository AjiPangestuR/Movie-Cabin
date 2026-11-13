import type {
  AccessType,
  CreateWatchSourceInput,
  UpdateWatchSourceInput,
  DetectedPlatform,
} from '@/types';

/**
 * 7 Tipe akses resmi untuk sumber tontonan film.
 */
export const ACCESS_TYPES = [
  'subscription',
  'free',
  'rent',
  'buy',
  'cinema',
  'physical',
  'other',
] as const;

/**
 * Validasi apakah string adalah format UUID v4 yang valid.
 */
export function isValidUuid(id: string): boolean {
  if (!id || typeof id !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id.trim());
}

/**
 * Validasi apakah nilai adalah tipe akses yang didukung.
 */
export function isValidAccessType(val: unknown): val is AccessType {
  if (typeof val !== 'string') return false;
  return (ACCESS_TYPES as readonly string[]).includes(val);
}

/**
 * Validasi nama platform (1-100 karakter non-whitespace).
 */
export function isValidPlatformName(name: unknown): boolean {
  if (typeof name !== 'string') return false;
  const trimmed = name.trim();
  return trimmed.length >= 1 && name.length <= 100;
}

/**
 * Validasi tautan tontonan (opsional/nullable).
 * Jika ada, wajib diawali http:// atau https:// dan maksimal 2048 karakter.
 */
export function isValidSourceUrl(url: unknown): boolean {
  if (url === null || url === undefined || url === '') return true;
  if (typeof url !== 'string') return false;

  const trimmed = url.trim();
  if (trimmed.length === 0) return true;
  if (trimmed.length > 2048) return false;

  // Cek protokol aman (hanya http:// atau https://)
  if (!/^https?:\/\/\S+$/i.test(trimmed)) {
    return false;
  }

  // Cek parsing URL valid
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Normalisasi URL: trim whitespace dan ubah string kosong menjadi null.
 */
export function normalizeSourceUrl(url?: string | null): string | null {
  if (url === null || url === undefined) return null;
  const trimmed = url.trim();
  return trimmed.length === 0 ? null : trimmed;
}

/**
 * Validasi catatan sumber tontonan (opsional, maks 500 karakter).
 */
export function isValidNotes(notes: unknown): boolean {
  if (notes === null || notes === undefined || notes === '') return true;
  if (typeof notes !== 'string') return false;
  return notes.length <= 500;
}

/**
 * Normalisasi catatan: trim whitespace dan ubah string kosong menjadi null.
 */
export function normalizeNotes(notes?: string | null): string | null {
  if (notes === null || notes === undefined) return null;
  const trimmed = notes.trim();
  return trimmed.length === 0 ? null : trimmed;
}

export interface ValidatedCreateWatchSource {
  movieId: string;
  cleanPlatformName: string;
  cleanSourceUrl: string | null;
  accessType: AccessType;
  isPrimary: boolean;
  cleanNotes: string | null;
}

/**
 * Memvalidasi input saat membuat sumber tontonan baru.
 */
export function validateCreateWatchSourceInput(
  input: CreateWatchSourceInput
): ValidatedCreateWatchSource {
  if (!input || typeof input !== 'object') {
    throw new Error('Data input sumber tontonan tidak valid.');
  }

  // 1. Movie ID
  if (!input.movieId || !isValidUuid(input.movieId)) {
    throw new Error('ID film tidak valid.');
  }

  // 2. Platform Name
  if (!isValidPlatformName(input.platformName)) {
    throw new Error('Nama platform tontonan wajib diisi (1-100 karakter).');
  }

  // 3. Source URL
  if (!isValidSourceUrl(input.sourceUrl)) {
    throw new Error('Tautan tontonan harus berupa URL HTTP/HTTPS yang valid (maksimal 2048 karakter).');
  }

  // 4. Access Type
  if (!isValidAccessType(input.accessType)) {
    throw new Error(
      `Tipe akses tidak valid. Pilihan yang didukung: ${ACCESS_TYPES.join(', ')}.`
    );
  }

  // 5. Notes
  if (!isValidNotes(input.notes)) {
    throw new Error('Catatan sumber tontonan tidak boleh melebihi 500 karakter.');
  }

  return {
    movieId: input.movieId.trim(),
    cleanPlatformName: input.platformName.trim(),
    cleanSourceUrl: normalizeSourceUrl(input.sourceUrl),
    accessType: input.accessType,
    isPrimary: Boolean(input.isPrimary),
    cleanNotes: normalizeNotes(input.notes),
  };
}

export interface ValidatedUpdateWatchSource {
  cleanPlatformName?: string;
  cleanSourceUrl?: string | null;
  accessType?: AccessType;
  isPrimary?: boolean;
  cleanNotes?: string | null;
}

/**
 * Memvalidasi input saat memutakhirkan sumber tontonan yang ada.
 */
export function validateUpdateWatchSourceInput(
  input: UpdateWatchSourceInput
): ValidatedUpdateWatchSource {
  if (!input || typeof input !== 'object') {
    throw new Error('Data pembaharuan sumber tontonan tidak valid.');
  }

  const validated: ValidatedUpdateWatchSource = {};
  let hasFields = false;

  if (input.platformName !== undefined) {
    if (!isValidPlatformName(input.platformName)) {
      throw new Error('Nama platform tontonan wajib diisi (1-100 karakter).');
    }
    validated.cleanPlatformName = input.platformName.trim();
    hasFields = true;
  }

  if (input.sourceUrl !== undefined) {
    if (!isValidSourceUrl(input.sourceUrl)) {
      throw new Error('Tautan tontonan harus berupa URL HTTP/HTTPS yang valid (maksimal 2048 karakter).');
    }
    validated.cleanSourceUrl = normalizeSourceUrl(input.sourceUrl);
    hasFields = true;
  }

  if (input.accessType !== undefined) {
    if (!isValidAccessType(input.accessType)) {
      throw new Error(
        `Tipe akses tidak valid. Pilihan yang didukung: ${ACCESS_TYPES.join(', ')}.`
      );
    }
    validated.accessType = input.accessType;
    hasFields = true;
  }

  if (input.isPrimary !== undefined) {
    validated.isPrimary = Boolean(input.isPrimary);
    hasFields = true;
  }

  if (input.notes !== undefined) {
    if (!isValidNotes(input.notes)) {
      throw new Error('Catatan sumber tontonan tidak boleh melebihi 500 karakter.');
    }
    validated.cleanNotes = normalizeNotes(input.notes);
    hasFields = true;
  }

  if (!hasFields) {
    throw new Error('Setidaknya harus ada satu bidang data yang diperbarui.');
  }

  return validated;
}

/**
 * Menerjemahkan Postgres/Supabase database errors menjadi pesan ramah pengguna.
 */
export function mapWatchSourceDbError(
  err: unknown,
  defaultMessage = 'Terjadi kesalahan pada database sumber tontonan.'
): string {
  if (!err) return defaultMessage;

  const errorObj = err as { code?: string; message?: string; details?: string };
  const message = errorObj.message || '';
  const code = errorObj.code || '';

  // Cross-ownership trigger error code (P0003)
  if (code === 'P0003' || message.includes('P0003') || message.includes('movie does not exist or does not belong')) {
    return 'Film tidak ditemukan atau bukan milik akun Anda.';
  }

  // Not found error code (P0004)
  if (code === 'P0004' || message.includes('P0004') || message.includes('Watch source not found')) {
    return 'Sumber tontonan tidak ditemukan.';
  }

  // Unique constraint violation (partial unique index on is_primary = true)
  if (code === '23505' || message.includes('movie_watch_sources_primary_unique')) {
    return 'Film ini sudah memiliki tautan tontonan utama. Silakan ganti atau nonaktifkan status utama sumber lainnya terlebih dahulu.';
  }

  // Check constraint violations
  if (code === '23514') {
    if (message.includes('platform_name')) {
      return 'Nama platform wajib diisi antara 1 hingga 100 karakter.';
    }
    if (message.includes('source_url')) {
      return 'Tautan tontonan harus berupa URL HTTP/HTTPS yang valid (maksimal 2048 karakter).';
    }
    if (message.includes('access_type')) {
      return 'Tipe akses tidak valid.';
    }
    if (message.includes('notes')) {
      return 'Catatan tidak boleh melebihi 500 karakter.';
    }
    return 'Data yang dimasukkan melanggar batasan format sistem.';
  }

  // Foreign key cascade / missing reference
  if (code === '23503') {
    return 'Film referensi tidak ditemukan.';
  }

  // RLS violation
  if (code === '42501' || message.includes('row-level security') || message.includes('RLS') || message.includes('Unauthorized')) {
    return 'Akses ditolak oleh kebijakan keamanan data.';
  }

  if (err instanceof Error && err.message) {
    if (!err.message.includes('relation') && !err.message.includes('syntax') && !err.message.includes('schema')) {
      return err.message;
    }
  }

  return defaultMessage;
}

/**
 * Heuristik deteksi platform dan tipe akses otomatis dari URL tontonan.
 * Digunakan untuk alur sinkronisasi Add Movie dan penentuan preset cepat.
 */
export function detectPlatformFromUrl(url?: string | null): DetectedPlatform {
  if (!url || typeof url !== 'string') {
    return {
      platformName: 'Tautan Tontonan',
      accessType: 'other',
    };
  }

  const trimmed = url.trim();
  if (trimmed.length === 0) {
    return {
      platformName: 'Tautan Tontonan',
      accessType: 'other',
    };
  }

  // Parse hostname dan pathname secara aman
  let hostname = '';
  let pathname = '';
  try {
    const parseTarget =
      trimmed.startsWith('http://') || trimmed.startsWith('https://')
        ? trimmed
        : `https://${trimmed}`;
    const parsed = new URL(parseTarget);
    hostname = parsed.hostname.toLowerCase();
    pathname = parsed.pathname.toLowerCase();
  } catch {
    return {
      platformName: 'Tautan Tontonan',
      accessType: 'other',
    };
  }

  if (!hostname || !hostname.includes('.')) {
    return {
      platformName: 'Tautan Tontonan',
      accessType: 'other',
    };
  }

  // 1. Netflix
  if (hostname === 'netflix.com' || hostname.endsWith('.netflix.com')) {
    return { platformName: 'Netflix', accessType: 'subscription' };
  }

  // 2. Prime Video / Amazon
  if (
    hostname === 'primevideo.com' ||
    hostname.endsWith('.primevideo.com') ||
    hostname === 'amazon.com' ||
    hostname.endsWith('.amazon.com') ||
    hostname === 'amazon.co.jp' ||
    hostname.endsWith('.amazon.co.jp') ||
    hostname === 'amazon.co.uk' ||
    hostname.endsWith('.amazon.co.uk')
  ) {
    return { platformName: 'Prime Video', accessType: 'subscription' };
  }

  // 3. Disney+ / Hotstar
  if (
    hostname === 'disneyplus.com' ||
    hostname.endsWith('.disneyplus.com') ||
    hostname === 'hotstar.com' ||
    hostname.endsWith('.hotstar.com')
  ) {
    return { platformName: 'Disney+', accessType: 'subscription' };
  }

  // 4. Apple TV+
  if (
    hostname === 'tv.apple.com' ||
    hostname.endsWith('.apple.com/tv') ||
    (hostname.includes('apple.com') && (pathname.startsWith('/tv') || pathname.startsWith('/tv-pr')))
  ) {
    return { platformName: 'Apple TV+', accessType: 'subscription' };
  }

  // 5. Vidio
  if (hostname === 'vidio.com' || hostname.endsWith('.vidio.com')) {
    return { platformName: 'Vidio', accessType: 'subscription' };
  }

  // 6. Bioskop Online
  if (hostname === 'bioskoponline.com' || hostname.endsWith('.bioskoponline.com')) {
    return { platformName: 'Bioskop Online', accessType: 'rent' };
  }

  // 7. YouTube
  if (
    hostname === 'youtube.com' ||
    hostname.endsWith('.youtube.com') ||
    hostname === 'youtu.be'
  ) {
    return { platformName: 'YouTube', accessType: 'free' };
  }

  // 8. Criterion Channel
  if (hostname === 'criterionchannel.com' || hostname.endsWith('.criterionchannel.com')) {
    return { platformName: 'Criterion Channel', accessType: 'subscription' };
  }

  // 9. MUBI
  if (hostname === 'mubi.com' || hostname.endsWith('.mubi.com')) {
    return { platformName: 'MUBI', accessType: 'subscription' };
  }

  // 10. Catchplay+
  if (hostname === 'catchplay.com' || hostname.endsWith('.catchplay.com')) {
    return { platformName: 'Catchplay+', accessType: 'subscription' };
  }

  // 11. WeTV
  if (hostname === 'wetv.vip' || hostname.endsWith('.wetv.vip')) {
    return { platformName: 'WeTV', accessType: 'subscription' };
  }

  // 12. iQIYI
  if (
    hostname === 'iq.com' ||
    hostname.endsWith('.iq.com') ||
    hostname === 'iqiyi.com' ||
    hostname.endsWith('.iqiyi.com')
  ) {
    return { platformName: 'iQIYI', accessType: 'subscription' };
  }

  // 13. HBO Max / Go
  if (
    hostname === 'max.com' ||
    hostname.endsWith('.max.com') ||
    hostname === 'hbomax.com' ||
    hostname.endsWith('.hbomax.com') ||
    hostname.includes('hbogoasia')
  ) {
    return { platformName: 'HBO Max / Go', accessType: 'subscription' };
  }

  // 14. KlikFilm
  if (hostname === 'klikfilm.com' || hostname.endsWith('.klikfilm.com')) {
    return { platformName: 'KlikFilm', accessType: 'rent' };
  }

  // 15. Viki
  if (hostname === 'viki.com' || hostname.endsWith('.viki.com')) {
    return { platformName: 'Viki', accessType: 'subscription' };
  }

  // Platform lain: Bersihkan hostname (misal www.archive.org -> archive.org)
  const cleanHost = hostname.replace(/^www\./, '');
  return {
    platformName: cleanHost || 'Tautan Tontonan',
    accessType: 'other',
  };
}
