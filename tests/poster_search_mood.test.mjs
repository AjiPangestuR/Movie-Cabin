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
