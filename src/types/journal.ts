/**
 * MOCAB — Phase 14 Types for Daily Journal, Movie Relations & Personal Notes
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

export interface JournalEntry {
  id: string;
  userId: string;
  title: string;
  content: string;
  entryDate: string; // YYYY-MM-DD
  mood: JournalMood | null;
  tags: string[];
  isDraft: boolean;
  createdAt: string;
  updatedAt: string;
  relatedMovies?: JournalMovieRelation[];
}

export interface JournalMovieRelation {
  id: string;
  userId: string;
  journalEntryId: string;
  movieId: string;
  resonanceNote: string | null;
  createdAt: string;
  movie?: {
    id: string;
    title: string;
    year: number | string;
    runtime: number | string;
    posterUrl: string | null;
    posterPath: string | null;
  };
}

export interface RelatedJournalSummary {
  id: string;
  title: string;
  entryDate: string;
  resonanceNote?: string | null;
}

export interface PersonalNote {
  id: string;
  userId: string;
  title: string;
  content: string;
  tags: string[];
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateJournalInput {
  title: string;
  content?: string;
  entryDate?: string;
  mood?: JournalMood | null;
  tags?: string[];
  isDraft?: boolean;
}

export interface UpdateJournalInput {
  title?: string;
  content?: string;
  entryDate?: string;
  mood?: JournalMood | null;
  tags?: string[];
  isDraft?: boolean;
}

export interface JournalListFilter {
  entryDate?: string;
  startDate?: string;
  endDate?: string;
  mood?: JournalMood;
  tag?: string;
  search?: string;
  isDraft?: boolean;
  page?: number;
  limit?: number;
}

export interface CreateNoteInput {
  title?: string;
  content: string;
  tags?: string[];
  isPinned?: boolean;
}

export interface UpdateNoteInput {
  title?: string;
  content?: string;
  tags?: string[];
  isPinned?: boolean;
}

export interface NoteListFilter {
  tag?: string;
  search?: string;
  isPinned?: boolean;
  page?: number;
  limit?: number;
}

export interface ActionResponse<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}
