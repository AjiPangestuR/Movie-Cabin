export interface TmdbMovieSearchResult {
  tmdbId: number;
  title: string;
  originalTitle: string;
  releaseDate: string;
  releaseYear: number | null;
  overview: string;
  posterPath: string | null;
  posterUrl: string | null;
  backdropPath: string | null;
  originalLanguage: string;
  voteAverage: number;
}

export interface TmdbMovieDetail {
  tmdbId: number;
  title: string;
  originalTitle: string;
  releaseDate: string;
  releaseYear: number | null;
  runtime: number | null;
  overview: string;
  posterPath: string | null;
  posterUrl: string | null;
  genres: string[];
}

export interface TmdbSearchApiResponse {
  results: TmdbMovieSearchResult[];
  page: number;
  totalPages: number;
  totalResults: number;
  source: 'tmdb' | 'mock' | 'not_configured';
  message?: string;
}

export interface TmdbErrorResponse {
  error: string;
  message: string;
  configured: boolean;
}
