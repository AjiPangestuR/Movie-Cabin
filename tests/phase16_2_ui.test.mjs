import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  ACCESS_TYPES,
  ACCESS_TYPE_LABELS,
  getAccessTypeLabel,
} from '../src/types/watchSource.ts';

const detailViewPath = path.resolve(process.cwd(), 'src/components/views/MovieDetailView.tsx');
const modalPath = path.resolve(process.cwd(), 'src/components/WatchSourceModal.tsx');
const deleteDialogPath = path.resolve(process.cwd(), 'src/components/DeleteWatchSourceDialog.tsx');
const pagePath = path.resolve(process.cwd(), 'src/app/bank/[id]/page.tsx');

// ==============================================================================
// 1. MOVIE DETAIL INTEGRATION & MULTIPLE SOURCES RENDERING
// ==============================================================================

test('Phase 16.2 UI: ACCESS_TYPES and ACCESS_TYPE_LABELS provide Indonesian human-readable labels', () => {
  assert.equal(ACCESS_TYPES.length, 7);
  for (const type of ACCESS_TYPES) {
    assert.ok(ACCESS_TYPE_LABELS[type], `Label must exist for ${type}`);
    assert.equal(getAccessTypeLabel(type), ACCESS_TYPE_LABELS[type]);
  }
});

test('Phase 16.2 UI: MovieDetailView integrates Watch Sources state, imports, and server actions', () => {
  assert.ok(fs.existsSync(detailViewPath), 'MovieDetailView.tsx must exist');
  const content = fs.readFileSync(detailViewPath, 'utf8');

  // Imports
  assert.ok(content.includes("from '@/types'"), 'Must import types from @/types');
  assert.ok(content.includes('WatchSource'), 'Must import WatchSource type');
  assert.ok(content.includes('getAccessTypeLabel'), 'Must import getAccessTypeLabel helper');
  assert.ok(content.includes('deleteWatchSource'), 'Must import deleteWatchSource server action');
  assert.ok(content.includes('setPrimaryWatchSource'), 'Must import setPrimaryWatchSource server action');
  assert.ok(content.includes('WatchSourceModal'), 'Must import WatchSourceModal component');
  assert.ok(content.includes('DeleteWatchSourceDialog'), 'Must import DeleteWatchSourceDialog component');

  // Props & State
  assert.ok(content.includes('initialWatchSources'), 'Props must accept initialWatchSources');
  assert.ok(content.includes('useState<WatchSource[]>'), 'Must hold watchSources in React state');
  assert.ok(content.includes('isAddEditModalOpen'), 'Must hold modal open state');
  assert.ok(content.includes('editingSource'), 'Must hold editingSource state');
  assert.ok(content.includes('sourceToDelete'), 'Must hold sourceToDelete state');
  assert.ok(content.includes('isSettingPrimaryId'), 'Must hold primary switching loading state');
});

test('Phase 16.2 UI: Watch Sources Section renders cards, platform name, access type, and primary badge', () => {
  const content = fs.readFileSync(detailViewPath, 'utf8');

  // Section header
  assert.ok(content.includes('watch-sources-heading'), 'Must define accessible watch-sources-heading');
  assert.ok(content.includes('Sumber & Tautan Tontonan'), 'Must display section title');

  // Iterating multiple sources
  assert.ok(content.includes('watchSources.map((source)'), 'Must map over watchSources array');
  assert.ok(content.includes('source.platformName'), 'Must render platform name');
  assert.ok(content.includes('getAccessTypeLabel(source.accessType)'), 'Must render access type label');

  // Primary badge
  assert.ok(content.includes('source.isPrimary'), 'Must check source.isPrimary');
  assert.ok(content.includes('UTAMA'), 'Must display UTAMA badge for primary source');
});

test('Phase 16.2 UI: Empty state properly differentiates between legacy URL archive and complete absence of sources', () => {
  const content = fs.readFileSync(detailViewPath, 'utf8');

  // Empty state container
  assert.ok(content.includes('watchSources.length === 0'), 'Must check watchSources.length === 0');
  assert.ok(content.includes('Tautan Tontonan Warisan (Arsip)'), 'Must show legacy archive banner when legacy URL exists');
  assert.ok(content.includes('Belum ada sumber tontonan tercatat'), 'Must show informative empty state prompt when no sources exist');
  assert.ok(content.includes('+ Tambah Sumber Sekarang'), 'Empty state must offer direct Add Source button');
});

// ==============================================================================
// 2. ADD & EDIT WATCH SOURCE MODAL
// ==============================================================================

test('Phase 16.2 UI: WatchSourceModal provides required fields, preset buttons, and server action binding', () => {
  assert.ok(fs.existsSync(modalPath), 'WatchSourceModal.tsx must exist');
  const content = fs.readFileSync(modalPath, 'utf8');

  // Server actions
  assert.ok(content.includes('createWatchSource'), 'Must bind createWatchSource action');
  assert.ok(content.includes('updateWatchSource'), 'Must bind updateWatchSource action');

  // Required Fields
  assert.ok(content.includes('ws-platform'), 'Must provide platform name input');
  assert.ok(content.includes('ws-url'), 'Must provide source URL input');
  assert.ok(content.includes('ws-notes'), 'Must provide notes textarea');

  // Presets
  const presets = ['Netflix', 'Prime Video', 'Disney+', 'YouTube', 'Criterion Channel', 'Vidio', 'Bioskop Online', 'Koleksi Kaset VHS'];
  for (const preset of presets) {
    assert.ok(content.includes(preset), `Must provide preset for ${preset}`);
  }

  // Access type selection
  assert.ok(content.includes('ACCESS_TYPES.map'), 'Must render access type options');
  assert.ok(content.includes('ACCESS_TYPE_LABELS'), 'Must use ACCESS_TYPE_LABELS');

  // Primary source toggle
  assert.ok(content.includes('Jadikan Sumber Tontonan Utama'), 'Must provide primary source checkbox');

  // Edit vs Create mode differentiation
  assert.ok(content.includes('isEdit ?'), 'Must differentiate Edit vs Create mode');
  assert.ok(content.includes('Simpan Perubahan'), 'Must show Simpan Perubahan in edit mode');
  assert.ok(content.includes('Tambahkan Sumber'), 'Must show Tambahkan Sumber in add mode');
});

// ==============================================================================
// 3. DELETE CONFIRMATION DIALOG
// ==============================================================================

test('Phase 16.2 UI: DeleteWatchSourceDialog enforces confirmation and warns about primary fallback', () => {
  assert.ok(fs.existsSync(deleteDialogPath), 'DeleteWatchSourceDialog.tsx must exist');
  const content = fs.readFileSync(deleteDialogPath, 'utf8');

  assert.ok(content.includes('role="alertdialog"'), 'Must have role="alertdialog"');
  assert.ok(content.includes('Hapus Sumber Tontonan?'), 'Must have confirmation title');
  assert.ok(content.includes('source.isPrimary'), 'Must check if source is primary');
  assert.ok(content.includes('sumber utama'), 'Must warn about primary source reassignment');
  assert.ok(content.includes('Ya, Hapus Sumber'), 'Must have confirm delete button');
  assert.ok(content.includes('Batal'), 'Must have cancel button');
});

// ==============================================================================
// 4. PRIMARY SOURCE SWITCHING & SERVER ACTION INTEGRATION
// ==============================================================================

test('Phase 16.2 UI: Set Primary action uses setPrimaryWatchSource server action', () => {
  const content = fs.readFileSync(detailViewPath, 'utf8');

  assert.ok(content.includes('handleSetPrimary'), 'Must define handleSetPrimary handler');
  assert.ok(content.includes('await setPrimaryWatchSource(source.id)'), 'Must call setPrimaryWatchSource');
  assert.ok(content.includes('isPrimary: s.id === source.id'), 'Must update local state atomically');
});

test('Phase 16.2 UI: Delete action uses deleteWatchSource and promotes newPrimaryId from backend', () => {
  const content = fs.readFileSync(detailViewPath, 'utf8');

  assert.ok(content.includes('handleDeleteSourceConfirm'), 'Must define handleDeleteSourceConfirm handler');
  assert.ok(content.includes('await deleteWatchSource(sourceToDelete.id)'), 'Must call deleteWatchSource');
  assert.ok(content.includes('result.newPrimaryId'), 'Must inspect result.newPrimaryId');
  assert.ok(content.includes('s.id === result.newPrimaryId ? { ...s, isPrimary: true }'), 'Must promote newPrimaryId to primary');
});

// ==============================================================================
// 5. PRIMARY CTA LOGIC SIMULATION
// ==============================================================================

test('Phase 16.2 UI: Primary CTA logic correctly prioritizes primary URL, physical media, legacy URL, or Add Source', () => {
  function computePrimaryCtaState(primarySource, legacyWatchUrl) {
    const hasSafeLegacy = /^https?:\/\/\S+$/i.test(legacyWatchUrl || '');

    // Case 1: Primary source with URL
    if (primarySource && primarySource.sourceUrl) {
      return {
        type: 'open_url',
        url: primarySource.sourceUrl,
        label: `Tonton di ${primarySource.platformName}`,
      };
    }

    // Case 2: Primary source without URL (physical / cinema)
    if (primarySource && !primarySource.sourceUrl) {
      return {
        type: 'physical_info',
        label: `Tersedia: ${primarySource.platformName} (${getAccessTypeLabel(primarySource.accessType)})`,
      };
    }

    // Case 3: Fallback to legacy URL
    if (hasSafeLegacy) {
      return {
        type: 'legacy_fallback',
        url: legacyWatchUrl,
        label: 'Buka Tautan Nonton (Arsip)',
      };
    }

    // Case 4: No primary and no legacy URL -> Add Source button
    return {
      type: 'add_source',
      label: '+ Tambah Sumber Tontonan',
    };
  }

  // Case 1: Primary with URL
  const cta1 = computePrimaryCtaState(
    { platformName: 'Netflix', sourceUrl: 'https://netflix.com/title/1', isPrimary: true, accessType: 'subscription' },
    ''
  );
  assert.equal(cta1.type, 'open_url');
  assert.equal(cta1.url, 'https://netflix.com/title/1');
  assert.equal(cta1.label, 'Tonton di Netflix');

  // Case 2: Physical media primary without URL (never creates a fake link)
  const cta2 = computePrimaryCtaState(
    { platformName: 'Koleksi Kaset VHS', sourceUrl: null, isPrimary: true, accessType: 'physical' },
    ''
  );
  assert.equal(cta2.type, 'physical_info');
  assert.ok(!cta2.url, 'Must not have URL for physical media');
  assert.equal(cta2.label, 'Tersedia: Koleksi Kaset VHS (Fisik / VHS)');

  // Case 3: No watch sources, but legacy movie.watchUrl exists
  const cta3 = computePrimaryCtaState(null, 'https://primevideo.com/detail/1');
  assert.equal(cta3.type, 'legacy_fallback');
  assert.equal(cta3.url, 'https://primevideo.com/detail/1');
  assert.equal(cta3.label, 'Buka Tautan Nonton (Arsip)');

  // Case 4: Completely empty
  const cta4 = computePrimaryCtaState(null, '');
  assert.equal(cta4.type, 'add_source');
  assert.equal(cta4.label, '+ Tambah Sumber Tontonan');
});

// ==============================================================================
// 6. ACCESSIBILITY & MOBILE LAYOUT CONSTRAINTS
// ==============================================================================

test('Phase 16.2 UI: Touch targets and mobile ergonomics adhere to >= 44px standards', () => {
  const detailContent = fs.readFileSync(detailViewPath, 'utf8');
  const modalContent = fs.readFileSync(modalPath, 'utf8');
  const dialogContent = fs.readFileSync(deleteDialogPath, 'utf8');

  // Minimum 44px touch target on interactive elements
  assert.ok(detailContent.includes('min-h-[44px]'), 'MovieDetailView buttons must specify min-h-[44px]');
  assert.ok(modalContent.includes('min-h-[44px]'), 'Modal inputs and buttons must specify min-h-[44px]');
  assert.ok(dialogContent.includes('min-h-[44px]'), 'Dialog buttons must specify min-h-[44px]');

  // Modal scrolling & keyboard safety
  assert.ok(modalContent.includes('max-h-[92vh]'), 'Modal must have max-h-[92vh] to prevent virtual keyboard cutoff');
  assert.ok(modalContent.includes('overflow-y-auto'), 'Modal must be scrollable on mobile');

  // Dialog z-index above BottomNav
  assert.ok(dialogContent.includes('z-50'), 'Delete dialog must have z-50 to sit above mobile BottomNav');
  assert.ok(modalContent.includes('z-50'), 'Modal must have z-50 to sit above mobile BottomNav');
});

test('Phase 16.2 UI: App router bank page fetches and injects watch sources', () => {
  assert.ok(fs.existsSync(pagePath), 'app/bank/[id]/page.tsx must exist');
  const content = fs.readFileSync(pagePath, 'utf8');

  assert.ok(content.includes('listWatchSources'), 'Must import listWatchSources in server page');
  assert.ok(content.includes('initialWatchSources'), 'Must pass initialWatchSources prop to MovieDetailView');
});
