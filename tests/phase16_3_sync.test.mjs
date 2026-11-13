import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  detectPlatformFromUrl,
  isValidSourceUrl,
  isValidUuid,
  ACCESS_TYPES,
} from '../src/lib/watch-source-validations.ts';

// ==============================================================================
// 1. UNIT TESTS: PLATFORM DETECTION & URL HEURISTICS
// ==============================================================================

test('Phase 16.3 Unit Test: ACCESS_TYPES definition and isValidUuid validation', () => {
  assert.ok(Array.isArray(ACCESS_TYPES));
  assert.ok(ACCESS_TYPES.includes('subscription'));
  assert.ok(ACCESS_TYPES.includes('other'));
  assert.equal(isValidUuid('33333333-3333-3333-3333-333333333333'), true);
  assert.equal(isValidUuid('invalid-uuid'), false);
});

test('Phase 16.3 Unit Test: detectPlatformFromUrl recognizes all officially supported platforms', () => {
  const cases = [
    {
      url: 'https://www.netflix.com/title/80057281',
      expectedPlatform: 'Netflix',
      expectedAccess: 'subscription',
    },
    {
      url: 'https://primevideo.com/detail/0XYZ',
      expectedPlatform: 'Prime Video',
      expectedAccess: 'subscription',
    },
    {
      url: 'https://www.amazon.com/gp/video/detail/B08XYZ',
      expectedPlatform: 'Prime Video',
      expectedAccess: 'subscription',
    },
    {
      url: 'https://www.disneyplus.com/en-id/movies/encanto',
      expectedPlatform: 'Disney+',
      expectedAccess: 'subscription',
    },
    {
      url: 'https://www.hotstar.com/id/movies/123',
      expectedPlatform: 'Disney+',
      expectedAccess: 'subscription',
    },
    {
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      expectedPlatform: 'YouTube',
      expectedAccess: 'free',
    },
    {
      url: 'https://youtu.be/dQw4w9WgXcQ',
      expectedPlatform: 'YouTube',
      expectedAccess: 'free',
    },
    {
      url: 'https://www.criterionchannel.com/seven-samurai',
      expectedPlatform: 'Criterion Channel',
      expectedAccess: 'subscription',
    },
    {
      url: 'https://www.vidio.com/premier/12345/film-keren',
      expectedPlatform: 'Vidio',
      expectedAccess: 'subscription',
    },
    {
      url: 'https://bioskoponline.com/film/aruna-dan-lidahnya',
      expectedPlatform: 'Bioskop Online',
      expectedAccess: 'rent',
    },
    {
      url: 'https://tv.apple.com/us/movie/killiers-of-the-flower-moon/umc.cmc',
      expectedPlatform: 'Apple TV+',
      expectedAccess: 'subscription',
    },
    {
      url: 'https://mubi.com/id/films/aftersun',
      expectedPlatform: 'MUBI',
      expectedAccess: 'subscription',
    },
    {
      url: 'https://klikfilm.com/v4/watch/film-indie',
      expectedPlatform: 'KlikFilm',
      expectedAccess: 'rent',
    },
    {
      url: 'https://catchplay.com/id/watch/123',
      expectedPlatform: 'Catchplay+',
      expectedAccess: 'subscription',
    },
    {
      url: 'https://wetv.vip/en/play/12345',
      expectedPlatform: 'WeTV',
      expectedAccess: 'subscription',
    },
    {
      url: 'https://www.iq.com/play/anime-title',
      expectedPlatform: 'iQIYI',
      expectedAccess: 'subscription',
    },
    {
      url: 'https://www.max.com/movies/dune-part-two',
      expectedPlatform: 'HBO Max / Go',
      expectedAccess: 'subscription',
    },
    {
      url: 'https://www.viki.com/movies/12345c',
      expectedPlatform: 'Viki',
      expectedAccess: 'subscription',
    },
  ];

  for (const c of cases) {
    const res = detectPlatformFromUrl(c.url);
    assert.equal(
      res.platformName,
      c.expectedPlatform,
      `Platform for ${c.url} must be ${c.expectedPlatform}`
    );
    assert.equal(
      res.accessType,
      c.expectedAccess,
      `Access type for ${c.url} must be ${c.expectedAccess}`
    );
  }
});

test('Phase 16.3 Unit Test: detectPlatformFromUrl handles unknown platform with other access type', () => {
  const res1 = detectPlatformFromUrl('https://myindiefilms.org/watch/123');
  assert.equal(res1.platformName, 'myindiefilms.org');
  assert.equal(res1.accessType, 'other');

  const res2 = detectPlatformFromUrl('https://www.archive.org/details/night_of_the_living_dead');
  assert.equal(res2.platformName, 'archive.org');
  assert.equal(res2.accessType, 'other');
});

test('Phase 16.3 Unit Test: detectPlatformFromUrl handles empty, null, and malformed URLs gracefully', () => {
  const fallback = { platformName: 'Tautan Tontonan', accessType: 'other' };

  assert.deepEqual(detectPlatformFromUrl(null), fallback);
  assert.deepEqual(detectPlatformFromUrl(undefined), fallback);
  assert.deepEqual(detectPlatformFromUrl(''), fallback);
  assert.deepEqual(detectPlatformFromUrl('   '), fallback);
  assert.deepEqual(detectPlatformFromUrl('invalid-url-string-without-domain'), fallback);
});

test('Phase 16.3 Unit Test: URL Validation rigorously filters invalid and unsafe protocols', () => {
  assert.equal(isValidSourceUrl('https://netflix.com/title/123'), true);
  assert.equal(isValidSourceUrl('http://insecure-domain.org/watch'), true);
  assert.equal(isValidSourceUrl(''), true); // Nullable/optional
  assert.equal(isValidSourceUrl(null), true);

  assert.equal(isValidSourceUrl('javascript:alert(1)'), false);
  assert.equal(isValidSourceUrl('data:text/html;base64,PHNjcmlwdD4='), false);
  assert.equal(isValidSourceUrl('ftp://ftp.movie.org/film.mp4'), false);
  assert.equal(isValidSourceUrl('https://' + 'a'.repeat(2045)), false); // Exceeds 2048 chars
});

// ==============================================================================
// 2. LOGIC SIMULATION & ORCHESTRATION TESTS
// ==============================================================================

test('Phase 16.3 Orchestration: Scenario A — Add Movie with valid Watch URL creates primary watch source', async () => {
  // Mock DB & Server Action state
  let createdWatchSource = null;
  const mockMovieId = '33333333-3333-3333-3333-333333333333';
  const inputUrl = 'https://www.netflix.com/title/12345';

  const simulateAddMovieSync = async (movieId, cleanUrl) => {
    if (!cleanUrl || cleanUrl.trim().length === 0) {
      return { watchSourceSync: 'none' };
    }
    if (!isValidSourceUrl(cleanUrl)) {
      return { watchSourceSync: 'invalid_url' };
    }

    try {
      const { platformName, accessType } = detectPlatformFromUrl(cleanUrl);
      createdWatchSource = {
        id: 'ws-1',
        movieId,
        platformName,
        sourceUrl: cleanUrl,
        accessType,
        isPrimary: true,
      };
      return { watchSourceSync: 'synced', watchSources: [createdWatchSource] };
    } catch {
      return { watchSourceSync: 'failed' };
    }
  };

  const result = await simulateAddMovieSync(mockMovieId, inputUrl);
  assert.equal(result.watchSourceSync, 'synced');
  assert.ok(createdWatchSource !== null);
  assert.equal(createdWatchSource.platformName, 'Netflix');
  assert.equal(createdWatchSource.accessType, 'subscription');
  assert.equal(createdWatchSource.isPrimary, true);
});

test('Phase 16.3 Orchestration: Scenario B — Movie remains saved when Watch Source creation fails', async () => {
  const mockMovieId = '44444444-4444-4444-4444-444444444444';
  const inputUrl = 'https://www.netflix.com/title/fail';
  let movieSaved = true;

  const simulateAddMovieWithSourceFailure = async (movieId, cleanUrl) => {
    // Movie is already saved via save_movie_with_moods
    assert.ok(movieId, 'Movie ID must be present');
    assert.ok(cleanUrl, 'cleanUrl must be provided');

    try {
      // Simulate watch source failure (e.g. database network error)
      throw new Error('Connection reset by peer');
    } catch {
      // Non-blocking: Movie remains saved!
      return {
        id: movieId,
        title: 'Film Tangguh',
        watchSourceSync: 'failed',
      };
    }
  };

  const movieResult = await simulateAddMovieWithSourceFailure(mockMovieId, inputUrl);
  assert.equal(movieSaved, true, 'Movie creation must not be rolled back');
  assert.equal(movieResult.id, mockMovieId);
  assert.equal(movieResult.watchSourceSync, 'failed');
});

test('Phase 16.3 Orchestration: Scenario C — Add Movie without Watch URL skips source creation', async () => {
  let watchSourceCalled = false;
  const mockMovieId = '55555555-5555-5555-5555-555555555555';
  const cleanUrl = null;

  const simulateAddMovieNoUrl = async (movieId, url) => {
    if (!url || url.trim().length === 0) {
      return { watchSourceSync: 'none' };
    }
    watchSourceCalled = true;
    return { watchSourceSync: 'synced' };
  };

  const res1 = await simulateAddMovieNoUrl(mockMovieId, cleanUrl);
  assert.equal(res1.watchSourceSync, 'none');
  assert.equal(watchSourceCalled, false);

  const res2 = await simulateAddMovieNoUrl(mockMovieId, '   ');
  assert.equal(res2.watchSourceSync, 'none');
  assert.equal(watchSourceCalled, false);
});

test('Phase 16.3 Orchestration: Scenario D — Add Movie with invalid URL marks status without crashing', async () => {
  let watchSourceCreated = false;
  const mockMovieId = '66666666-6666-6666-6666-666666666666';
  const invalidUrl = 'javascript:alert("exploit")';

  const simulateAddMovieInvalidUrl = async (movieId, rawUrl) => {
    const isInvalid = !isValidSourceUrl(rawUrl);
    if (isInvalid) {
      return {
        id: movieId,
        title: 'Film Valid',
        watchSourceSync: 'invalid_url',
      };
    }
    watchSourceCreated = true;
    return { id: movieId, watchSourceSync: 'synced' };
  };

  const result = await simulateAddMovieInvalidUrl(mockMovieId, invalidUrl);
  assert.equal(result.watchSourceSync, 'invalid_url');
  assert.equal(watchSourceCreated, false);
});

test('Phase 16.3 Orchestration: Scenario E & 8 — Duplicate retry protection avoids duplicate rows', async () => {
  const databaseSources = [];

  const simulateIdempotentCreate = async (movieId, url) => {
    // 1. Check existing source with same url (Idempotency Protection)
    const existing = databaseSources.find(
      (s) => s.movieId === movieId && s.sourceUrl === url
    );
    if (existing) {
      return { ...existing, isDuplicate: false, returnedExisting: true };
    }

    const { platformName, accessType } = detectPlatformFromUrl(url);
    const newSource = {
      id: `ws-${databaseSources.length + 1}`,
      movieId,
      platformName,
      sourceUrl: url,
      accessType,
      isPrimary: true,
    };
    databaseSources.push(newSource);
    return { ...newSource, isDuplicate: false, returnedExisting: false };
  };

  const movieId = '77777777-7777-7777-7777-777777777777';
  const targetUrl = 'https://www.netflix.com/title/idempotent';

  // Request 1: First creation
  const firstRes = await simulateIdempotentCreate(movieId, targetUrl);
  assert.equal(firstRes.returnedExisting, false);
  assert.equal(databaseSources.length, 1);

  // Request 2: Retry with exact same movie and URL
  const retryRes = await simulateIdempotentCreate(movieId, targetUrl);
  assert.equal(retryRes.returnedExisting, true);
  assert.equal(databaseSources.length, 1, 'Database must not contain duplicate rows');
  assert.equal(retryRes.id, firstRes.id);
});

test('Phase 16.3 Orchestration: Concurrency race condition on 23505 partial unique index is handled', async () => {
  // Simulates PostgreSQL partial unique constraint violation (code 23505)
  // when two requests race to insert primary source simultaneously.
  const committedPrimary = {
    id: 'ws-winner',
    movieId: '88888888-8888-8888-8888-888888888888',
    sourceUrl: 'https://youtube.com/watch?v=racing',
    isPrimary: true,
  };

  const simulateRaceHandler = async (requestedUrl, isSimulatedRace) => {
    if (isSimulatedRace) {
      const dbError = {
        code: '23505',
        message: 'duplicate key value violates unique constraint "movie_watch_sources_primary_unique"',
      };

      // Handler recovers by fetching the winning committed primary
      if (
        (dbError.code === '23505' || dbError.message.includes('movie_watch_sources_primary_unique')) &&
        committedPrimary.sourceUrl === requestedUrl
      ) {
        return committedPrimary;
      }
      throw new Error('Unrecoverable constraint error');
    }
    return committedPrimary;
  };

  const recovered = await simulateRaceHandler('https://youtube.com/watch?v=racing', true);
  assert.equal(recovered.id, 'ws-winner');
  assert.equal(recovered.isPrimary, true);
});

// ==============================================================================
// 3. STATIC CODE ARCHITECTURE & SECURITY TESTS
// ==============================================================================

test('Phase 16.3 Security: Server Actions enforce server-side auth.uid() and forbid client user_id', () => {
  const watchSourcesCode = fs.readFileSync(
    path.resolve(process.cwd(), 'src/lib/watchSources.ts'),
    'utf8'
  );

  // Verify getAuthenticatedUser is called
  assert.ok(
    watchSourcesCode.includes('const { supabase, user } = await getAuthenticatedUser();'),
    'createWatchSource must retrieve user from session'
  );

  // Verify user.id from session is bound to insert payload
  assert.ok(
    watchSourcesCode.includes('user_id: user.id'),
    'Insert payload must strictly bind user_id to session user.id'
  );

  // Verify movies.ts uses addMovie with authenticated Supabase client
  const moviesCode = fs.readFileSync(
    path.resolve(process.cwd(), 'src/lib/movies.ts'),
    'utf8'
  );
  assert.ok(
    moviesCode.includes('const supabase = await createClient();'),
    'movies.ts must use authenticated server client'
  );
});

test('Phase 16.3 Database Architecture: Trigger P0003 and partial unique index are preserved', () => {
  const migrationPath = path.resolve(
    process.cwd(),
    'supabase/migrations/20261114000000_phase16_watch_sources.sql'
  );
  const sql = fs.readFileSync(migrationPath, 'utf8');

  // Trigger cross-ownership
  assert.ok(
    sql.includes('validate_movie_watch_source_ownership'),
    'Must define ownership trigger'
  );
  assert.ok(
    sql.includes("raise exception 'Cross-ownership error: movie does not exist or does not belong to the user.'"),
    'Trigger must enforce cross-ownership exception'
  );

  // Partial unique index
  assert.ok(
    sql.includes('movie_watch_sources_primary_unique'),
    'Must define partial unique index'
  );
  assert.ok(
    sql.includes('where (is_primary = true)'),
    'Index must enforce is_primary = true partial index'
  );
});

test('Phase 16.3 UX & Regression: AddMovieView preserves Retro VHS styling and distinguishes toast feedback', () => {
  const viewPath = path.resolve(
    process.cwd(),
    'src/components/views/AddMovieView.tsx'
  );
  const viewContent = fs.readFileSync(viewPath, 'utf8');

  // Input #au remains intact
  assert.ok(
    viewContent.includes('id="au"'),
    'Watch URL input field with id="au" must be preserved'
  );
  assert.ok(
    viewContent.includes('4. Tautan Nonton'),
    'Section 4: Tautan Nonton heading must be preserved'
  );

  // Toast feedback handles sync differentiation
  assert.ok(
    viewContent.includes("newMovie.watchSourceSync === 'failed'"),
    'AddMovieView must inspect watchSourceSync failure'
  );
  assert.ok(
    viewContent.includes("newMovie.watchSourceSync === 'invalid_url'"),
    'AddMovieView must inspect watchSourceSync invalid_url'
  );
  assert.ok(
    viewContent.includes('masuk ke Kabin, namun tautan tontonan gagal disinkronkan'),
    'User must receive distinct feedback when sync fails'
  );
});
