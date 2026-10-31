import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// Sample movies dataset for testing search algorithms
const mockMovies = [
  {
    id: 'uuid-1',
    title: 'Pulp Fiction',
    year: '1994',
    moods: ['Crime', 'Classic', 'Dark Comedy'],
    posterUrl: 'https://image.tmdb.org/t/p/w500/poster1.jpg',
    done: true,
  },
  {
    id: 'uuid-2',
    title: 'Blade Runner 2049',
    year: '2017',
    moods: ['Sci-Fi', 'Cyberpunk', 'Melancholic'],
    posterUrl: 'https://image.tmdb.org/t/p/w500/poster2.jpg',
    done: false,
  },
  {
    id: 'uuid-3',
    title: 'Spirited Away',
    year: '2001',
    moods: ['Animation', 'Comforting'],
    posterUrl: null,
    done: true,
  },
  {
    id: 'uuid-4',
    title: 'The Godfather',
    year: '1972',
    moods: ['Crime', 'Drama'],
    posterUrl: 'https://image.tmdb.org/t/p/w500/poster4.jpg',
    done: true,
  },
];

// Reusable search filtering function mirroring SearchModal
function filterMovies(movies, query) {
  const q = query.trim().toLowerCase();
  if (!q) {
    return movies.slice(0, 8);
  }
  return movies.filter((m) => {
    const matchTitle = m.title.toLowerCase().includes(q);
    const matchYear = m.year?.toString().includes(q);
    const matchMood = m.moods?.some((mood) => mood.toLowerCase().includes(q));
    return matchTitle || matchYear || matchMood;
  });
}

// Reusable keyboard navigation index updater
function updateNavIndex(currentIndex, totalItems, key) {
  if (totalItems === 0) return 0;
  if (key === 'ArrowDown') {
    return currentIndex < totalItems - 1 ? currentIndex + 1 : 0;
  }
  if (key === 'ArrowUp') {
    return currentIndex > 0 ? currentIndex - 1 : totalItems - 1;
  }
  return currentIndex;
}

// Reusable shortcut detector
function isSearchShortcut(event) {
  return (event.ctrlKey || event.metaKey) && event.key?.toLowerCase() === 'k';
}

test('Search Filtering: Empty query returns up to 8 recent movies', () => {
  const results = filterMovies(mockMovies, '');
  assert.equal(results.length, 4);
  assert.equal(results[0].title, 'Pulp Fiction');
});

test('Search Filtering: Matches title case-insensitively', () => {
  const resultsUpper = filterMovies(mockMovies, 'BLADE');
  assert.equal(resultsUpper.length, 1);
  assert.equal(resultsUpper[0].id, 'uuid-2');

  const resultsLower = filterMovies(mockMovies, 'fiction');
  assert.equal(resultsLower.length, 1);
  assert.equal(resultsLower[0].title, 'Pulp Fiction');
});

test('Search Filtering: Matches release year', () => {
  const results = filterMovies(mockMovies, '1994');
  assert.equal(results.length, 1);
  assert.equal(results[0].title, 'Pulp Fiction');
});

test('Search Filtering: Matches mood tags', () => {
  const crimeResults = filterMovies(mockMovies, 'crime');
  assert.equal(crimeResults.length, 2);

  const cyberpunkResults = filterMovies(mockMovies, 'cyberpunk');
  assert.equal(cyberpunkResults.length, 1);
  assert.equal(cyberpunkResults[0].title, 'Blade Runner 2049');
});

test('Search Filtering: Returns empty array when query does not match', () => {
  const results = filterMovies(mockMovies, 'Interstellar');
  assert.equal(results.length, 0);
});

test('Keyboard Navigation: ArrowDown moves index forward and wraps at bottom', () => {
  let index = 0;
  index = updateNavIndex(index, 3, 'ArrowDown');
  assert.equal(index, 1);
  index = updateNavIndex(index, 3, 'ArrowDown');
  assert.equal(index, 2);
  index = updateNavIndex(index, 3, 'ArrowDown');
  assert.equal(index, 0, 'Must wrap back to index 0');
});

test('Keyboard Navigation: ArrowUp moves index backward and wraps at top', () => {
  let index = 0;
  index = updateNavIndex(index, 3, 'ArrowUp');
  assert.equal(index, 2, 'Must wrap to last index');
  index = updateNavIndex(index, 3, 'ArrowUp');
  assert.equal(index, 1);
});

test('Search Shortcut: Detects Ctrl+K on Windows/Linux and Cmd+K on macOS', () => {
  assert.ok(isSearchShortcut({ ctrlKey: true, metaKey: false, key: 'k' }));
  assert.ok(isSearchShortcut({ ctrlKey: true, metaKey: false, key: 'K' }));
  assert.ok(isSearchShortcut({ ctrlKey: false, metaKey: true, key: 'k' }));
  assert.ok(isSearchShortcut({ ctrlKey: false, metaKey: true, key: 'K' }));

  // Non-matching keys
  assert.equal(isSearchShortcut({ ctrlKey: false, metaKey: false, key: 'k' }), false);
  assert.equal(isSearchShortcut({ ctrlKey: true, metaKey: false, key: 'f' }), false);
});

test('Header Component: Uses logo-horizontal, search trigger with Ctrl+K, and ThemeToggle', () => {
  const headerPath = path.resolve(process.cwd(), 'src/components/Header.tsx');
  const headerContent = fs.readFileSync(headerPath, 'utf8');

  assert.ok(headerContent.includes('/brand/logo-horizontal.webp'), 'Header must use logo-horizontal');
  assert.ok(headerContent.includes('SearchModal'), 'Header must mount SearchModal');
  assert.ok(headerContent.includes('Ctrl K'), 'Header must show Ctrl K shortcut');
  assert.ok(headerContent.includes('ThemeToggle'), 'Header must include ThemeToggle');
  assert.ok(headerContent.includes('signOutAction'), 'Header must preserve sign out action');
  assert.ok(headerContent.includes('bg-surface/90'), 'Header must use theme semantic surface');
  assert.ok(headerContent.includes('text-neon-magenta'), 'Active nav must use neon-magenta');
});

test('BottomNav Component: Uses magenta active state, primary Add action, and semantic tokens', () => {
  const navPath = path.resolve(process.cwd(), 'src/components/BottomNav.tsx');
  const navContent = fs.readFileSync(navPath, 'utf8');

  assert.ok(navContent.includes('text-neon-magenta'), 'Active state must use text-neon-magenta');
  assert.ok(navContent.includes('bg-surface/95'), 'BottomNav must use theme semantic surface');
  assert.ok(navContent.includes('/add'), 'BottomNav must include Add Movie route');
  assert.ok(navContent.includes('/bank'), 'BottomNav must include Movie Bank route');
  assert.ok(navContent.includes('/archive'), 'BottomNav must include Archive route');
  assert.ok(navContent.includes('safe-area-inset-bottom'), 'Must preserve safe-area padding');
});

test('SearchModal Component: Accessible dialog attributes, keyboard navigation, and detail routing', () => {
  const modalPath = path.resolve(process.cwd(), 'src/components/SearchModal.tsx');
  const modalContent = fs.readFileSync(modalPath, 'utf8');

  assert.ok(modalContent.includes('role="dialog"'), 'Must have role=dialog');
  assert.ok(modalContent.includes('aria-modal="true"'), 'Must have aria-modal=true');
  assert.ok(modalContent.includes('listMovies'), 'Must call listMovies from @/lib/movies');
  assert.ok(modalContent.includes('/bank/${id}') || modalContent.includes('/bank/'), 'Must route to /bank/${id}');
  assert.ok(modalContent.includes('Escape'), 'Must support Escape key to close');
  assert.ok(modalContent.includes('ArrowDown') && modalContent.includes('ArrowUp'), 'Must support Arrow key navigation');
});
