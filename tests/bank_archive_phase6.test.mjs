import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// Sample movies dataset for Bank and Archive tests
const mockMovies = [
  {
    id: 'film-1',
    title: 'Apocalypse Now',
    year: 1979,
    done: true,
    moods: ['War', 'Psychological'],
    log: { rating: 9, contentPotential: 10, angle: 'Madness of imperialism', theme: 'Morality in war', scene: 'Ride of the Valkyries', notes: 'Visually stunning' },
  },
  {
    id: 'film-2',
    title: 'Chungking Express',
    year: 1994,
    done: false,
    moods: ['Romance', 'Melancholic'],
    log: null,
  },
  {
    id: 'film-3',
    title: 'Taxi Driver',
    year: 1976,
    done: true,
    moods: ['Crime', 'Psychological'],
    log: { rating: 8, contentPotential: 8, angle: 'Urban loneliness', theme: 'Alienation', scene: 'Mirror monologue', notes: 'Classic score' },
  },
  {
    id: 'film-4',
    title: '2001: A Space Odyssey',
    year: 1968,
    done: false,
    moods: ['Sci-Fi', 'Philosophical'],
    log: null,
  },
  {
    id: 'film-5',
    title: 'In the Mood for Love',
    year: 2000,
    done: true,
    moods: ['Romance'],
    log: null, // Watched but no log yet!
  },
];

// Reusable Bank filtering and sorting function
function filterAndSortBank(movies, { search = '', selectedMoods = [], status = 'all', sort = 'new' }) {
  const q = search.trim().toLowerCase();
  const filtered = movies.filter((m) => {
    const matchMood = selectedMoods.length === 0 || m.moods.some((mood) => selectedMoods.includes(mood));
    const matchStatus = status === 'all' || (status === 'yes' ? m.done : !m.done);
    const matchQuery = !q || m.title.toLowerCase().includes(q);
    return matchMood && matchStatus && matchQuery;
  });

  filtered.sort((a, b) => {
    if (sort === 'title') {
      return a.title.localeCompare(b.title);
    }
    if (sort === 'pot') {
      const pA = a.log?.contentPotential || 0;
      const pB = b.log?.contentPotential || 0;
      return pB - pA;
    }
    return 0;
  });

  return filtered;
}

test('Movie Bank: Filters by status (all, watched, unwatched)', () => {
  const all = filterAndSortBank(mockMovies, { status: 'all' });
  assert.equal(all.length, 5);

  const watched = filterAndSortBank(mockMovies, { status: 'yes' });
  assert.equal(watched.length, 3);
  assert.ok(watched.every((m) => m.done));

  const unwatched = filterAndSortBank(mockMovies, { status: 'no' });
  assert.equal(unwatched.length, 2);
  assert.ok(unwatched.every((m) => !m.done));
});

test('Movie Bank: Filters by mood tags', () => {
  const psych = filterAndSortBank(mockMovies, { selectedMoods: ['Psychological'] });
  assert.equal(psych.length, 2);
  assert.deepEqual(psych.map((m) => m.id), ['film-1', 'film-3']);

  const sciFi = filterAndSortBank(mockMovies, { selectedMoods: ['Sci-Fi'] });
  assert.equal(sciFi.length, 1);
  assert.equal(sciFi[0].title, '2001: A Space Odyssey');
});

test('Movie Bank: Sorts by title and content potential', () => {
  const byTitle = filterAndSortBank(mockMovies, { sort: 'title' });
  assert.equal(byTitle[0].title, '2001: A Space Odyssey');
  assert.equal(byTitle[4].title, 'Taxi Driver');

  const byPot = filterAndSortBank(mockMovies, { sort: 'pot' });
  assert.equal(byPot[0].title, 'Apocalypse Now'); // pot 10
  assert.equal(byPot[1].title, 'Taxi Driver'); // pot 8
});

test('Archive: Filters only watched movies with logs and sorts by potential descending', () => {
  const archived = mockMovies
    .filter((m) => m.done && m.log)
    .sort((a, b) => (b.log?.contentPotential || 0) - (a.log?.contentPotential || 0));

  assert.equal(archived.length, 2, 'Must only include watched films that have logs');
  assert.equal(archived[0].title, 'Apocalypse Now');
  assert.equal(archived[0].log?.contentPotential, 10);
  assert.equal(archived[1].title, 'Taxi Driver');
  assert.equal(archived[1].log?.contentPotential, 8);
});

test('BankView Component: Implements responsive grid and Retro VHS styling', () => {
  const filePath = path.resolve(process.cwd(), 'src/components/views/BankView.tsx');
  const content = fs.readFileSync(filePath, 'utf8');

  assert.ok(content.includes('LIBRARY CATALOG'), 'Must have library catalog badge');
  assert.ok(content.includes('grid-cols-2'), 'Must support mobile 2 cols');
  assert.ok(content.includes('lg:grid-cols-5 xl:grid-cols-6'), 'Must support desktop 5-6 cols');
  assert.ok(content.includes('MovieCard'), 'Must render MovieCard');
  assert.ok(content.includes('STATUS_OPTIONS'), 'Must support status options');
  assert.ok(!content.includes('#121017'), 'Must not hardcode dark hex #121017');
});

test('ArchiveView Component: Implements dossier layout, PosterCover, and research fields', () => {
  const filePath = path.resolve(process.cwd(), 'src/components/views/ArchiveView.tsx');
  const content = fs.readFileSync(filePath, 'utf8');

  assert.ok(content.includes('DOSSIER ARCHIVE'), 'Must have dossier archive badge');
  assert.ok(content.includes('PosterCover'), 'Must render PosterCover');
  assert.ok(content.includes('ANGLE KONTEN'), 'Must display angle konten field');
  assert.ok(content.includes('TEMA SENTRAL:'), 'Must display theme field');
  assert.ok(content.includes('ADEGAN MEMBEKAS:'), 'Must display scene field');
  assert.ok(content.includes('Edit Catatan Riset'), 'Must provide link to edit notes');
  assert.ok(!content.includes('#121017'), 'Must not hardcode dark hex #121017');
});
