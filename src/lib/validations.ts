import type { WatchLog } from '@/types';

/**
 * Validasi apakah string adalah format UUID v4 yang valid.
 */
export function isValidUuid(id: string): boolean {
  if (!id || typeof id !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id.trim());
}

/**
 * Parsing dan sanitasi tahun rilis (1870-2100).
 */
export function parseYear(val: number | string | undefined | null): number | null {
  if (val === undefined || val === null || val === '') return null;
  const num = typeof val === 'number' ? val : parseInt(String(val).trim(), 10);
  return isNaN(num) ? null : num;
}

/**
 * Parsing dan sanitasi runtime film dalam menit (>0).
 */
export function parseRuntime(val: number | string | undefined | null): number | null {
  if (val === undefined || val === null || val === '') return null;
  const num = typeof val === 'number' ? val : parseInt(String(val).trim(), 10);
  return isNaN(num) || num <= 0 ? null : num;
}

/**
 * Validasi format tautan (wajib diawali http:// atau https://, max 2048 karakter).
 */
export function isValidWatchUrl(url?: string | null): boolean {
  if (!url) return true; // Opsional
  const trimmed = url.trim();
  if (trimmed.length === 0) return true;
  if (trimmed.length > 2048) return false;
  return /^https?:\/\/\S+$/i.test(trimmed);
}

/**
 * Validasi input form film baru sebelum dikirim ke database.
 */
export function validateMovieInput(input: {
  title: string;
  moods: string[];
  watchUrl?: string;
  year?: number | string;
  runtime?: number | string;
}): {
  cleanTitle: string;
  cleanUrl: string | null;
  yearNum: number | null;
  runtimeNum: number | null;
} {
  const cleanTitle = (input.title || '').trim();
  if (!cleanTitle || cleanTitle.length < 1) {
    throw new Error('Judul wajib diisi.');
  }

  if (cleanTitle.length > 200) {
    throw new Error('Judul maksimal 200 karakter.');
  }

  if (!input.moods || !Array.isArray(input.moods) || input.moods.length === 0) {
    throw new Error('Pilih minimal satu mood.');
  }

  const cleanUrl = (input.watchUrl || '').trim();
  if (cleanUrl && !isValidWatchUrl(cleanUrl)) {
    throw new Error('Tautan harus diawali http:// atau https://');
  }

  const yearNum = parseYear(input.year);
  if (yearNum !== null && (yearNum < 1870 || yearNum > 2100)) {
    throw new Error('Tahun rilis harus antara 1870 sampai 2100.');
  }

  const runtimeNum = parseRuntime(input.runtime);

  return {
    cleanTitle,
    cleanUrl: cleanUrl || null,
    yearNum,
    runtimeNum,
  };
}

/**
 * Validasi skor rating dan potensi konten (1-10).
 */
export function validateWatchLogInput(
  rating?: number | null,
  contentPotential?: number | null
): { validRating: number; validPotential: number } {
  if (
    rating === null ||
    rating === undefined ||
    contentPotential === null ||
    contentPotential === undefined
  ) {
    throw new Error('Isi rating dan potensi konten dulu.');
  }

  if (rating < 1 || rating > 10) {
    throw new Error('Rating harus antara 1 sampai 10.');
  }

  if (contentPotential < 1 || contentPotential > 10) {
    throw new Error('Potensi konten harus antara 1 sampai 10.');
  }

  return {
    validRating: rating,
    validPotential: contentPotential,
  };
}

/**
 * Validasi nama mood (1-24 karakter).
 */
export function validateMoodName(rawName: string): string {
  const name = (rawName || '').trim();
  if (!name || name.length < 1 || name.length > 24) {
    throw new Error('Nama mood harus antara 1 sampai 24 karakter.');
  }
  return name;
}

/**
 * Generate slug dari nama mood:
 * Lowercase, spasi jadi tanda hubung, karakter non-alfanumerik dibuang.
 * Bila kosong, gunakan fallback unik yang aman.
 */
export function generateMoodSlug(name: string): string {
  const clean = (name || '')
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
 * Ekstraksi nama mood dari relasi join Supabase.
 */
export function extractMoodNames(movieMoods: unknown): string[] {
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

/**
 * Ekstraksi objek WatchLog dari relasi join Supabase.
 */
export function extractWatchLog(watchLogs: unknown): WatchLog | undefined {
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
 * Pemetaan error database/RPC film ke pesan ramah bahasa Indonesia.
 */
export function mapMovieRpcError(error?: { code?: string; message?: string } | null): string {
  if (!error) return 'Gagal memproses film.';
  const msg = error.message || '';
  if (
    error.code === '23505' ||
    msg.toLowerCase().includes('unique') ||
    msg.toLowerCase().includes('duplicate')
  ) {
    return 'Film ini sudah ada di Kabin.';
  }
  if (msg.toLowerCase().includes('minimal satu mood')) {
    return 'Pilih minimal satu mood.';
  }
  return 'Gagal menyimpan film ke database.';
}

/**
 * Pemetaan error database/RPC mood kustom ke pesan ramah bahasa Indonesia.
 */
export function mapMoodRpcError(error?: { code?: string; message?: string } | null): string {
  if (!error) return 'Gagal memproses mood.';
  const msg = error.message || '';
  if (
    error.code === '23505' ||
    msg.toLowerCase().includes('unique') ||
    msg.toLowerCase().includes('duplicate')
  ) {
    return 'Mood dengan nama ini sudah ada.';
  }
  return 'Gagal menambahkan mood baru.';
}

/**
 * Pemetaan error database/RPC watch log ke pesan ramah bahasa Indonesia.
 */
export function mapWatchLogRpcError(error?: { code?: string; message?: string } | null): string {
  if (!error) return 'Gagal menyimpan catatan.';
  const msg = error.message || '';
  if (msg.includes('Rating') || msg.includes('Potensi')) {
    return 'Isi rating dan potensi konten dulu.';
  }
  return 'Gagal menyimpan catatan.';
}
