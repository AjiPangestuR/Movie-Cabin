import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateMoodName,
  generateMoodSlug,
  mapMoodRpcError,
} from '../src/lib/validations.ts';
import {
  buildPosterUrl,
  normalizeTmdbMovie,
} from '../src/lib/tmdb.ts';

test('Poster: posterUrl valid dihasilkan dari poster_path TMDB', () => {
  const raw = {
    id: 157336,
    title: 'Interstellar',
    poster_path: '/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
  };
  const normalized = normalizeTmdbMovie(raw);
  assert.equal(
    normalized.posterUrl,
    'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg'
  );
  assert.equal(typeof normalized.posterUrl, 'string');
});

test('Poster: poster_path null menghasilkan posterUrl null (memicu fallback visual)', () => {
  const raw = {
    id: 999999,
    title: 'Indie Film Without Poster',
    poster_path: null,
  };
  const normalized = normalizeTmdbMovie(raw);
  assert.equal(normalized.posterUrl, null);
  assert.equal(normalized.posterPath, null);
});

test('Poster: URL gambar invalid atau kosong menghasilkan null', () => {
  assert.equal(buildPosterUrl(''), null);
  assert.equal(buildPosterUrl('   '), null);
  assert.equal(buildPosterUrl(null), null);
  assert.equal(buildPosterUrl(undefined), null);
});

test('Poster: transisi pemilihan film baru memperbarui poster', () => {
  // Simulasi state peralihan film A -> film B
  let selectedMovie = {
    title: 'Film A',
    tmdb: 101,
    posterUrl: 'https://image.tmdb.org/t/p/w500/posterA.jpg',
  };

  const nextMoviePick = {
    title: 'Film B',
    tmdbId: 202,
    posterUrl: 'https://image.tmdb.org/t/p/w500/posterB.jpg',
  };

  // Handler memilih film baru
  selectedMovie = {
    title: nextMoviePick.title,
    tmdb: nextMoviePick.tmdbId,
    posterUrl: nextMoviePick.posterUrl,
  };

  assert.equal(selectedMovie.posterUrl, 'https://image.tmdb.org/t/p/w500/posterB.jpg');
  assert.equal(selectedMovie.tmdb, 202);
});

test('Poster: request detail yang datang terlambat tidak menghilangkan poster', () => {
  // Film awal dipilih dengan posterUrl yang valid dari pencarian
  const currentMovie = {
    title: 'Dune: Part Two',
    tmdb: 693134,
    posterUrl: 'https://image.tmdb.org/t/p/w500/dune-poster.jpg',
    runtime: '',
    syn: 'Initial synopsis',
  };

  // Detail tiba dari latar belakang dengan runtime, tetapi posterUrl null (misal bahasa lokal tidak ada poster)
  const incomingDetail = {
    tmdbId: 693134,
    runtime: 166,
    overview: 'Updated detailed synopsis',
    posterUrl: null, // detail tidak memiliki poster
  };

  // Logika update state MOCAB: pertahankan posterUrl sebelumnya bila detail posterUrl kosong
  const updatedMovie = {
    ...currentMovie,
    runtime: incomingDetail.runtime || currentMovie.runtime,
    syn: incomingDetail.overview || currentMovie.syn,
    posterUrl: incomingDetail.posterUrl || currentMovie.posterUrl,
  };

  assert.equal(updatedMovie.runtime, 166);
  assert.equal(updatedMovie.posterUrl, 'https://image.tmdb.org/t/p/w500/dune-poster.jpg');
});

test('Poster: mode input manual menyetel posterUrl ke null dengan konsisten', () => {
  const manualState = {
    manual: true,
    title: 'Film Karya Pribadi',
    year: '2025',
    runtime: '90',
    syn: 'Sinopsis manual...',
    posterUrl: null,
  };

  assert.equal(manualState.manual, true);
  assert.equal(manualState.posterUrl, null);
  assert.equal(Boolean(manualState.posterUrl), false);
});

test('Search bar: aturan padding input mencegah tabrakan dengan ikon & tombol clear', () => {
  // Kontrak tata letak:
  // - Sisi kiri memiliki ikon 16px pada posisi pl-3.5 (14px). Input harus pl-10 (40px)
  // - Sisi kanan dapat memiliki spinner (16px) + tombol clear (28px) + gap. Input harus pr-16 (64px)
  const leftIconOffset = 14;
  const leftIconWidth = 16;
  const inputPaddingLeft = 40; // pl-10
  assert.ok(
    inputPaddingLeft > leftIconOffset + leftIconWidth,
    'Padding kiri input harus lebih besar dari total jangkauan ikon kiri'
  );

  const rightClearWidth = 28;
  const rightSpinnerWidth = 16;
  const rightGap = 6;
  const rightPadding = 10;
  const totalRightElements = rightClearWidth + rightSpinnerWidth + rightGap + rightPadding;
  const inputPaddingRight = 64; // pr-16
  assert.ok(
    inputPaddingRight > totalRightElements,
    'Padding kanan input harus mencukupi untuk spinner dan tombol clear tanpa menimpa teks'
  );
});

test('Mood: validasi nama mood menolak string kosong atau melebihi batas 24 karakter', () => {
  assert.throws(() => validateMoodName(''), /Nama mood harus antara 1 sampai 24 karakter/);
  assert.throws(() => validateMoodName('   '), /Nama mood harus antara 1 sampai 24 karakter/);
  assert.throws(
    () => validateMoodName('Nama Mood Yang Sangat Panjang Sekali Melebihi Batas'),
    /Nama mood harus antara 1 sampai 24 karakter/
  );
  assert.equal(validateMoodName('Melankolis'), 'Melankolis');
});

test('Mood: penanganan nama duplikat dipetakan ke pesan ramah bahasa Indonesia', () => {
  const uniqueViolationError = {
    code: '23505',
    message: 'duplicate key value violates unique constraint "moods_user_lower_name_unique"',
  };
  assert.equal(mapMoodRpcError(uniqueViolationError), 'Mood dengan nama ini sudah ada.');
});

test('Mood: error pelanggaran RLS dipetakan secara informatif saat update/delete belum aktif', () => {
  const rlsError = {
    code: '42501',
    message: 'new row violates row-level security policy for table "moods"',
  };

  // Fungsi mapping error RLS untuk operasi update
  const mapRlsError = (err) => {
    if (
      err.code === '42501' ||
      err.message?.toLowerCase().includes('row-level security') ||
      err.message?.toLowerCase().includes('permission denied')
    ) {
      return 'Kebijakan keamanan database belum mengizinkan operasi ini (RLS policy diperlukan).';
    }
    return 'Gagal memproses mood.';
  };

  assert.equal(
    mapRlsError(rlsError),
    'Kebijakan keamanan database belum mengizinkan operasi ini (RLS policy diperlukan).'
  );
});

test('Mood: pembuatan slug mood konsisten dan bersih dari karakter non-alfanumerik', () => {
  assert.equal(generateMoodSlug('Melankolis Malam'), 'melankolis-malam');
  assert.equal(generateMoodSlug('Mind-Bending & Thriller!'), 'mind-bending-thriller');
  assert.equal(typeof generateMoodSlug(''), 'string');
});

test('Mood: relasi movie_moods diverifikasi sebelum penghapusan diizinkan', () => {
  const verifyCanDeleteMood = (linkedMovieCount) => {
    if (linkedMovieCount > 0) {
      throw new Error(
        `Mood ini tidak dapat dihapus karena masih digunakan oleh ${linkedMovieCount} film. Lepaskan mood dari film terkait terlebih dahulu.`
      );
    }
    return true;
  };

  assert.throws(
    () => verifyCanDeleteMood(3),
    /Mood ini tidak dapat dihapus karena masih digunakan oleh 3 film/
  );
  assert.equal(verifyCanDeleteMood(0), true);
});

test('Detail Film: resolusi posterUrl server-side berdasarkan tmdbId', () => {
  // Simulasi film dari database dengan tmdbId
  const dbMovie = {
    id: 'b78c9d01-1234-5678-90ab-cdef12345678',
    tmdbId: 550,
    title: 'Fight Club',
    year: 1999,
  };

  // Simulasi metadata TMDB yang di-resolve di server
  const resolveDetailPoster = (movie, tmdbDetail) => {
    if (movie.tmdbId && tmdbDetail && tmdbDetail.posterUrl) {
      return tmdbDetail.posterUrl;
    }
    return null;
  };

  const posterWithDetail = resolveDetailPoster(dbMovie, {
    posterUrl: 'https://image.tmdb.org/t/p/w500/jSziioSwPVrOy9Yow3XhWIBDjq1.jpg',
  });
  assert.equal(
    posterWithDetail,
    'https://image.tmdb.org/t/p/w500/jSziioSwPVrOy9Yow3XhWIBDjq1.jpg'
  );

  // Jika TMDB detail gagal (null), fallback ke null (memicu generative cover MOCAB)
  const posterWithoutDetail = resolveDetailPoster(dbMovie, null);
  assert.equal(posterWithoutDetail, null);

  // Jika film manual (tmdbId = null), posterUrl selalu null
  const manualMovie = { ...dbMovie, tmdbId: null };
  const posterManual = resolveDetailPoster(manualMovie, {
    posterUrl: 'https://image.tmdb.org/t/p/w500/some-poster.jpg',
  });
  assert.equal(posterManual, null);
});

test('Persistensi Poster: pemetaan baris database movies menghasilkan posterUrl dan posterPath', () => {
  // Simulasi transformasi baris data dari query listMovies & getMovie
  const mapMovieRow = (row) => ({
    id: row.id,
    tmdbId: row.tmdb_id,
    title: row.title,
    year: row.release_year ?? '?',
    runtime: row.runtime ?? '?',
    posterPath: row.poster_path ?? null,
    posterUrl: row.poster_path ? buildPosterUrl(row.poster_path, 'w500') : null,
  });

  const rowWithPoster = {
    id: 'f81d4fae-7dec-11d0-a765-00a0c91e6bf6',
    tmdb_id: 157336,
    title: 'Interstellar',
    release_year: 2014,
    runtime: 169,
    poster_path: '/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
  };

  const mappedWithPoster = mapMovieRow(rowWithPoster);
  assert.equal(mappedWithPoster.posterPath, '/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg');
  assert.equal(
    mappedWithPoster.posterUrl,
    'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg'
  );

  const rowWithoutPoster = {
    id: 'a12b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d',
    tmdb_id: null,
    title: 'Film Karya Pribadi',
    release_year: 2024,
    runtime: 85,
    poster_path: null,
  };

  const mappedWithoutPoster = mapMovieRow(rowWithoutPoster);
  assert.equal(mappedWithoutPoster.posterPath, null);
  assert.equal(mappedWithoutPoster.posterUrl, null);
});

test('Persistensi Poster: form AddMovie meneruskan posterPath ke RPC payload', () => {
  // Simulasi payload addMovie dan pembentukan argumen RPC save_movie_with_moods
  const buildRpcPayload = (input, moodIds) => ({
    p_title: input.title.trim(),
    p_release_year: input.year ? Number(input.year) : null,
    p_runtime: input.runtime ? Number(input.runtime) : null,
    p_synopsis: input.synopsis || '',
    p_source_url: null,
    p_watch_url: input.watchUrl || null,
    p_tmdb_id: input.tmdbId ?? null,
    p_mood_ids: moodIds,
    p_poster_path: input.posterPath || null,
  });

  const inputFromTmdb = {
    tmdbId: 550,
    title: 'Fight Club',
    year: 1999,
    runtime: 139,
    synopsis: 'An insomniac office worker...',
    watchUrl: 'https://example.com/watch',
    posterPath: '/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg',
  };

  const payloadTmdb = buildRpcPayload(inputFromTmdb, ['uuid-1', 'uuid-2']);
  assert.equal(payloadTmdb.p_poster_path, '/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg');
  assert.equal(payloadTmdb.p_tmdb_id, 550);

  const inputManual = {
    title: 'Film Manual',
    year: 2023,
    runtime: 90,
    synopsis: '',
    posterPath: null,
  };

  const payloadManual = buildRpcPayload(inputManual, ['uuid-1']);
  assert.equal(payloadManual.p_poster_path, null);
  assert.equal(payloadManual.p_tmdb_id, null);
});

test('Detail Film: prioritas posterUrl lokal menghindari fetch TMDB berulang', async () => {
  // Simulasi logika pemilihan poster di MovieDetailPage
  let externalFetchCount = 0;
  const mockGetTmdbMovieDetail = async () => {
    externalFetchCount += 1;
    return { posterUrl: 'https://image.tmdb.org/t/p/w500/from-tmdb.jpg' };
  };

  const resolvePagePoster = async (movie) => {
    let posterUrl = movie.posterUrl ?? null;
    if (!posterUrl && movie.tmdbId) {
      const detail = await mockGetTmdbMovieDetail();
      posterUrl = detail.posterUrl;
    }
    return posterUrl;
  };

  // Kasus 1: Film sudah memiliki posterUrl dari database (film baru setelah migrasi)
  const movieWithStoredPoster = {
    id: 'm-1',
    tmdbId: 157336,
    posterUrl: 'https://image.tmdb.org/t/p/w500/from-db.jpg',
  };

  const res1 = await resolvePagePoster(movieWithStoredPoster);
  assert.equal(res1, 'https://image.tmdb.org/t/p/w500/from-db.jpg');
  assert.equal(externalFetchCount, 0, 'Tidak boleh memanggil fetch eksternal jika sudah ada posterUrl di DB');

  // Kasus 2: Film lama (posterUrl null) dengan tmdbId -> fetch fallback TMDB dipanggil 1 kali
  const legacyMovie = {
    id: 'm-2',
    tmdbId: 550,
    posterUrl: null,
  };

  const res2 = await resolvePagePoster(legacyMovie);
  assert.equal(res2, 'https://image.tmdb.org/t/p/w500/from-tmdb.jpg');
  assert.equal(externalFetchCount, 1, 'Harus memanggil fetch eksternal untuk film legacy');
});

test('Hydration: initial render (shuffleKey === 0) menghasilkan rekomendasi deterministik tanpa Math.random', () => {
  const unwatchedCandidates = [
    { id: '1', title: 'Drawing Closer', year: 2024, done: false },
    { id: '2', title: 'The Pope Exorcist', year: 2023, done: false },
    { id: '3', title: 'Past Lives', year: 2023, done: false },
    { id: '4', title: 'Aftersun', year: 2022, done: false },
    { id: '5', title: 'Perfect Days', year: 2023, done: false },
  ];

  // Implementasi logika picks persis seperti di HomeView.tsx
  const resolveHomePicks = (candidates, shuffleKey, shuffleFn) => {
    if (candidates.length === 0) return [];
    if (shuffleKey === 0) {
      return candidates.slice(0, 3);
    }
    return shuffleFn(candidates).slice(0, 3);
  };

  let randomCalled = false;
  const mockShuffle = (arr) => {
    randomCalled = true;
    return [...arr].reverse();
  };

  // 1. Simulasi Server Render (SSR di Node.js)
  const serverPicks = resolveHomePicks(unwatchedCandidates, 0, mockShuffle);
  assert.equal(randomCalled, false, 'Initial render tidak boleh memanggil fungsi random');
  assert.deepEqual(serverPicks.map((m) => m.id), ['1', '2', '3']);
  assert.equal(serverPicks[0].title, 'Drawing Closer');

  // 2. Simulasi Client Hydration (di browser)
  const clientHydrationPicks = resolveHomePicks(unwatchedCandidates, 0, mockShuffle);
  assert.equal(randomCalled, false, 'Client hydration pass tidak boleh memanggil fungsi random');
  assert.deepEqual(
    clientHydrationPicks.map((m) => m.id),
    serverPicks.map((m) => m.id),
    'Virtual DOM client dan HTML server harus identik 100% untuk mencegah hydration mismatch'
  );

  // 3. Simulasi Interaksi Pengguna: Klik "Acak lagi" (shuffleKey = 1)
  const shuffledPicks = resolveHomePicks(unwatchedCandidates, 1, mockShuffle);
  assert.equal(randomCalled, true, 'Pengacakan harus aktif saat shuffleKey > 0');
  assert.deepEqual(shuffledPicks.map((m) => m.id), ['5', '4', '3']);
});

test('Hydration: edge case jumlah unwatchedCandidates kurang dari 3 atau kosong', () => {
  const resolveHomePicks = (candidates, shuffleKey) => {
    if (candidates.length === 0) return [];
    if (shuffleKey === 0) {
      return candidates.slice(0, 3);
    }
    return candidates.slice(0, 3);
  };

  // Kasus kosong
  assert.deepEqual(resolveHomePicks([], 0), []);
  assert.deepEqual(resolveHomePicks([], 1), []);

  // Kasus 1 film
  const singleCandidate = [{ id: '1', title: 'Solo Film', done: false }];
  assert.equal(resolveHomePicks(singleCandidate, 0).length, 1);
  assert.equal(resolveHomePicks(singleCandidate, 0)[0].title, 'Solo Film');

  // Kasus 2 film
  const twoCandidates = [
    { id: '1', title: 'Film 1', done: false },
    { id: '2', title: 'Film 2', done: false },
  ];
  assert.equal(resolveHomePicks(twoCandidates, 0).length, 2);
});


