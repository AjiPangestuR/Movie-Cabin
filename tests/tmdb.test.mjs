import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseReleaseYear,
  buildPosterUrl,
  normalizeTmdbMovie,
  normalizeTmdbDetail,
  isTmdbConfigured,
  searchTmdbMovies,
  getTmdbMovieDetail,
} from '../src/lib/tmdb.ts';

test('parseReleaseYear: ekstraksi tahun dari string tanggal TMDB', () => {
  assert.equal(parseReleaseYear('1999-10-15'), 1999);
  assert.equal(parseReleaseYear('2024-03-01'), 2024);
  assert.equal(parseReleaseYear('1972'), 1972);

  assert.equal(parseReleaseYear(''), null);
  assert.equal(parseReleaseYear(null), null);
  assert.equal(parseReleaseYear(undefined), null);
  assert.equal(parseReleaseYear('bukan-tanggal'), null);
  assert.equal(parseReleaseYear('1800-01-01'), null); // < 1870
  assert.equal(parseReleaseYear('2150-01-01'), null); // > 2100
});

test('buildPosterUrl: pembentukan URL gambar poster TMDB', () => {
  assert.equal(
    buildPosterUrl('/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg', 'w500'),
    'https://image.tmdb.org/t/p/w500/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg'
  );
  assert.equal(
    buildPosterUrl('pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg', 'w342'),
    'https://image.tmdb.org/t/p/w342/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg'
  );

  assert.equal(buildPosterUrl(null), null);
  assert.equal(buildPosterUrl(undefined), null);
  assert.equal(buildPosterUrl(''), null);
  assert.equal(buildPosterUrl('   '), null);
});

test('normalizeTmdbMovie: transformasi data mentah pencarian TMDB', () => {
  const raw = {
    id: 550,
    title: 'Fight Club',
    original_title: 'Fight Club',
    release_date: '1999-10-15',
    overview: 'An insomniac office worker...',
    poster_path: '/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg',
    backdrop_path: '/hZkgoQYus5vegHoetLkCJzb17zJ.jpg',
    original_language: 'en',
    vote_average: 8.433,
  };

  const normalized = normalizeTmdbMovie(raw);

  assert.equal(normalized.tmdbId, 550);
  assert.equal(normalized.title, 'Fight Club');
  assert.equal(normalized.originalTitle, 'Fight Club');
  assert.equal(normalized.releaseDate, '1999-10-15');
  assert.equal(normalized.releaseYear, 1999);
  assert.equal(normalized.overview, 'An insomniac office worker...');
  assert.equal(normalized.posterPath, '/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg');
  assert.equal(
    normalized.posterUrl,
    'https://image.tmdb.org/t/p/w500/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg'
  );
  assert.equal(normalized.originalLanguage, 'en');
  assert.equal(normalized.voteAverage, 8.4);
});

test('normalizeTmdbDetail: transformasi detail film TMDB termasuk runtime & genres', () => {
  const raw = {
    id: 550,
    title: 'Fight Club',
    release_date: '1999-10-15',
    runtime: 139,
    overview: 'Sinopsis film...',
    poster_path: null,
    genres: [
      { id: 18, name: 'Drama' },
      { id: 53, name: 'Thriller' },
    ],
  };

  const detail = normalizeTmdbDetail(raw);

  assert.equal(detail.tmdbId, 550);
  assert.equal(detail.runtime, 139);
  assert.equal(detail.posterUrl, null);
  assert.deepEqual(detail.genres, ['Drama', 'Thriller']);
});

test('searchTmdbMovies: query kosong mengembalikan array kosong tanpa fetch', async () => {
  const emptyRes = await searchTmdbMovies('   ');
  assert.deepEqual(emptyRes.results, []);
  assert.equal(emptyRes.source, 'tmdb');
});

test('searchTmdbMovies: token belum diset mengembalikan source not_configured', async () => {
  const original = process.env.TMDB_API_READ_ACCESS_TOKEN;
  delete process.env.TMDB_API_READ_ACCESS_TOKEN;

  try {
    assert.equal(isTmdbConfigured(), false);
    const res = await searchTmdbMovies('Oppenheimer');
    assert.equal(res.source, 'not_configured');
    assert.equal(res.results.length, 0);
  } finally {
    if (original) process.env.TMDB_API_READ_ACCESS_TOKEN = original;
  }
});

test('getTmdbMovieDetail: validasi ID film tidak valid melempar error', async () => {
  await assert.rejects(() => getTmdbMovieDetail(0), /ID film TMDB tidak valid/);
  await assert.rejects(() => getTmdbMovieDetail(-5), /ID film TMDB tidak valid/);
  await assert.rejects(() => getTmdbMovieDetail(NaN), /ID film TMDB tidak valid/);
});
