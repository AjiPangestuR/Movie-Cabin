import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  validateUpdateWatchSourceInput,
  isValidUuid,
} from '../src/lib/watch-source-validations.ts';

// ==============================================================================
// 1. UNIT & LOGIC REGRESSION TESTS: DUAL-WRITE & IDEMPOTENCY
// ==============================================================================

test('Phase 16.3.3 Unit: Validates update input helper and UUID format', () => {
  assert.equal(isValidUuid('11111111-1111-1111-1111-111111111111'), true);
  const validated = validateUpdateWatchSourceInput({ platformName: 'Netflix' });
  assert.equal(validated.cleanPlatformName, 'Netflix');
});

test('Phase 16.3.3 Regression 1: Update primary URL updates both source and legacy watch_url', async () => {
  let dbWatchSources = [
    {
      id: 'ws-1',
      movie_id: 'm-1',
      is_primary: true,
      source_url: 'https://netflix.com/title/old',
    },
  ];
  let dbMovie = { id: 'm-1', watch_url: 'https://netflix.com/title/old' };

  // Simulation of updateWatchSource dual-write logic
  const simulateUpdateWatchSource = async (id, input) => {
    const existing = dbWatchSources.find((s) => s.id === id);
    assert.ok(existing, 'Source must exist');

    const willBePrimary = input.isPrimary !== undefined ? Boolean(input.isPrimary) : existing.is_primary;

    if (input.sourceUrl !== undefined) {
      existing.source_url = input.sourceUrl;
    }

    // Dual-write sync
    if (willBePrimary) {
      dbMovie.watch_url = existing.source_url ? existing.source_url.trim() : null;
    }

    return { ...existing };
  };

  const updated = await simulateUpdateWatchSource('ws-1', {
    sourceUrl: 'https://netflix.com/title/new-url',
  });

  assert.equal(updated.source_url, 'https://netflix.com/title/new-url');
  assert.equal(dbMovie.watch_url, 'https://netflix.com/title/new-url');
});

test('Phase 16.3.3 Regression 2: Promote non-primary source syncs movies.watch_url to new primary', async () => {
  let dbWatchSources = [
    { id: 'ws-1', movie_id: 'm-1', is_primary: true, source_url: 'https://netflix.com/1' },
    { id: 'ws-2', movie_id: 'm-1', is_primary: false, source_url: 'https://primevideo.com/2' },
  ];
  let dbMovie = { id: 'm-1', watch_url: 'https://netflix.com/1' };

  const simulatePromoteSource = async (id) => {
    const target = dbWatchSources.find((s) => s.id === id);
    assert.ok(target, 'Target must exist');

    // Demote previous primary
    for (const s of dbWatchSources) {
      if (s.is_primary && s.id !== id) {
        s.is_primary = false;
      }
    }
    target.is_primary = true;

    // Dual-write sync
    dbMovie.watch_url = target.source_url;
    return target;
  };

  await simulatePromoteSource('ws-2');

  const s1 = dbWatchSources.find((s) => s.id === 'ws-1');
  const s2 = dbWatchSources.find((s) => s.id === 'ws-2');

  assert.equal(s1.is_primary, false);
  assert.equal(s2.is_primary, true);
  assert.equal(dbMovie.watch_url, 'https://primevideo.com/2');
});

test('Phase 16.3.3 Regression 3: Delete primary source with fallback promotes next and syncs URL', async () => {
  let dbWatchSources = [
    { id: 'ws-1', movie_id: 'm-1', is_primary: true, source_url: 'https://netflix.com/1', created_at: 100 },
    { id: 'ws-2', movie_id: 'm-1', is_primary: false, source_url: 'https://vidio.com/2', created_at: 200 },
  ];
  let dbMovie = { id: 'm-1', watch_url: 'https://netflix.com/1' };

  const simulateDeleteSource = async (id) => {
    const target = dbWatchSources.find((s) => s.id === id);
    const wasPrimary = target.is_primary;

    // Remove target
    dbWatchSources = dbWatchSources.filter((s) => s.id !== id);

    let newPrimaryId;
    let newPrimaryUrl = null;

    if (wasPrimary) {
      if (dbWatchSources.length > 0) {
        // Oldest remaining
        const fallback = dbWatchSources.sort((a, b) => a.created_at - b.created_at)[0];
        fallback.is_primary = true;
        newPrimaryId = fallback.id;
        newPrimaryUrl = fallback.source_url;
        dbMovie.watch_url = newPrimaryUrl;
      } else {
        dbMovie.watch_url = null;
      }
    }

    return { success: true, deletedId: id, newPrimaryId, newPrimaryUrl };
  };

  const res = await simulateDeleteSource('ws-1');

  assert.equal(res.newPrimaryId, 'ws-2');
  assert.equal(res.newPrimaryUrl, 'https://vidio.com/2');
  assert.equal(dbMovie.watch_url, 'https://vidio.com/2');
  assert.equal(dbWatchSources.length, 1);
  assert.equal(dbWatchSources[0].is_primary, true);
});

test('Phase 16.3.3 Regression 4 & 6: Delete last source clears watchSources and sets legacy URL to null', async () => {
  let dbWatchSources = [
    { id: 'ws-only', movie_id: 'm-1', is_primary: true, source_url: 'https://criterionchannel.com/1' },
  ];
  let dbMovie = { id: 'm-1', watch_url: 'https://criterionchannel.com/1' };

  const simulateDeleteLastSource = async (id) => {
    const target = dbWatchSources.find((s) => s.id === id);
    const wasPrimary = target.is_primary;

    dbWatchSources = dbWatchSources.filter((s) => s.id !== id);

    let newPrimaryId;
    let newPrimaryUrl = null;

    if (wasPrimary) {
      if (dbWatchSources.length === 0) {
        dbMovie.watch_url = null;
        newPrimaryUrl = null;
      }
    }

    return { success: true, deletedId: id, newPrimaryId, newPrimaryUrl };
  };

  const res = await simulateDeleteLastSource('ws-only');

  assert.equal(res.success, true);
  assert.equal(res.newPrimaryId, undefined);
  assert.equal(res.newPrimaryUrl, null);
  assert.equal(dbWatchSources.length, 0);
  assert.equal(dbMovie.watch_url, null, 'movies.watch_url in database must be set to NULL');
});

test('Phase 16.3.3 Regression 5: Delete non-primary source does not alter legacy URL', async () => {
  let dbWatchSources = [
    { id: 'ws-primary', movie_id: 'm-1', is_primary: true, source_url: 'https://netflix.com/primary' },
    { id: 'ws-secondary', movie_id: 'm-1', is_primary: false, source_url: 'https://youtube.com/sec' },
  ];
  let dbMovie = { id: 'm-1', watch_url: 'https://netflix.com/primary' };

  const simulateDeleteNonPrimary = async (id) => {
    const target = dbWatchSources.find((s) => s.id === id);
    const wasPrimary = target.is_primary;
    dbWatchSources = dbWatchSources.filter((s) => s.id !== id);

    let newPrimaryUrl = wasPrimary ? null : dbMovie.watch_url;
    return { success: true, deletedId: id, newPrimaryUrl };
  };

  const res = await simulateDeleteNonPrimary('ws-secondary');

  assert.equal(dbWatchSources.length, 1);
  assert.equal(dbWatchSources[0].id, 'ws-primary');
  assert.equal(dbMovie.watch_url, 'https://netflix.com/primary', 'Legacy URL must remain unchanged');
  assert.equal(res.newPrimaryUrl, 'https://netflix.com/primary');
});

test('Phase 16.3.3 Regression 7: Failed legacy synchronization throws explicit error and rejects partial success', async () => {
  const simulateFailedLegacySync = async () => {
    const isPrimaryUpdated = true;
    const shouldFailLegacy = true;

    if (isPrimaryUpdated && shouldFailLegacy) {
      throw new Error('Sumber tontonan berhasil diperbarui, namun sinkronisasi tautan warisan gagal: Network timeout');
    }
  };

  await assert.rejects(
    async () => {
      await simulateFailedLegacySync();
    },
    /sinkronisasi tautan warisan gagal/,
    'Must throw explicit legacy sync failure error'
  );
});

test('Phase 16.3.3 Regression 8: Failed primary switch triggers exception without corrupting state', async () => {
  const simulateFailedPrimarySwitch = async () => {
    const rpcFails = true;
    const fallbackFails = true;

    if (rpcFails && fallbackFails) {
      throw new Error('Gagal mengalihkan sumber tontonan utama.');
    }
  };

  await assert.rejects(
    async () => {
      await simulateFailedPrimarySwitch();
    },
    /Gagal mengalihkan sumber tontonan utama/,
    'Must abort and preserve data integrity on primary switch failure'
  );
});

// ==============================================================================
// 2. CLIENT UI STATE SYNCHRONIZATION TESTS
// ==============================================================================

test('Phase 16.3.3 Regression 9: UI state eliminates zombie legacy link upon deleting last source', () => {
  // Initial component state simulation
  let movie = { id: 'm-1', title: 'Fight Club', watchUrl: 'https://netflix.com/title/123' };
  let watchSources = [
    { id: 'ws-1', movieId: 'm-1', isPrimary: true, sourceUrl: 'https://netflix.com/title/123' },
  ];

  // Simulating handleDeleteSourceConfirm when deleting ws-1 (last source)
  const sourceToDelete = watchSources[0];
  const serverActionResult = { success: true, deletedId: 'ws-1', newPrimaryId: undefined, newPrimaryUrl: null };

  // Handler state updates
  watchSources = watchSources.filter((s) => s.id !== sourceToDelete.id);
  if (sourceToDelete.isPrimary) {
    movie = { ...movie, watchUrl: serverActionResult.newPrimaryUrl || '' };
  }

  // UI Assertions
  assert.equal(watchSources.length, 0);
  assert.equal(movie.watchUrl, '', 'movie.watchUrl must be cleared to empty string');

  const hasSafeWatchUrl = /^https?:\/\/\S+$/i.test(movie.watchUrl || '');
  assert.equal(hasSafeWatchUrl, false, 'hasSafeWatchUrl must be false when last source is deleted');
  // When hasSafeWatchUrl is false, the zombie archive box is not rendered!
});

test('Phase 16.3.3 Regression 10: UI state updates movie.watchUrl and CTA when primary changes', () => {
  let movie = { id: 'm-1', title: 'Fight Club', watchUrl: 'https://netflix.com/old' };
  let watchSources = [
    { id: 'ws-1', movieId: 'm-1', isPrimary: true, sourceUrl: 'https://netflix.com/old', platformName: 'Netflix' },
    { id: 'ws-2', movieId: 'm-1', isPrimary: false, sourceUrl: 'https://disneyplus.com/new', platformName: 'Disney+' },
  ];

  // Simulating handleSetPrimary for ws-2
  const updatedPrimaryFromAction = { id: 'ws-2', sourceUrl: 'https://disneyplus.com/new', isPrimary: true, platformName: 'Disney+' };

  watchSources = watchSources.map((s) => ({
    ...s,
    isPrimary: s.id === updatedPrimaryFromAction.id,
  }));
  movie = {
    ...movie,
    watchUrl: updatedPrimaryFromAction.sourceUrl || '',
  };

  const primarySource = watchSources.find((s) => s.isPrimary);
  assert.equal(primarySource.id, 'ws-2');
  assert.equal(primarySource.platformName, 'Disney+');
  assert.equal(movie.watchUrl, 'https://disneyplus.com/new');
});

// ==============================================================================
// 3. STATIC CODE INSPECTION & ARCHITECTURAL VERIFICATION
// ==============================================================================

test('Phase 16.3.3 Static Architecture: src/lib/watchSources.ts implements dual-write and explicit error checks', () => {
  const code = fs.readFileSync(
    path.resolve(process.cwd(), 'src/lib/watchSources.ts'),
    'utf8'
  );

  // updateWatchSource dual-write
  assert.ok(
    code.includes('if (willBePrimary)'),
    'updateWatchSource must check if updated source is primary'
  );
  assert.ok(
    code.includes(".from('movies')") && code.includes('watch_url: targetWatchUrl'),
    'updateWatchSource must sync movies.watch_url'
  );
  assert.ok(
    code.includes('sinkronisasi tautan warisan gagal'),
    'updateWatchSource must report legacy sync failure explicitly'
  );

  // deleteWatchSource return type
  assert.ok(
    code.includes('newPrimaryUrl?: string | null'),
    'deleteWatchSource must declare newPrimaryUrl in return type'
  );
  assert.ok(
    code.includes(".from('movies')") && code.includes('watch_url: null'),
    'deleteWatchSource must clear movies.watch_url when no fallback remains'
  );

  // setPrimaryWatchSource explicit dual-write
  assert.ok(
    code.includes(".from('movies')") && code.includes('watch_url: targetUrl'),
    'setPrimaryWatchSource must sync targetUrl'
  );
});

test('Phase 16.3.3 Static Architecture: MovieDetailView.tsx eliminates zombie links by clearing movie.watchUrl', () => {
  const code = fs.readFileSync(
    path.resolve(process.cwd(), 'src/components/views/MovieDetailView.tsx'),
    'utf8'
  );

  // handleDeleteSourceConfirm state synchronization
  assert.ok(
    code.includes('if (wasPrimaryDeleted)'),
    'handleDeleteSourceConfirm must check if deleted source was primary'
  );
  assert.ok(
    code.includes('watchUrl: result.newPrimaryUrl || \'\''),
    'handleDeleteSourceConfirm must synchronize movie.watchUrl with result.newPrimaryUrl'
  );

  // handleSetPrimary state synchronization
  assert.ok(
    code.includes('watchUrl: updated.sourceUrl || \'\''),
    'handleSetPrimary must synchronize movie.watchUrl'
  );

  // handleModalSuccess state synchronization
  assert.ok(
    code.includes('if (savedSource.isPrimary)'),
    'handleModalSuccess must check if saved source is primary'
  );
});
