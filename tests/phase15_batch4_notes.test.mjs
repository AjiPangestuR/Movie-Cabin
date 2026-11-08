import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('Batch 4 — NotesListView: Memo-board responsive grid, quick scratchpad, and horizontal tag scroller', () => {
  const filePath = path.resolve(process.cwd(), 'src/components/views/notes/NotesListView.tsx');
  const content = fs.readFileSync(filePath, 'utf8');

  // Quick Scratchpad
  assert.ok(content.includes('data-testid="quick-note-input"'), 'Must have quick scratchpad input');
  assert.ok(content.includes('Tangkap Ide Kilat'), 'Must have scratchpad section label');
  assert.ok(content.includes('+ Simpan Cepat'), 'Must have quick save button');

  // Memo-board responsive grid
  assert.ok(content.includes('data-testid="notes-grid"'), 'Must declare notes grid container');
  assert.ok(content.includes('grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'), 'Must use 1-col mobile, 2-col tablet, 3-col desktop memo board grid');

  // Horizontal tag scroller
  assert.ok(content.includes('overflow-x-auto'), 'Tag strip must scroll horizontally on mobile');
  assert.ok(content.includes('Hapus kata kunci pencarian'), 'Search input must have clear button');

  // Dynamic counts & filter tabs
  assert.ok(content.includes('stats.total'), 'Must display dynamic total notes count');
  assert.ok(content.includes('stats.pinned'), 'Must display dynamic pinned count');
  assert.ok(content.includes("filterTab === 'all'"), 'Must support filter all tab');
  assert.ok(content.includes("filterTab === 'pinned'"), 'Must support filter pinned tab');

  // Server actions preservation
  assert.ok(content.includes('createNoteAction'), 'Must call createNoteAction for quick note');
  assert.ok(content.includes('pinNoteAction'), 'Must call pinNoteAction');
  assert.ok(content.includes('unpinNoteAction'), 'Must call unpinNoteAction');
  assert.ok(content.includes('deleteNoteAction'), 'Must call deleteNoteAction');
});

test('Batch 4 — NoteEditorView: Mobile top save dock & keyboard-safe document flow', () => {
  const filePath = path.resolve(process.cwd(), 'src/components/views/notes/NoteEditorView.tsx');
  const content = fs.readFileSync(filePath, 'utf8');

  // Mobile Top Action Dock
  assert.ok(content.includes('flex sm:hidden items-center gap-2'), 'Must provide mobile top action dock');
  assert.ok(content.includes('Simpan Catatan'), 'Must provide Save Note action');

  // Hierarchy & Inputs
  assert.ok(content.includes('data-testid="note-title-input"'), 'Must have title input');
  assert.ok(content.includes('data-testid="note-content-input"'), 'Must have content textarea');
  assert.ok(content.includes('data-testid="note-pin-toggle"'), 'Must have pin status toggle');

  // Virtual keyboard safety: footer is in natural document flow (not fixed/sticky overlay)
  assert.ok(!content.includes('fixed bottom-0'), 'Must not have fixed bottom overlay colliding with keyboard');
  assert.ok(!content.includes('sticky bottom-0'), 'Must not have sticky bottom-0 colliding with keyboard');

  // Character counter
  assert.ok(content.includes('10.000 karakter'), 'Must display 10.000 character limit indicator');

  // Server actions
  assert.ok(content.includes('createNoteAction'), 'Must call createNoteAction');
  assert.ok(content.includes('updateNoteAction'), 'Must call updateNoteAction');
  assert.ok(content.includes('deleteNoteAction'), 'Must call deleteNoteAction in edit mode');
  assert.ok(content.includes('ConfirmInline'), 'Must use ConfirmInline for delete protection');
});

test('Batch 4 — NoteCard: WCAG 44px touch targets & data-testid integrity', () => {
  const filePath = path.resolve(process.cwd(), 'src/components/views/notes/NoteCard.tsx');
  const content = fs.readFileSync(filePath, 'utf8');

  // Touch target compliance
  assert.ok(content.includes('min-h-[44px]'), 'Buka Catatan action link must have min-h-[44px] touch envelope');

  // Data testids
  assert.ok(content.includes('data-testid="note-card"'), 'Must have note-card testid');
  assert.ok(content.includes('data-testid="note-pinned-badge"'), 'Must have note-pinned-badge testid');
  assert.ok(content.includes('data-testid="note-tags"'), 'Must have note-tags testid');

  // Actions
  assert.ok(content.includes('onTogglePin'), 'Must support pin toggle callback');
  assert.ok(content.includes('ConfirmInline'), 'Must use ConfirmInline for delete protection');

  // Typography tokens
  assert.ok(content.includes('font-serif'), 'Title must use Fraunces font-serif');
  assert.ok(content.includes('font-sans'), 'Body must use DM Sans font-sans');
  assert.ok(content.includes('font-pixel'), 'Badge must use Silkscreen font-pixel');
});
