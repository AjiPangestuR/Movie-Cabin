import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isValidUuid,
  parseYear,
  parseRuntime,
  isValidWatchUrl,
  validateMovieInput,
  validateWatchLogInput,
  validateMoodName,
  generateMoodSlug,
  extractMoodNames,
  extractWatchLog,
  mapMovieRpcError,
  mapMoodRpcError,
  mapWatchLogRpcError,
} from '../src/lib/validations.ts';

test('isValidUuid: validasi format UUID v4', () => {
  assert.equal(isValidUuid('00000000-0000-0000-0000-000000000001'), true);
  assert.equal(isValidUuid('e58ed763-928c-4155-bee9-fdbaaadc15f3'), true);
  assert.equal(isValidUuid('E58ED763-928C-4155-BEE9-FDBAAADC15F3'), true);
  assert.equal(isValidUuid('  e58ed763-928c-4155-bee9-fdbaaadc15f3  '), true);

  assert.equal(isValidUuid(''), false);
  assert.equal(isValidUuid('not-a-uuid'), false);
  assert.equal(isValidUuid('e58ed763-928c-4155-bee9-fdbaaadc15f'), false);
  assert.equal(isValidUuid('e58ed763-928c-4155-bee9-fdbaaadc15f33'), false);
  assert.equal(isValidUuid(null), false);
  assert.equal(isValidUuid(undefined), false);
});

test('parseYear: parsing tahun rilis', () => {
  assert.equal(parseYear(1998), 1998);
  assert.equal(parseYear('1998'), 1998);
  assert.equal(parseYear(' 2024 '), 2024);
  assert.equal(parseYear(''), null);
  assert.equal(parseYear(null), null);
  assert.equal(parseYear(undefined), null);
  assert.equal(parseYear('bukan-tahun'), null);
});

test('parseRuntime: parsing durasi film', () => {
  assert.equal(parseRuntime(103), 103);
  assert.equal(parseRuntime('103'), 103);
  assert.equal(parseRuntime(' 81 '), 81);
  assert.equal(parseRuntime(0), null);
  assert.equal(parseRuntime(-10), null);
  assert.equal(parseRuntime(''), null);
  assert.equal(parseRuntime(null), null);
  assert.equal(parseRuntime('abc'), null);
});

test('isValidWatchUrl: validasi tautan tontonan', () => {
  assert.equal(isValidWatchUrl('https://example.com/watch'), true);
  assert.equal(isValidWatchUrl('http://example.com/watch'), true);
  assert.equal(isValidWatchUrl(''), true);
  assert.equal(isValidWatchUrl(null), true);
  assert.equal(isValidWatchUrl(undefined), true);

  assert.equal(isValidWatchUrl('ftp://example.com'), false);
  assert.equal(isValidWatchUrl('javascript:alert(1)'), false);
  assert.equal(isValidWatchUrl('www.example.com'), false);
  assert.equal(isValidWatchUrl('https://' + 'a'.repeat(2045)), false);
});

test('validateMovieInput: validasi data film baru', () => {
  const valid = validateMovieInput({
    title: '  The Truman Show  ',
    moods: ['Reflektif'],
    watchUrl: 'https://example.com/truman',
    year: '1998',
    runtime: '103',
  });

  assert.equal(valid.cleanTitle, 'The Truman Show');
  assert.equal(valid.cleanUrl, 'https://example.com/truman');
  assert.equal(valid.yearNum, 1998);
  assert.equal(valid.runtimeNum, 103);

  // Judul kosong
  assert.throws(
    () => validateMovieInput({ title: '   ', moods: ['Gelap'] }),
    /Judul wajib diisi/
  );

  // Judul > 200 karakter
  assert.throws(
    () => validateMovieInput({ title: 'A'.repeat(201), moods: ['Gelap'] }),
    /Judul maksimal 200 karakter/
  );

  // Mood kosong
  assert.throws(
    () => validateMovieInput({ title: 'Film Test', moods: [] }),
    /Pilih minimal satu mood/
  );

  // URL tidak valid
  assert.throws(
    () => validateMovieInput({ title: 'Film Test', moods: ['Gelap'], watchUrl: 'javascript:void(0)' }),
    /Tautan harus diawali http:\/\/ atau https:\/\//
  );

  // Tahun rilis di luar rentang (1870-2100)
  assert.throws(
    () => validateMovieInput({ title: 'Film Test', moods: ['Gelap'], year: 1800 }),
    /Tahun rilis harus antara 1870 sampai 2100/
  );
  assert.throws(
    () => validateMovieInput({ title: 'Film Test', moods: ['Gelap'], year: 2150 }),
    /Tahun rilis harus antara 1870 sampai 2100/
  );
});

test('validateWatchLogInput: validasi rating dan potensi', () => {
  const valid = validateWatchLogInput(8, 9);
  assert.equal(valid.validRating, 8);
  assert.equal(valid.validPotential, 9);

  // Nilai kosong
  assert.throws(
    () => validateWatchLogInput(null, 9),
    /Isi rating dan potensi konten dulu/
  );
  assert.throws(
    () => validateWatchLogInput(8, null),
    /Isi rating dan potensi konten dulu/
  );

  // Rating di luar rentang
  assert.throws(
    () => validateWatchLogInput(0, 5),
    /Rating harus antara 1 sampai 10/
  );
  assert.throws(
    () => validateWatchLogInput(11, 5),
    /Rating harus antara 1 sampai 10/
  );

  // Potensi di luar rentang
  assert.throws(
    () => validateWatchLogInput(5, 0),
    /Potensi konten harus antara 1 sampai 10/
  );
  assert.throws(
    () => validateWatchLogInput(5, 11),
    /Potensi konten harus antara 1 sampai 10/
  );
});

test('validateMoodName: validasi nama mood', () => {
  assert.equal(validateMoodName('  Psikologis  '), 'Psikologis');
  assert.equal(validateMoodName('A'), 'A');
  assert.equal(validateMoodName('A'.repeat(24)), 'A'.repeat(24));

  assert.throws(() => validateMoodName(''), /Nama mood harus antara 1 sampai 24 karakter/);
  assert.throws(() => validateMoodName('   '), /Nama mood harus antara 1 sampai 24 karakter/);
  assert.throws(() => validateMoodName('A'.repeat(25)), /Nama mood harus antara 1 sampai 24 karakter/);
});

test('generateMoodSlug: pembuatan slug mood', () => {
  assert.equal(generateMoodSlug('Psikologis'), 'psikologis');
  assert.equal(generateMoodSlug('Coming of Age'), 'coming-of-age');
  assert.equal(generateMoodSlug('  Gelap & Intens  '), 'gelap-intens');
  assert.equal(generateMoodSlug('Film-Noir 2024'), 'film-noir-2024');

  // Karakter simbolik saja -> fallback acak unik berawalan 'mood-'
  const fallback = generateMoodSlug('!!!');
  assert.match(fallback, /^mood-[a-z0-9]+$/);
});

test('extractMoodNames: transformasi relasi mood dari Supabase', () => {
  const rawJoin = [
    { moods: { id: 'm1', name: 'Psikologis' } },
    { moods: { id: 'm2', name: 'Gelap' } },
  ];
  assert.deepEqual(extractMoodNames(rawJoin), ['Psikologis', 'Gelap']);

  assert.deepEqual(extractMoodNames(null), []);
  assert.deepEqual(extractMoodNames([]), []);
  assert.deepEqual(extractMoodNames('invalid'), []);
});

test('extractWatchLog: transformasi relasi catatan tonton dari Supabase', () => {
  const rawLog = [
    {
      movie_rating: 9,
      content_potential: 8,
      theme: 'Obsesi',
      scene: 'Latihan drum',
      angle: 'Kapan ambisi jadi racun?',
      notes: 'Bahan video 60 detik',
    },
  ];

  const extracted = extractWatchLog(rawLog);
  assert.deepEqual(extracted, {
    rating: 9,
    contentPotential: 8,
    theme: 'Obsesi',
    scene: 'Latihan drum',
    angle: 'Kapan ambisi jadi racun?',
    notes: 'Bahan video 60 detik',
  });

  assert.equal(extractWatchLog(null), undefined);
  assert.equal(extractWatchLog([]), undefined);
  assert.equal(extractWatchLog([{ movie_rating: null, content_potential: 8 }]), undefined);
});

test('mapMovieRpcError: pemetaan error RPC film', () => {
  assert.equal(mapMovieRpcError({ code: '23505' }), 'Film ini sudah ada di Kabin.');
  assert.equal(mapMovieRpcError({ message: 'duplicate key value' }), 'Film ini sudah ada di Kabin.');
  assert.equal(mapMovieRpcError({ message: 'movies_user_tmdb_unique' }), 'Film ini sudah ada di Kabin.');
  assert.equal(mapMovieRpcError({ message: 'Pilih minimal satu mood yang valid' }), 'Pilih minimal satu mood.');
  assert.equal(mapMovieRpcError({ message: 'database timeout' }), 'Gagal menyimpan film ke database.');
  assert.equal(mapMovieRpcError(null), 'Gagal memproses film.');
});

test('mapMoodRpcError: pemetaan error RPC mood', () => {
  assert.equal(mapMoodRpcError({ code: '23505' }), 'Mood dengan nama ini sudah ada.');
  assert.equal(mapMoodRpcError({ message: 'unique constraint moods_user_slug_unique' }), 'Mood dengan nama ini sudah ada.');
  assert.equal(mapMoodRpcError({ message: 'network error' }), 'Gagal menambahkan mood baru.');
  assert.equal(mapMoodRpcError(null), 'Gagal memproses mood.');
});

test('mapWatchLogRpcError: pemetaan error RPC watch log', () => {
  assert.equal(mapWatchLogRpcError({ message: 'Rating harus antara 1 sampai 10' }), 'Isi rating dan potensi konten dulu.');
  assert.equal(mapWatchLogRpcError({ message: 'Potensi konten harus antara 1 sampai 10' }), 'Isi rating dan potensi konten dulu.');
  assert.equal(mapWatchLogRpcError({ message: 'connection dropped' }), 'Gagal menyimpan catatan.');
  assert.equal(mapWatchLogRpcError(null), 'Gagal menyimpan catatan.');
});
