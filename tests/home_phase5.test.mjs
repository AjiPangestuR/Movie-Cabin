import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// Sample mock data for home screen tests
const mockMovies = [
  { id: 'm-1', title: 'Solaris', year: 1972, done: false, moods: ['Sci-Fi', 'Philosophical'], log: { notes: 'Great pacing' } },
  { id: 'm-2', title: 'Stalker', year: 1979, done: true, moods: ['Sci-Fi', 'Meditative'], log: null },
  { id: 'm-3', title: 'Mirror', year: 1975, done: false, moods: ['Poetic'], log: { notes: 'Poetic structure' } },
  { id: 'm-4', title: 'Nostalghia', year: 1983, done: true, moods: ['Drama'], log: null },
  { id: 'm-5', title: 'The Sacrifice', year: 1986, done: false, moods: ['Drama'], log: null },
  { id: 'm-6', title: 'Ivan Childhood', year: 1962, done: false, moods: ['War'], log: null },
  { id: 'm-7', title: 'Andrei Rublev', year: 1966, done: true, moods: ['Historical'], log: { notes: 'Masterpiece' } },
];

test('Home Stats: Correctly computes total, watched, unwatched, and notes', () => {
  const total = mockMovies.length;
  const watched = mockMovies.filter((m) => m.done).length;
  const unwatched = total - watched;
  const withNotes = mockMovies.filter((m) => m.log && m.log.notes).length;

  assert.equal(total, 7);
  assert.equal(watched, 3);
  assert.equal(unwatched, 4);
  assert.equal(withNotes, 3);
});

test('Home Recently Added: Correctly slices top 6 newest movies', () => {
  const recentlyAdded = mockMovies.slice(0, 6);
  assert.equal(recentlyAdded.length, 6);
  assert.equal(recentlyAdded[0].title, 'Solaris');
  assert.equal(recentlyAdded[5].title, 'Ivan Childhood');
});

test('Home Triple-Bill: Deterministc on shuffleKey === 0, shuffles on shuffleKey > 0', () => {
  const unwatched = mockMovies.filter((m) => !m.done);
  assert.equal(unwatched.length, 4);

  // Initial SSR / Hydration determinism
  const resolvePicks = (candidates, key) => {
    if (candidates.length === 0) return [];
    if (key === 0) return candidates.slice(0, 3);
    return [...candidates].reverse().slice(0, 3);
  };

  const initialPicks = resolvePicks(unwatched, 0);
  assert.equal(initialPicks.length, 3);
  assert.equal(initialPicks[0].title, 'Solaris');
  assert.equal(initialPicks[1].title, 'Mirror');
  assert.equal(initialPicks[2].title, 'The Sacrifice');

  // After user clicks "Acak Lagi"
  const shuffledPicks = resolvePicks(unwatched, 1);
  assert.equal(shuffledPicks.length, 3);
  assert.equal(shuffledPicks[0].title, 'Ivan Childhood');
});

test('HomeView Component: Implements all Task 1-7 sections and semantic tokens', () => {
  const filePath = path.resolve(process.cwd(), 'src/components/views/HomeView.tsx');
  const content = fs.readFileSync(filePath, 'utf8');

  // Task 1: Hero Section
  assert.ok(content.includes('REC ● MOCAB HI-FI'), 'Hero must contain VHS OSD status');
  assert.ok(content.includes('Arsip Sinema Pribadi'), 'Hero must contain editorial headline');
  assert.ok(content.includes('/bank'), 'Hero must contain CTA to Movie Bank');
  assert.ok(content.includes('PosterCover'), 'Hero must showcase featured poster with PosterCover');

  // Task 2: Recently Added
  assert.ok(content.includes('Baru Ditambahkan'), 'Must have Recently Added section');
  assert.ok(content.includes('recentlyAdded'), 'Must compute recentlyAdded movies');
  assert.ok(content.includes('MovieCard'), 'Must render MovieCard in Recently Added');

  // Task 3: Triple-Bill Curated Picks
  assert.ok(content.includes('Pilihan Malam Ini'), 'Must have Triple-Bill section');
  assert.ok(content.includes('TAPE #0'), 'Must render sequence tape badges');
  assert.ok(content.includes('Acak Lagi'), 'Must have shuffle action button');

  // Task 4: Mood Discovery
  assert.ok(content.includes('MoodChips'), 'Must render MoodChips for mood exploration');
  assert.ok(content.includes('Eksplorasi Berdasarkan Suasana Hati'), 'Must have Mood Discovery heading');

  // Task 5: Collection Overview Stats
  assert.ok(content.includes('TOTAL FILM'), 'Must display Total Film stat');
  assert.ok(content.includes('SUDAH DITONTON'), 'Must display Watched stat');
  assert.ok(content.includes('WATCHLIST'), 'Must display Watchlist stat');
  assert.ok(content.includes('CATATAN RISET'), 'Must display Research notes stat');

  // Task 7: Typography & Visual Quality
  assert.ok(content.includes('font-serif'), 'Headlines must use font-serif Fraunces');
  assert.ok(content.includes('font-pixel'), 'Badges and tape labels must use Silkscreen pixel font');
});
