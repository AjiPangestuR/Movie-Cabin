import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  ACCESS_TYPES,
  isValidAccessType,
  isValidPlatformName,
  isValidSourceUrl,
  normalizeSourceUrl,
  isValidNotes,
  normalizeNotes,
  validateCreateWatchSourceInput,
  validateUpdateWatchSourceInput,
  mapWatchSourceDbError,
  isValidUuid,
} from '../src/lib/watch-source-validations.ts';

const migrationPath = path.resolve(
  process.cwd(),
  'supabase/migrations/20261114000000_phase16_watch_sources.sql'
);

// ==============================================================================
// 1. MIGRATION DDL & SQL SCHEMA AUDIT TESTS
// ==============================================================================

test('Phase 16.1 SQL Migration: Migration file exists and defines movie_watch_sources schema', () => {
  assert.ok(fs.existsSync(migrationPath), 'Migration file must exist');
  const sql = fs.readFileSync(migrationPath, 'utf8');

  assert.ok(sql.includes('create table if not exists public.movie_watch_sources'), 'Must create table public.movie_watch_sources');
  assert.ok(sql.includes('movie_id uuid not null references public.movies(id) on delete cascade'), 'movie_id must reference public.movies on delete cascade');
  assert.ok(sql.includes('user_id uuid not null references auth.users(id) on delete cascade'), 'user_id must reference auth.users on delete cascade');
  assert.ok(sql.includes('platform_name text not null'), 'platform_name must be not null text');
  assert.ok(sql.includes('source_url text null'), 'source_url must be nullable text');
  assert.ok(sql.includes('access_type text not null'), 'access_type must be not null text');
  assert.ok(sql.includes('is_primary boolean not null default false'), 'is_primary must default to false');
  assert.ok(sql.includes('notes text null'), 'notes must be nullable text');
});

test('Phase 16.1 SQL Constraints: platform_name, source_url, access_type, and notes constraints', () => {
  const sql = fs.readFileSync(migrationPath, 'utf8');

  // platform_name constraint: 1-100 characters non-empty
  assert.ok(sql.includes('char_length(trim(platform_name)) >= 1'), 'platform_name must check >= 1 char trimmed');
  assert.ok(sql.includes('char_length(platform_name) <= 100'), 'platform_name must check <= 100 chars');

  // source_url constraint: null or (<= 2048 chars and http/https)
  assert.ok(sql.includes('char_length(source_url) <= 2048'), 'source_url must check max 2048 chars');
  assert.ok(sql.includes("source_url ~* '^https?://\\S+$'"), 'source_url must enforce HTTP/HTTPS regex');

  // access_type enum check
  const requiredAccessTypes = [
    'subscription',
    'free',
    'rent',
    'buy',
    'cinema',
    'physical',
    'other',
  ];
  for (const type of requiredAccessTypes) {
    assert.ok(sql.includes(`'${type}'`), `access_type check must include '${type}'`);
  }

  // notes constraint: null or <= 500 chars
  assert.ok(sql.includes('char_length(notes) <= 500'), 'notes must be capped at 500 chars');
});

test('Phase 16.1 SQL Indexes: Indexes and Partial Unique Index for Primary Source', () => {
  const sql = fs.readFileSync(migrationPath, 'utf8');

  // Standard indexes
  assert.ok(sql.includes('movie_watch_sources_movie_id_idx'), 'Must create index on movie_id');
  assert.ok(sql.includes('movie_watch_sources_user_id_idx'), 'Must create index on user_id');

  // Partial unique index for primary source
  assert.ok(
    sql.includes('create unique index if not exists movie_watch_sources_primary_unique'),
    'Must define partial unique index for primary watch source'
  );
  assert.ok(
    sql.includes('where (is_primary = true)'),
    'Partial index must be constrained to where (is_primary = true)'
  );
});

test('Phase 16.1 SQL Triggers: updated_at trigger and Cross-Ownership trigger with P0003', () => {
  const sql = fs.readFileSync(migrationPath, 'utf8');

  // updated_at trigger
  assert.ok(sql.includes('set_movie_watch_sources_updated_at'), 'Must attach updated_at trigger');
  assert.ok(sql.includes('public.handle_updated_at()'), 'Must use public.handle_updated_at()');

  // Cross-ownership trigger
  assert.ok(sql.includes('validate_movie_watch_source_ownership()'), 'Must define cross-ownership trigger function');
  assert.ok(sql.includes('where m.id = new.movie_id and m.user_id = new.user_id'), 'Trigger must verify movie belongs to new.user_id');
  assert.ok(sql.includes("'P0003'"), 'Must raise error code P0003 on cross-ownership violation');
  assert.ok(sql.includes('check_movie_watch_source_ownership'), 'Must attach check_movie_watch_source_ownership trigger');
});

test('Phase 16.1 SQL Atomic Function: set_primary_watch_source RPC', () => {
  const sql = fs.readFileSync(migrationPath, 'utf8');

  assert.ok(sql.includes('function public.set_primary_watch_source(p_source_id uuid)'), 'Must define set_primary_watch_source function');
  assert.ok(sql.includes('security definer'), 'Function must be security definer');
  assert.ok(sql.includes('v_target.user_id <> auth.uid()'), 'Function must verify user owns the source');
  assert.ok(sql.includes('set is_primary = false'), 'Function must demote previous primary');
  assert.ok(sql.includes('set is_primary = true'), 'Function must promote target to primary');
  assert.ok(sql.includes('grant execute on function public.set_primary_watch_source(uuid) to authenticated'), 'Must grant execute to authenticated');
});

test('Phase 16.1 SQL Security & RLS: RLS enabled, granular policies, and anon privilege revocation', () => {
  const sql = fs.readFileSync(migrationPath, 'utf8');

  assert.ok(sql.includes('alter table public.movie_watch_sources enable row level security;'), 'RLS must be enabled');
  assert.ok(sql.includes('"Users can select own watch sources"'), 'Must define SELECT policy');
  assert.ok(sql.includes('"Users can insert own watch sources"'), 'Must define INSERT policy');
  assert.ok(sql.includes('"Users can update own watch sources"'), 'Must define UPDATE policy');
  assert.ok(sql.includes('"Users can delete own watch sources"'), 'Must define DELETE policy');

  // INSERT & UPDATE must check movie ownership
  assert.ok(
    sql.includes('where m.id = movie_watch_sources.movie_id') && sql.includes('m.user_id = auth.uid()'),
    'INSERT and UPDATE policies must enforce movie ownership against auth.uid()'
  );

  // Revoke from anon, grant to authenticated
  assert.ok(sql.includes('revoke all on public.movie_watch_sources from anon, public;'), 'Must revoke privileges from anon and public');
  assert.ok(sql.includes('grant select, insert, update, delete on public.movie_watch_sources to authenticated;'), 'Must grant CRUD to authenticated');
});

test('Phase 16.1 SQL Backfill: Idempotent legacy migration preserving movies.watch_url', () => {
  const sql = fs.readFileSync(migrationPath, 'utf8');

  // Insert from movies
  assert.ok(sql.includes('insert into public.movie_watch_sources'), 'Backfill must insert into movie_watch_sources');
  assert.ok(sql.includes('from public.movies m'), 'Backfill must select from public.movies');

  // Non-empty URL check
  assert.ok(sql.includes('m.watch_url is not null'), 'Must filter null watch_url');
  assert.ok(sql.includes("trim(m.watch_url) <> ''"), 'Must filter empty watch_url');
  assert.ok(sql.includes("m.watch_url ~* '^https?://\\S+$'"), 'Must filter invalid URL formats');

  // Idempotency: not exists check
  assert.ok(
    sql.includes('not exists (') && sql.includes('select 1 from public.movie_watch_sources ws') && sql.includes('ws.movie_id = m.id'),
    'Backfill MUST use NOT EXISTS to guarantee idempotency across multiple runs'
  );

  // Fallback platform and access type
  assert.ok(sql.includes("'Tautan Tontonan'"), 'Must default platform_name to Tautan Tontonan when unrecognized');
  assert.ok(
    /else\s+'other'\s+end\s+as\s+access_type/i.test(sql) || sql.includes("else 'other'"),
    'Must default access_type to other when unrecognized'
  );
  assert.ok(sql.includes('true as is_primary'), 'Backfilled legacy watch sources must be marked primary');

  // Ensure movies.watch_url is NOT dropped or cleared
  assert.ok(!sql.toLowerCase().includes('drop column watch_url'), 'Must NEVER drop watch_url column');
  assert.ok(!sql.toLowerCase().includes('set watch_url = null'), 'Must NEVER nullify movies.watch_url in migration');
});

// ==============================================================================
// 2. UNIT TESTS: VALIDATION & INPUT SANITIZATION
// ==============================================================================

test('Unit: isValidUuid validates UUID v4 formats in watch source validations', () => {
  assert.equal(isValidUuid('11111111-1111-4111-8111-111111111111'), true);
  assert.equal(isValidUuid('not-a-uuid'), false);
  assert.equal(isValidUuid(''), false);
  assert.equal(isValidUuid(null), false);
  assert.equal(isValidUuid(undefined), false);
});

test('Unit: isValidAccessType validates the 7 official access types', () => {
  const expected = ['subscription', 'free', 'rent', 'buy', 'cinema', 'physical', 'other'];

  assert.equal(ACCESS_TYPES.length, 7);
  for (const type of expected) {
    assert.equal(isValidAccessType(type), true, `AccessType '${type}' must be valid`);
  }

  // Invalid types
  assert.equal(isValidAccessType(''), false);
  assert.equal(isValidAccessType('pirate'), false);
  assert.equal(isValidAccessType('torrent'), false);
  assert.equal(isValidAccessType('stream'), false);
  assert.equal(isValidAccessType(null), false);
  assert.equal(isValidAccessType(undefined), false);
  assert.equal(isValidAccessType(123), false);
});

test('Unit: isValidPlatformName enforces 1–100 characters non-whitespace', () => {
  assert.equal(isValidPlatformName('Netflix'), true);
  assert.equal(isValidPlatformName('Criterion Channel'), true);
  assert.equal(isValidPlatformName('A'), true); // 1 char
  assert.equal(isValidPlatformName('a'.repeat(100)), true); // 100 chars

  // Invalid names
  assert.equal(isValidPlatformName(''), false);
  assert.equal(isValidPlatformName('   '), false);
  assert.equal(isValidPlatformName('a'.repeat(101)), false); // 101 chars
  assert.equal(isValidPlatformName(null), false);
  assert.equal(isValidPlatformName(undefined), false);
  assert.equal(isValidPlatformName(42), false);
});

test('Unit: isValidSourceUrl accepts valid HTTP/HTTPS and rejects insecure/malformed schemes', () => {
  // Valid URLs
  assert.equal(isValidSourceUrl('https://www.netflix.com/title/12345'), true);
  assert.equal(isValidSourceUrl('http://criterionchannel.com/watch'), true);
  assert.equal(isValidSourceUrl('https://youtu.be/dQw4w9WgXcQ'), true);
  assert.equal(isValidSourceUrl('https://subdomain.domain.co.id/path?query=1&b=2#frag'), true);

  // Nullable / Empty (allowed for physical media or cinema tickets)
  assert.equal(isValidSourceUrl(null), true);
  assert.equal(isValidSourceUrl(undefined), true);
  assert.equal(isValidSourceUrl(''), true);
  assert.equal(isValidSourceUrl('   '), true);

  // Invalid schemes
  assert.equal(isValidSourceUrl('javascript:alert(1)'), false);
  assert.equal(isValidSourceUrl('data:text/html,<script>alert(1)</script>'), false);
  assert.equal(isValidSourceUrl('ftp://ftp.example.com/movie.mp4'), false);
  assert.equal(isValidSourceUrl('file:///C:/movies/video.mkv'), false);

  // Malformed URLs
  assert.equal(isValidSourceUrl('not-a-valid-url'), false);
  assert.equal(isValidSourceUrl('httpp://misspelled.com'), false);
  assert.equal(isValidSourceUrl('https://' + 'a'.repeat(2045)), false); // >2048 chars
});

test('Unit: normalizeSourceUrl and normalizeNotes handle trimming and nulls cleanly', () => {
  assert.equal(normalizeSourceUrl('  https://netflix.com  '), 'https://netflix.com');
  assert.equal(normalizeSourceUrl(''), null);
  assert.equal(normalizeSourceUrl('   '), null);
  assert.equal(normalizeSourceUrl(null), null);
  assert.equal(normalizeSourceUrl(undefined), null);

  assert.equal(normalizeNotes('  Catatan khusus rilisan kaset VHS  '), 'Catatan khusus rilisan kaset VHS');
  assert.equal(normalizeNotes(''), null);
  assert.equal(normalizeNotes('   '), null);
  assert.equal(normalizeNotes(null), null);
  assert.equal(normalizeNotes(undefined), null);
});

test('Unit: isValidNotes enforces maximum 500 characters', () => {
  assert.equal(isValidNotes('Catatan pendek'), true);
  assert.equal(isValidNotes('a'.repeat(500)), true);
  assert.equal(isValidNotes('a'.repeat(501)), false);
  assert.equal(isValidNotes(null), true);
  assert.equal(isValidNotes(undefined), true);
  assert.equal(isValidNotes(''), true);
});

test('Unit: validateCreateWatchSourceInput sanitizes input and throws on invalid fields', () => {
  const validMovieId = '11111111-1111-4111-8111-111111111111';

  // Valid input
  const valid = validateCreateWatchSourceInput({
    movieId: validMovieId,
    platformName: '  Netflix ',
    sourceUrl: ' https://netflix.com/watch/1 ',
    accessType: 'subscription',
    isPrimary: true,
    notes: ' Rilisan 4K HDR ',
  });

  assert.equal(valid.movieId, validMovieId);
  assert.equal(valid.cleanPlatformName, 'Netflix');
  assert.equal(valid.cleanSourceUrl, 'https://netflix.com/watch/1');
  assert.equal(valid.accessType, 'subscription');
  assert.equal(valid.isPrimary, true);
  assert.equal(valid.cleanNotes, 'Rilisan 4K HDR');

  // Valid physical source without URL
  const physical = validateCreateWatchSourceInput({
    movieId: validMovieId,
    platformName: 'Kaset VHS Original',
    accessType: 'physical',
  });
  assert.equal(physical.cleanSourceUrl, null);
  assert.equal(physical.accessType, 'physical');
  assert.equal(physical.isPrimary, false);

  // Invalid movie ID
  assert.throws(() => {
    validateCreateWatchSourceInput({
      movieId: 'invalid-id',
      platformName: 'Netflix',
      accessType: 'subscription',
    });
  }, /ID film tidak valid/);

  // Empty platform name
  assert.throws(() => {
    validateCreateWatchSourceInput({
      movieId: validMovieId,
      platformName: '   ',
      accessType: 'subscription',
    });
  }, /Nama platform tontonan wajib diisi/);

  // Invalid access type
  assert.throws(() => {
    validateCreateWatchSourceInput({
      movieId: validMovieId,
      platformName: 'Netflix',
      accessType: 'pirate',
    });
  }, /Tipe akses tidak valid/);

  // Insecure URL
  assert.throws(() => {
    validateCreateWatchSourceInput({
      movieId: validMovieId,
      platformName: 'Streaming',
      sourceUrl: 'javascript:void(0)',
      accessType: 'free',
    });
  }, /Tautan tontonan harus berupa URL HTTP\/HTTPS yang valid/);

  // Oversized notes
  assert.throws(() => {
    validateCreateWatchSourceInput({
      movieId: validMovieId,
      platformName: 'Netflix',
      accessType: 'subscription',
      notes: 'x'.repeat(501),
    });
  }, /Catatan sumber tontonan tidak boleh melebihi 500 karakter/);
});

test('Unit: validateUpdateWatchSourceInput validates partial fields and rejects empty updates', () => {
  // Empty update throws
  assert.throws(() => {
    validateUpdateWatchSourceInput({});
  }, /Setidaknya harus ada satu bidang data yang diperbarui/);

  // Partial update: platformName only
  const update1 = validateUpdateWatchSourceInput({
    platformName: ' Prime Video Indonesia ',
  });
  assert.equal(update1.cleanPlatformName, 'Prime Video Indonesia');
  assert.equal(update1.cleanSourceUrl, undefined);

  // Partial update: URL and isPrimary
  const update2 = validateUpdateWatchSourceInput({
    sourceUrl: ' https://primevideo.com/detail/1 ',
    isPrimary: true,
  });
  assert.equal(update2.cleanSourceUrl, 'https://primevideo.com/detail/1');
  assert.equal(update2.isPrimary, true);

  // Invalid URL in update
  assert.throws(() => {
    validateUpdateWatchSourceInput({
      sourceUrl: 'ftp://files.org/vid.mp4',
    });
  }, /Tautan tontonan harus berupa URL HTTP\/HTTPS yang valid/);
});

test('Unit: mapWatchSourceDbError translates PostgreSQL error codes to user-facing messages', () => {
  // Cross-ownership error (P0003)
  assert.equal(
    mapWatchSourceDbError({ code: 'P0003', message: 'movie does not exist or does not belong' }),
    'Film tidak ditemukan atau bukan milik akun Anda.'
  );

  // Not found error (P0004)
  assert.equal(
    mapWatchSourceDbError({ code: 'P0004', message: 'Watch source not found' }),
    'Sumber tontonan tidak ditemukan.'
  );

  // Partial unique index violation (23505)
  assert.equal(
    mapWatchSourceDbError({ code: '23505', message: 'duplicate key value violates unique constraint "movie_watch_sources_primary_unique"' }),
    'Film ini sudah memiliki tautan tontonan utama. Silakan ganti atau nonaktifkan status utama sumber lainnya terlebih dahulu.'
  );

  // Check constraint violations (23514)
  assert.equal(
    mapWatchSourceDbError({ code: '23514', message: 'check constraint "movie_watch_sources_platform_name_check"' }),
    'Nama platform wajib diisi antara 1 hingga 100 karakter.'
  );
  assert.equal(
    mapWatchSourceDbError({ code: '23514', message: 'check constraint "movie_watch_sources_source_url_check"' }),
    'Tautan tontonan harus berupa URL HTTP/HTTPS yang valid (maksimal 2048 karakter).'
  );
  assert.equal(
    mapWatchSourceDbError({ code: '23514', message: 'check constraint "movie_watch_sources_access_type_check"' }),
    'Tipe akses tidak valid.'
  );

  // RLS error (42501)
  assert.equal(
    mapWatchSourceDbError({ code: '42501', message: 'new row violates row-level security policy' }),
    'Akses ditolak oleh kebijakan keamanan data.'
  );

  // Fallback
  assert.equal(
    mapWatchSourceDbError(null),
    'Terjadi kesalahan pada database sumber tontonan.'
  );
});

// ==============================================================================
// 3. SIMULATION & SERVICE LIFECYCLE TESTS
// ==============================================================================

test('Simulation: Multi-Source lifecycle with primary promotion, demotion, and deletion fallback', () => {
  const validMovieId = '11111111-1111-4111-8111-111111111111';

  // In-memory mock database for watch sources
  const mockDb = {
    movies: [
      { id: validMovieId, user_id: 'user-curator', title: 'Solaris' },
    ],
    sources: [],
  };

  function mockCreateWatchSource(input, authUser) {
    if (!authUser) throw new Error('Autentikasi diperlukan.');
    const validated = validateCreateWatchSourceInput(input);

    const movie = mockDb.movies.find((m) => m.id === validated.movieId && m.user_id === authUser.id);
    if (!movie) throw new Error('Film tidak ditemukan atau bukan milik akun Anda.');

    const existingSources = mockDb.sources.filter((s) => s.movieId === validated.movieId);
    let shouldBePrimary = validated.isPrimary;
    if (existingSources.length === 0) {
      shouldBePrimary = true; // First source auto-promotes to primary
    }

    if (shouldBePrimary) {
      existingSources.forEach((s) => {
        s.isPrimary = false;
      });
    }

    const newSource = {
      id: `source-${mockDb.sources.length + 1}`,
      movieId: validated.movieId,
      userId: authUser.id,
      platformName: validated.cleanPlatformName,
      sourceUrl: validated.cleanSourceUrl,
      accessType: validated.accessType,
      isPrimary: shouldBePrimary,
      notes: validated.cleanNotes,
      createdAt: new Date().toISOString(),
    };

    mockDb.sources.push(newSource);
    return newSource;
  }

  function mockSetPrimary(sourceId, authUser) {
    if (!authUser) throw new Error('Autentikasi diperlukan.');
    const target = mockDb.sources.find((s) => s.id === sourceId && s.userId === authUser.id);
    if (!target) throw new Error('Sumber tontonan tidak ditemukan atau bukan milik akun Anda.');

    mockDb.sources
      .filter((s) => s.movieId === target.movieId)
      .forEach((s) => {
        s.isPrimary = s.id === sourceId;
      });

    return target;
  }

  function mockDeleteWatchSource(sourceId, authUser) {
    if (!authUser) throw new Error('Autentikasi diperlukan.');
    const idx = mockDb.sources.findIndex((s) => s.id === sourceId && s.userId === authUser.id);
    if (idx === -1) throw new Error('Sumber tontonan tidak ditemukan.');

    const [deleted] = mockDb.sources.splice(idx, 1);
    let newPrimaryId;

    if (deleted.isPrimary) {
      const remaining = mockDb.sources.filter((s) => s.movieId === deleted.movieId);
      if (remaining.length > 0) {
        remaining[0].isPrimary = true;
        newPrimaryId = remaining[0].id;
      }
    }

    return { success: true, deletedId: sourceId, newPrimaryId };
  }

  const curator = { id: 'user-curator' };

  // Step 1: Add first source (Criterion Channel). Even with isPrimary=false, it auto-promotes because it's first
  const s1 = mockCreateWatchSource({
    movieId: validMovieId,
    platformName: 'Criterion Channel',
    sourceUrl: 'https://criterionchannel.com/watch/1',
    accessType: 'subscription',
    isPrimary: false,
  }, curator);
  assert.equal(s1.isPrimary, true, 'First source must auto-promote to primary');

  // Step 2: Add second source (Physical VHS) with isPrimary=false
  const s2 = mockCreateWatchSource({
    movieId: validMovieId,
    platformName: 'Koleksi Kaset VHS',
    accessType: 'physical',
    isPrimary: false,
  }, curator);
  assert.equal(s2.isPrimary, false, 'Second source must stay non-primary when requested');
  assert.equal(s1.isPrimary, true, 'First source remains primary');

  // Step 3: Switch primary to second source (VHS)
  mockSetPrimary(s2.id, curator);
  assert.equal(s2.isPrimary, true, 'Second source is now primary');
  assert.equal(s1.isPrimary, false, 'First source demoted from primary');

  // Step 4: Delete active primary source (s2)
  const delResult = mockDeleteWatchSource(s2.id, curator);
  assert.equal(delResult.success, true);
  assert.equal(delResult.newPrimaryId, s1.id, 'Fallback promotion must promote remaining source');
  assert.equal(s1.isPrimary, true, 'First source restored to primary after active primary deletion');
});

test('Simulation: Ownership enforcement and cross-ownership attack rejection', () => {
  const mockDb = {
    movies: [
      { id: '11111111-1111-4111-8111-111111111111', user_id: 'user-alice', title: 'Persona' },
      { id: '22222222-2222-4222-8222-222222222222', user_id: 'user-bob', title: 'Stalker' },
    ],
    sources: [
      { id: '33333333-3333-4333-8333-333333333333', movieId: '11111111-1111-4111-8111-111111111111', userId: 'user-alice' },
    ],
  };

  const alice = { id: 'user-alice' };
  const bob = { id: 'user-bob' };

  // Bob attempts to create a source for Alice's movie
  function attemptCreate(movieId, authUser) {
    const movie = mockDb.movies.find((m) => m.id === movieId && m.user_id === authUser.id);
    if (!movie) {
      throw new Error('Film tidak ditemukan atau bukan milik akun Anda.');
    }
    return { success: true };
  }

  assert.throws(() => {
    attemptCreate('11111111-1111-4111-8111-111111111111', bob);
  }, /Film tidak ditemukan atau bukan milik akun Anda/);

  // Bob attempts to update or delete Alice's watch source
  function attemptDelete(sourceId, authUser) {
    const source = mockDb.sources.find((s) => s.id === sourceId && s.userId === authUser.id);
    if (!source) {
      throw new Error('Sumber tontonan tidak ditemukan atau bukan milik akun Anda.');
    }
    return { success: true };
  }

  assert.throws(() => {
    attemptDelete('33333333-3333-4333-8333-333333333333', bob);
  }, /Sumber tontonan tidak ditemukan atau bukan milik akun Anda/);

  // Alice can successfully access her own movie and source
  assert.doesNotThrow(() => {
    attemptCreate('11111111-1111-4111-8111-111111111111', alice);
    attemptDelete('33333333-3333-4333-8333-333333333333', alice);
  });
});

test('Simulation: Idempotent legacy data backfill logic with domain recognition and null/empty handling', () => {
  const legacyMovies = [
    { id: 'm1', user_id: 'u1', watch_url: 'https://www.netflix.com/title/1234' },
    { id: 'm2', user_id: 'u1', watch_url: 'https://youtu.be/dQw4w9WgXcQ' },
    { id: 'm3', user_id: 'u1', watch_url: 'https://bioskoponline.com/film/456' },
    { id: 'm4', user_id: 'u1', watch_url: 'https://indiecinema.org/movie/789' },
    { id: 'm5', user_id: 'u1', watch_url: '' }, // Empty string
    { id: 'm6', user_id: 'u1', watch_url: null }, // Null
    { id: 'm7', user_id: 'u1', watch_url: 'not-a-valid-url' }, // Invalid format
  ];

  const watchSourcesTable = [];

  function runBackfillMigration(movies, existingSources) {
    let insertedCount = 0;
    for (const m of movies) {
      // 1. Filter null, empty, and invalid URLs
      if (!m.watch_url || m.watch_url.trim() === '') continue;
      if (!/^https?:\/\/\S+$/i.test(m.watch_url.trim())) continue;

      // 2. Idempotency: not exists check
      const alreadyHasSources = existingSources.some((ws) => ws.movie_id === m.id);
      if (alreadyHasSources) continue;

      // 3. Domain detection
      let platform = 'Tautan Tontonan';
      let access = 'other';
      const url = m.watch_url.toLowerCase();

      if (url.includes('netflix.com')) {
        platform = 'Netflix';
        access = 'subscription';
      } else if (url.includes('youtube.com') || url.includes('youtu.be')) {
        platform = 'YouTube';
        access = 'free';
      } else if (url.includes('bioskoponline.com')) {
        platform = 'Bioskop Online';
        access = 'rent';
      }

      existingSources.push({
        id: `backfill-${existingSources.length + 1}`,
        movie_id: m.id,
        user_id: m.user_id,
        platform_name: platform,
        source_url: m.watch_url.trim(),
        access_type: access,
        is_primary: true,
      });
      insertedCount++;
    }
    return insertedCount;
  }

  // Pass 1: Initial migration run
  const pass1 = runBackfillMigration(legacyMovies, watchSourcesTable);
  assert.equal(pass1, 4, 'Must backfill exactly 4 valid legacy movies (m1, m2, m3, m4)');
  assert.equal(watchSourcesTable.length, 4);

  // Verify platform detection
  assert.equal(watchSourcesTable.find((s) => s.movie_id === 'm1').platform_name, 'Netflix');
  assert.equal(watchSourcesTable.find((s) => s.movie_id === 'm1').access_type, 'subscription');
  assert.equal(watchSourcesTable.find((s) => s.movie_id === 'm2').platform_name, 'YouTube');
  assert.equal(watchSourcesTable.find((s) => s.movie_id === 'm2').access_type, 'free');
  assert.equal(watchSourcesTable.find((s) => s.movie_id === 'm3').platform_name, 'Bioskop Online');
  assert.equal(watchSourcesTable.find((s) => s.movie_id === 'm3').access_type, 'rent');
  assert.equal(watchSourcesTable.find((s) => s.movie_id === 'm4').platform_name, 'Tautan Tontonan');
  assert.equal(watchSourcesTable.find((s) => s.movie_id === 'm4').access_type, 'other');

  // Verify all backfilled sources are marked primary
  watchSourcesTable.forEach((s) => {
    assert.equal(s.is_primary, true);
  });

  // Pass 2: Re-run migration (Idempotency test)
  const pass2 = runBackfillMigration(legacyMovies, watchSourcesTable);
  assert.equal(pass2, 0, 'Second run must insert 0 rows (strictly idempotent)');
  assert.equal(watchSourcesTable.length, 4, 'Table size must remain unchanged after re-run');
});
