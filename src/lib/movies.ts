import { Movie, WatchLog } from '@/types';
import { INITIAL_MOVIES } from './mock-data';

// In-memory store for Phase 1 session
let moviesStore: Movie[] = INITIAL_MOVIES.map((m) => ({
  ...m,
  moods: [...m.moods],
  log: m.log ? { ...m.log } : undefined,
}));

// Listener subscription mechanism for reactive UI updates across client components
type Listener = () => void;
const listeners = new Set<Listener>();

function notifyListeners(): void {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (e) {
      console.error('Error in movie store listener:', e);
    }
  });
}

export function subscribeMovies(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Mendapatkan daftar seluruh film di kabin (in-memory)
 */
export async function listMovies(): Promise<Movie[]> {
  // Return shallow copy array with clone to prevent direct outside mutations
  return moviesStore.map((m) => ({
    ...m,
    moods: [...m.moods],
    log: m.log ? { ...m.log } : undefined,
  }));
}

/**
 * Mendapatkan satu film berdasarkan ID
 */
export async function getMovie(id: number): Promise<Movie | undefined> {
  const found = moviesStore.find((m) => m.id === id);
  if (!found) return undefined;
  return {
    ...found,
    moods: [...found.moods],
    log: found.log ? { ...found.log } : undefined,
  };
}

export interface AddMovieInput {
  tmdbId?: number | null;
  title: string;
  year: number | string;
  runtime: number | string;
  moods: string[];
  synopsis: string;
  watchUrl?: string;
}

/**
 * Menambahkan film baru ke Kabin setelah validasi duplikat
 */
export async function addMovie(input: AddMovieInput): Promise<Movie> {
  const trimmedTitle = input.title.trim();
  if (!trimmedTitle) {
    throw new Error('Judul wajib diisi.');
  }

  if (!input.moods || input.moods.length === 0) {
    throw new Error('Pilih minimal satu mood.');
  }

  const cleanUrl = (input.watchUrl || '').trim();
  if (cleanUrl && !/^https?:\/\/\S+$/i.test(cleanUrl)) {
    throw new Error('Tautan harus diawali http:// atau https://');
  }

  const isDuplicate = moviesStore.some((x) => {
    if (input.tmdbId && x.tmdbId === input.tmdbId) return true;
    return (
      x.title.toLowerCase() === trimmedTitle.toLowerCase() &&
      String(x.year) === String(input.year)
    );
  });

  if (isDuplicate) {
    throw new Error('Film ini sudah ada di Kabin.');
  }

  const newMovie: Movie = {
    id: Date.now(),
    tmdbId: input.tmdbId ?? null,
    title: trimmedTitle,
    year: input.year || '?',
    runtime: input.runtime || '?',
    moods: [...input.moods],
    synopsis: input.synopsis || '',
    watchUrl: cleanUrl,
    done: false,
  };

  moviesStore.unshift(newMovie);
  notifyListeners();
  return { ...newMovie };
}

/**
 * Mengubah mood film di detail layar (minimal 1 mood)
 */
export async function updateMovieMoods(id: number, moods: string[]): Promise<Movie> {
  if (!moods || moods.length === 0) {
    throw new Error('Minimal satu mood.');
  }

  const movie = moviesStore.find((m) => m.id === id);
  if (!movie) {
    throw new Error('Film tidak ditemukan.');
  }

  movie.moods = [...moods];
  notifyListeners();
  return {
    ...movie,
    moods: [...movie.moods],
    log: movie.log ? { ...movie.log } : undefined,
  };
}

/**
 * Menyimpan catatan after-watch dan menandai status film menjadi selesai ditonton
 */
export async function saveLog(id: number, logData: WatchLog): Promise<Movie> {
  if (!logData.rating || !logData.contentPotential) {
    throw new Error('Isi rating dan potensi konten dulu.');
  }

  const movie = moviesStore.find((m) => m.id === id);
  if (!movie) {
    throw new Error('Film tidak ditemukan.');
  }

  movie.done = true;
  movie.log = {
    rating: logData.rating,
    contentPotential: logData.contentPotential,
    theme: logData.theme.trim(),
    scene: logData.scene.trim(),
    angle: logData.angle.trim(),
    notes: logData.notes.trim(),
  };

  notifyListeners();
  return {
    ...movie,
    moods: [...movie.moods],
    log: { ...movie.log },
  };
}

/**
 * Menghapus film dan seluruh catatannya dari Kabin
 */
export async function deleteMovie(id: number): Promise<boolean> {
  const initialLength = moviesStore.length;
  moviesStore = moviesStore.filter((m) => m.id !== id);
  const deleted = moviesStore.length < initialLength;
  if (deleted) {
    notifyListeners();
  }
  return deleted;
}

/**
 * Reset data kembali ke data contoh (untuk keperluan testing / restart)
 */
export function resetMoviesStore(): void {
  moviesStore = INITIAL_MOVIES.map((m) => ({
    ...m,
    moods: [...m.moods],
    log: m.log ? { ...m.log } : undefined,
  }));
  notifyListeners();
}
