import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('Batch 3 — JournalEditorView: Keyboard-safe top actions & relative document-flow bar on mobile', () => {
  const filePath = path.resolve(process.cwd(), 'src/components/views/journal/JournalEditorView.tsx');
  const content = fs.readFileSync(filePath, 'utf8');

  // Mobile Top Action Bar (Keyboard-safe)
  assert.ok(content.includes('flex sm:hidden items-center gap-2'), 'Must have mobile-specific top action bar');
  assert.ok(content.includes('Simpan Draf'), 'Must provide Save Draft action');
  assert.ok(content.includes('Publikasikan Jurnal'), 'Must provide Publish Journal action');

  // Virtual keyboard collision prevention: relative on mobile, sticky on desktop
  assert.ok(
    content.includes('relative mt-8 sm:sticky sm:bottom-4'),
    'Bottom action bar must be relative on mobile and sticky on sm+ to prevent virtual keyboard collision'
  );

  // Form controls & Hybrid writing canvas
  assert.ok(content.includes('id="journal-title"'), 'Editor must have title input');
  assert.ok(content.includes('id="journal-content"'), 'Editor must have content textarea');
  assert.ok(content.includes('MoodSelector'), 'Editor must integrate MoodSelector');
  assert.ok(content.includes('MovieAttachmentDrawer'), 'Editor must integrate MovieAttachmentDrawer');

  // Server actions preservation
  assert.ok(content.includes('createJournalAction'), 'Must call createJournalAction');
  assert.ok(content.includes('updateJournalAction'), 'Must call updateJournalAction');
  assert.ok(content.includes('attachMovieAction'), 'Must call attachMovieAction');
  assert.ok(content.includes('removeMovieAction'), 'Must call removeMovieAction');

  // Word count & read time indicator
  assert.ok(content.includes('words'), 'Must compute word count');
  assert.ok(content.includes('minutes'), 'Must compute reading minutes');
});

test('Batch 3 — JournalListView: Compact filter density, horizontal mood scroller, & stream/archive modes', () => {
  const filePath = path.resolve(process.cwd(), 'src/components/views/journal/JournalListView.tsx');
  const content = fs.readFileSync(filePath, 'utf8');

  // Horizontal mood scroller preventing vertical bloat
  assert.ok(content.includes('overflow-x-auto'), 'Must support horizontal scrolling for mood/tags on mobile');
  assert.ok(content.includes('flex-nowrap sm:flex-wrap'), 'Mood selector must be single-row on mobile and wrap on desktop');

  // Compact search & clear
  assert.ok(content.includes('Cari dalam judul, renungan, atau hashtag...'), 'Must retain search placeholder');
  assert.ok(content.includes('Hapus kata kunci pencarian'), 'Must provide instant clear button for search input');

  // Stream & Archive mode separation
  assert.ok(content.includes("mode === 'stream'"), 'Must handle stream mode');
  assert.ok(content.includes("mode === 'archive'"), 'Must handle archive mode');
  assert.ok(content.includes('data-testid="journal-stream-list"'), 'Must have stream list container');
  assert.ok(content.includes('data-testid="journal-archive-groups"'), 'Must have archive groups container');

  // Dynamic counts
  assert.ok(content.includes('stats.total'), 'Must display dynamic total entries');
  assert.ok(content.includes('stats.published'), 'Must display dynamic published count');

  // Filter criteria
  assert.ok(content.includes('dateFilter'), 'Must support date filtering in stream mode');
  assert.ok(content.includes('yearFilter'), 'Must support year filtering in archive mode');
  assert.ok(content.includes('selectedMood'), 'Must support mood filter state');
  assert.ok(content.includes('statusFilter'), 'Must support status filter state');
});

test('Batch 3 — JournalCard: WCAG 44x44px touch targets & data-testid preservation', () => {
  const filePath = path.resolve(process.cwd(), 'src/components/views/journal/JournalCard.tsx');
  const content = fs.readFileSync(filePath, 'utf8');

  // WCAG touch targets (min-h-[44px])
  assert.ok(content.includes('min-h-[44px]'), 'Actions must declare minimum 44px touch envelope');

  // Preserved data-testid attributes
  assert.ok(content.includes('data-testid="journal-card"'), 'Must preserve journal-card testid');
  assert.ok(content.includes('data-testid="badge-draft"'), 'Must preserve draft badge testid');
  assert.ok(content.includes('data-testid="badge-published"'), 'Must preserve published badge testid');
  assert.ok(content.includes('data-testid="journal-movie-pill"'), 'Must preserve movie pill testid');
  assert.ok(content.includes('data-testid="journal-tags"'), 'Must preserve tags testid');

  // Typography tokens
  assert.ok(content.includes('font-serif'), 'Must use Fraunces serif for titles');
  assert.ok(content.includes('font-pixel'), 'Must use Silkscreen pixel for OSD badges');
  assert.ok(content.includes('font-sans'), 'Must use DM Sans for prose excerpts');
});

test('Batch 3 — MoodSelector: Non-wrapping chip pills for safe horizontal scrolling', () => {
  const filePath = path.resolve(process.cwd(), 'src/components/views/journal/MoodSelector.tsx');
  const content = fs.readFileSync(filePath, 'utf8');

  // Non-wrapping flex-none pills
  assert.ok(content.includes('flex-none'), 'Mood buttons must have flex-none to prevent squishing');
  assert.ok(content.includes('whitespace-nowrap'), 'Mood buttons must have whitespace-nowrap');
  assert.ok(content.includes('Semua Mood'), 'Must support clearing mood selection');
});
