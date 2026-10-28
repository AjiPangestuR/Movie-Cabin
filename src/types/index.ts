export interface WatchLog {
  rating: number; // 1-10
  contentPotential: number; // 1-10
  theme: string;
  scene: string;
  angle: string;
  notes: string;
}

export interface Movie {
  id: number;
  tmdbId: number | null;
  title: string;
  year: number | string;
  runtime: number | string;
  moods: string[];
  synopsis: string;
  watchUrl: string;
  done: boolean;
  log?: WatchLog;
}

export interface CatalogMovie {
  tmdb: number;
  title: string;
  year: number;
  runtime: number;
  syn: string;
}

export type StatusFilter = 'all' | 'no' | 'yes';
export type SortOption = 'new' | 'title' | 'pot';
