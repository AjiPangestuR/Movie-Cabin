import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('Consolidation 1: Related Journals Data Flow to MovieDetailView', () => {
  const pagePath = path.resolve(process.cwd(), 'src/app/bank/[id]/page.tsx');
  const journalPath = path.resolve(process.cwd(), 'src/lib/journal.ts');
  const viewPath = path.resolve(process.cwd(), 'src/components/views/MovieDetailView.tsx');

  const pageContent = fs.readFileSync(pagePath, 'utf8');
  const journalContent = fs.readFileSync(journalPath, 'utf8');
  const viewContent = fs.readFileSync(viewPath, 'utf8');

  // 1. Data service export
  assert.ok(
    journalContent.includes('export async function getRelatedJournalsForMovie'),
    'src/lib/journal.ts must export getRelatedJournalsForMovie'
  );
  assert.ok(
    journalContent.includes('journal_movie_relations'),
    'getRelatedJournalsForMovie must query journal_movie_relations table'
  );
  assert.ok(
    journalContent.includes('journal_entries'),
    'getRelatedJournalsForMovie must join journal_entries'
  );

  // 2. Server Page integration
  assert.ok(
    pageContent.includes('getRelatedJournalsForMovie'),
    'bank/[id]/page.tsx must import getRelatedJournalsForMovie'
  );
  assert.ok(
    pageContent.includes('relatedJournals={relatedJournals}'),
    'bank/[id]/page.tsx must pass relatedJournals prop to MovieDetailView'
  );

  // 3. Client View conditional rendering
  assert.ok(
    viewContent.includes('relatedJournals && relatedJournals.length > 0'),
    'MovieDetailView must conditionally render journal section only when items exist'
  );
  assert.ok(
    viewContent.includes('Journal Kurator'),
    'MovieDetailView must render Journal Kurator header'
  );
  assert.ok(
    viewContent.includes('/journal/${entry.id}'),
    'MovieDetailView must link to /journal/${entry.id}'
  );
});

test('Consolidation 2: Multi-Category Global Search (Journey D)', () => {
  const modalPath = path.resolve(process.cwd(), 'src/components/SearchModal.tsx');
  const modalContent = fs.readFileSync(modalPath, 'utf8');

  // Verify multi-domain imports
  assert.ok(modalContent.includes('listMovies'), 'SearchModal must import listMovies');
  assert.ok(modalContent.includes('listJournals'), 'SearchModal must import listJournals');
  assert.ok(modalContent.includes('listNotes'), 'SearchModal must import listNotes');

  // Verify category tabs
  assert.ok(modalContent.includes("role=\"tablist\""), 'SearchModal must have role=tablist');
  assert.ok(modalContent.includes("'all'"), 'SearchModal must support all category');
  assert.ok(modalContent.includes("'movies'"), 'SearchModal must support movies category');
  assert.ok(modalContent.includes("'journals'"), 'SearchModal must support journals category');
  assert.ok(modalContent.includes("'notes'"), 'SearchModal must support notes category');

  // Verify body content matching for Journals and Notes
  assert.ok(
    modalContent.includes('j.content.toLowerCase().includes(q)'),
    'SearchModal must search journal body content'
  );
  assert.ok(
    modalContent.includes('n.content.toLowerCase().includes(q)'),
    'SearchModal must search notes body content'
  );

  // Verify correct routing per category
  assert.ok(modalContent.includes('/bank/${m.id}') || modalContent.includes('/bank/${item.id}'), 'SearchModal routes movies to bank detail');
  assert.ok(modalContent.includes('/journal/${j.id}') || modalContent.includes('/journal/${item.id}'), 'SearchModal routes journals to journal detail');
  assert.ok(modalContent.includes('/notes/${n.id}') || modalContent.includes('/notes/${item.id}'), 'SearchModal routes notes to note detail');

  // Verify keyboard navigation & accessibility
  assert.ok(modalContent.includes('ArrowDown'), 'Must handle ArrowDown');
  assert.ok(modalContent.includes('ArrowUp'), 'Must handle ArrowUp');
  assert.ok(modalContent.includes('Enter'), 'Must handle Enter');
  assert.ok(modalContent.includes('Escape'), 'Must handle Escape');
  assert.ok(modalContent.includes('/brand/avatar-paw.webp'), 'Must render paw brand stamp');
  assert.ok(modalContent.includes('animate-pulse'), 'Must render animated OSD indicator');
});

test('Consolidation 3: Shared Shell & Navigation Alignment (Batch 1)', () => {
  const footerPath = path.resolve(process.cwd(), 'src/components/Footer.tsx');
  const navPath = path.resolve(process.cwd(), 'src/components/BottomNav.tsx');
  const drawerPath = path.resolve(process.cwd(), 'src/components/CreationDrawer.tsx');

  const footerContent = fs.readFileSync(footerPath, 'utf8');
  const navContent = fs.readFileSync(navPath, 'utf8');
  const drawerContent = fs.readFileSync(drawerPath, 'utf8');

  // Footer safe-area padding
  assert.ok(
    footerContent.includes('pb-[calc(96px+env(safe-area-inset-bottom))]') ||
    footerContent.includes('safe-area-inset-bottom'),
    'Footer must have safe bottom padding preventing BottomNav overlap'
  );

  // BottomNav 5 slots
  assert.ok(navContent.includes('/bank'), 'BottomNav has Bank slot');
  assert.ok(navContent.includes('/archive'), 'BottomNav has Archive slot');
  assert.ok(navContent.includes('/profile'), 'BottomNav has Profile slot');
  assert.ok(navContent.includes('setIsDrawerOpen'), 'BottomNav triggers CreationDrawer');

  // CreationDrawer actions
  assert.ok(drawerContent.includes('/add'), 'Drawer routes to /add');
  assert.ok(drawerContent.includes('/journal/new'), 'Drawer routes to /journal/new');
  assert.ok(drawerContent.includes('/notes/new'), 'Drawer routes to /notes/new');
  assert.ok(drawerContent.includes('role="dialog"'), 'Drawer has role=dialog');
  assert.ok(drawerContent.includes('aria-modal="true"'), 'Drawer has aria-modal=true');
});

test('Consolidation 4: Core Cinema Engine Responsive Quality (Batch 2)', () => {
  const homePath = path.resolve(process.cwd(), 'src/components/views/HomeView.tsx');
  const bankPath = path.resolve(process.cwd(), 'src/components/views/BankView.tsx');
  const movieCardPath = path.resolve(process.cwd(), 'src/components/MovieCard.tsx');

  const homeContent = fs.readFileSync(homePath, 'utf8');
  const bankContent = fs.readFileSync(bankPath, 'utf8');
  const movieCardContent = fs.readFileSync(movieCardPath, 'utf8');

  // Home snap carousel
  assert.ok(homeContent.includes('snap-x snap-mandatory'), 'HomeView has snap carousel');
  assert.ok(homeContent.includes('w-[82%]'), 'HomeView peek preview card width');

  // Bank 2-column mobile grid
  assert.ok(bankContent.includes('grid-cols-2'), 'BankView has 2 columns on mobile');
  assert.ok(bankContent.includes('gap-3 sm:gap-5'), 'BankView uses compact gap-3 on mobile');

  // MovieCard collision-free badges
  assert.ok(movieCardContent.includes('whitespace-nowrap'), 'MovieCard badges use whitespace-nowrap');
  assert.ok(movieCardContent.includes('text-[10px]'), 'MovieCard badges use compact font');
});

test('Consolidation 5: Personal Journal & Notes Suite Mobile Quality (Batches 3 & 4)', () => {
  const journalEditorPath = path.resolve(process.cwd(), 'src/components/views/journal/JournalEditorView.tsx');
  const noteEditorPath = path.resolve(process.cwd(), 'src/components/views/notes/NoteEditorView.tsx');
  const journalCardPath = path.resolve(process.cwd(), 'src/components/views/journal/JournalCard.tsx');
  const noteCardPath = path.resolve(process.cwd(), 'src/components/views/notes/NoteCard.tsx');

  const journalEditor = fs.readFileSync(journalEditorPath, 'utf8');
  const noteEditor = fs.readFileSync(noteEditorPath, 'utf8');
  const journalCard = fs.readFileSync(journalCardPath, 'utf8');
  const noteCard = fs.readFileSync(noteCardPath, 'utf8');

  // Top action docks avoiding keyboard collision (MOB-04)
  assert.ok(journalEditor.includes('Draf') && journalEditor.includes('Terbitkan'), 'Journal editor has top action dock');
  assert.ok(noteEditor.includes('Simpan Catatan') && noteEditor.includes('flex sm:hidden'), 'Note editor has mobile top action dock');

  // WCAG touch targets (MOB-08)
  assert.ok(journalCard.includes('min-h-[44px]'), 'JournalCard has 44px touch targets');
  assert.ok(noteCard.includes('min-h-[44px]'), 'NoteCard has 44px touch targets');
});
