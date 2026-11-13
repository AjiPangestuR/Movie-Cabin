/**
 * MOCAB — Phase 16.1 Types for Watch Sources Management
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

export type AccessType = (typeof ACCESS_TYPES)[number];

export const ACCESS_TYPE_LABELS: Record<AccessType, string> = {
  subscription: 'Langganan',
  free: 'Gratis',
  rent: 'Sewa',
  buy: 'Beli',
  cinema: 'Bioskop',
  physical: 'Fisik / VHS',
  other: 'Lainnya',
};

export function getAccessTypeLabel(type: AccessType): string {
  return ACCESS_TYPE_LABELS[type] || 'Lainnya';
}

export interface WatchSource {
  id: string;
  movieId: string;
  userId: string;
  platformName: string;
  sourceUrl: string | null;
  accessType: AccessType;
  isPrimary: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWatchSourceInput {
  movieId: string;
  platformName: string;
  sourceUrl?: string | null;
  accessType: AccessType;
  isPrimary?: boolean;
  notes?: string | null;
}

export interface UpdateWatchSourceInput {
  platformName?: string;
  sourceUrl?: string | null;
  accessType?: AccessType;
  isPrimary?: boolean;
  notes?: string | null;
}

export type WatchSourceSyncStatus = 'synced' | 'failed' | 'none' | 'invalid_url';

export interface DetectedPlatform {
  platformName: string;
  accessType: AccessType;
}

