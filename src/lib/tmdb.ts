import type {
  TmdbMovieSearchResult,
  TmdbMovieDetail,
  TmdbSearchApiResponse,
} from '@/types/tmdb';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

/**
 * Mendapatkan token TMDB dari environment server secara aman
 */
export function getTmdbToken(): string | null {
  const token = process.env.TMDB_API_READ_ACCESS_TOKEN?.trim();
  return token && token.length > 0 ? token : null;
}

/**
 * Memeriksa apakah token TMDB telah dikonfigurasi pada environment server
 */
export function isTmdbConfigured(): boolean {
  return getTmdbToken() !== null;
}

/**
 * Membangun URL gambar poster lengkap dari path TMDB
 */
export function buildPosterUrl(
  path: string | null | undefined,
  size: 'w92' | 'w185' | 'w342' | 'w500' | 'original' = 'w500'
): string | null {
  if (!path || typeof path !== 'string' || path.trim().length === 0) {
    return null;
  }
  const cleanPath = path.trim().startsWith('/') ? path.trim() : `/${path.trim()}`;
  return `${TMDB_IMAGE_BASE_URL}/${size}${cleanPath}`;
}

/**
 * Mengekstrak tahun rilis dari string tanggal TMDB (format YYYY-MM-DD)
 */
export function parseReleaseYear(releaseDate: string | null | undefined): number | null {
  if (!releaseDate || typeof releaseDate !== 'string') {
    return null;
  }
  const match = releaseDate.trim().match(/^(\d{4})/);
  if (!match) return null;

  const year = parseInt(match[1], 10);
  if (isNaN(year) || year < 1870 || year > 2100) {
    return null;
  }
  return year;
}

/**
 * Melakukan normalisasi respons item film mentah dari TMDB ke tipe standar MOCAB
 */
export function normalizeTmdbMovie(raw: Record<string, unknown>): TmdbMovieSearchResult {
  const id = typeof raw.id === 'number' ? raw.id : 0;
  const title = typeof raw.title === 'string' ? raw.title : '';
  const originalTitle = typeof raw.original_title === 'string' ? raw.original_title : title;
  const releaseDate = typeof raw.release_date === 'string' ? raw.release_date : '';
  const overview = typeof raw.overview === 'string' ? raw.overview : '';
  const posterPath = typeof raw.poster_path === 'string' ? raw.poster_path : null;
  const backdropPath = typeof raw.backdrop_path === 'string' ? raw.backdrop_path : null;
  const originalLanguage = typeof raw.original_language === 'string' ? raw.original_language : 'en';
  const voteAverage = typeof raw.vote_average === 'number' ? Math.round(raw.vote_average * 10) / 10 : 0;

  return {
    tmdbId: id,
    title,
    originalTitle,
    releaseDate,
    releaseYear: parseReleaseYear(releaseDate),
    overview,
    posterPath,
    posterUrl: buildPosterUrl(posterPath, 'w500'),
    backdropPath,
    originalLanguage,
    voteAverage,
  };
}

/**
 * Melakukan normalisasi respons detail film dari TMDB
 */
export function normalizeTmdbDetail(raw: Record<string, unknown>): TmdbMovieDetail {
  const base = normalizeTmdbMovie(raw);
  const runtime = typeof raw.runtime === 'number' && raw.runtime > 0 ? raw.runtime : null;

  let genres: string[] = [];
  if (Array.isArray(raw.genres)) {
    genres = raw.genres
      .map((g: unknown) => (g && typeof g === 'object' && 'name' in g && typeof (g as { name: unknown }).name === 'string' ? (g as { name: string }).name : ''))
      .filter((name: string) => name.length > 0);
  }

  return {
    ...base,
    runtime,
    genres,
  };
}

/**
 * Mencari film ke API resmi TMDB
 */
export async function searchTmdbMovies(
  query: string,
  options: { page?: number; language?: string } = {}
): Promise<TmdbSearchApiResponse> {
  const cleanQuery = query.trim();
  if (!cleanQuery) {
    return {
      results: [],
      page: 1,
      totalPages: 0,
      totalResults: 0,
      source: 'tmdb',
    };
  }

  const token = getTmdbToken();
  if (!token) {
    return {
      results: [],
      page: 1,
      totalPages: 0,
      totalResults: 0,
      source: 'not_configured',
      message: 'Token akses TMDB belum dikonfigurasi pada server.',
    };
  }

  const page = options.page || 1;
  const language = options.language || 'id-ID';

  const params = new URLSearchParams({
    query: cleanQuery,
    page: String(page),
    language,
    include_adult: 'false',
  });

  const url = `${TMDB_BASE_URL}/search/movie?${params.toString()}`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(8000),
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'TimeoutError') {
      throw new Error('Koneksi ke TMDB melebihi batas waktu (timeout). Silakan coba lagi.');
    }
    throw new Error('Gagal terhubung ke layanan TMDB. Periksa koneksi internet server.');
  }

  if (res.status === 401) {
    throw new Error('Autentikasi TMDB ditolak. Periksa konfigurasi token server.');
  }

  if (res.status === 429) {
    throw new Error('Batas permintaan TMDB terlampaui (rate limit). Coba beberapa saat lagi.');
  }

  if (!res.ok) {
    throw new Error(`Layanan TMDB mengembalikan status ${res.status}.`);
  }

  const data = (await res.json()) as {
    results?: Array<Record<string, unknown>>;
    page?: number;
    total_pages?: number;
    total_results?: number;
  };

  const results = Array.isArray(data.results)
    ? data.results
        .filter((item) => item && typeof item === 'object' && item.title)
        .map(normalizeTmdbMovie)
    : [];

  return {
    results,
    page: data.page || page,
    totalPages: data.total_pages || 0,
    totalResults: data.total_results || results.length,
    source: 'tmdb',
  };
}

/**
 * Mengambil detail film (termasuk runtime dan genres) dari TMDB berdasarkan tmdbId
 */
export async function getTmdbMovieDetail(
  tmdbId: number,
  options: { language?: string } = {}
): Promise<TmdbMovieDetail> {
  if (!tmdbId || isNaN(tmdbId) || tmdbId <= 0) {
    throw new Error('ID film TMDB tidak valid.');
  }

  const token = getTmdbToken();
  if (!token) {
    throw new Error('Token akses TMDB belum dikonfigurasi pada server.');
  }

  const language = options.language || 'id-ID';
  const url = `${TMDB_BASE_URL}/movie/${tmdbId}?language=${encodeURIComponent(language)}`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(8000),
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'TimeoutError') {
      throw new Error('Koneksi detail TMDB melebihi batas waktu (timeout).');
    }
    throw new Error('Gagal mengambil detail film dari TMDB.');
  }

  if (res.status === 404) {
    throw new Error('Film tidak ditemukan di basis data TMDB.');
  }

  if (res.status === 401) {
    throw new Error('Autentikasi TMDB ditolak.');
  }

  if (!res.ok) {
    throw new Error(`Gagal mengambil detail film (Status ${res.status}).`);
  }

  const raw = (await res.json()) as Record<string, unknown>;
  return normalizeTmdbDetail(raw);
}
