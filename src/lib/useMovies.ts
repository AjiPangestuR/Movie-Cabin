'use client';

import { useSyncExternalStore } from 'react';
import { subscribeMovies, getMoviesSnapshot } from './movies';

export function useMovies() {
  const movies = useSyncExternalStore(
    subscribeMovies,
    getMoviesSnapshot,
    getMoviesSnapshot
  );

  return { movies, loading: false };
}
