import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT_DIR = process.cwd();

test('Phase 14.3 UI: Route files exist and export default page components', () => {
  const routes = [
    'src/app/journal/page.tsx',
    'src/app/journal/archive/page.tsx',
    'src/app/journal/new/page.tsx',
    'src/app/journal/[id]/page.tsx',
    'src/app/journal/[id]/edit/page.tsx',
  ];

  for (const relPath of routes) {
    const fullPath = path.join(ROOT_DIR, relPath);
    assert.ok(fs.existsSync(fullPath), `Route file should exist: ${relPath}`);
    const content = fs.readFileSync(fullPath, 'utf8');
    assert.match(
      content,
      /export default async function\s+[A-Za-z0-9_]+/,
      `Route ${relPath} must export a default async page component`
    );
    assert.match(
      content,
      /export const metadata|export async function generateMetadata/,
      `Route ${relPath} must define Next.js metadata`
    );
  }
});

test('Phase 14.3 UI: Journal UI component files exist', () => {
  const components = [
    'src/components/views/journal/JournalListView.tsx',
    'src/components/views/journal/JournalDetailView.tsx',
    'src/components/views/journal/JournalEditorView.tsx',
    'src/components/views/journal/JournalCard.tsx',
    'src/components/views/journal/MoodSelector.tsx',
    'src/components/views/journal/MovieAttachmentDrawer.tsx',
  ];

  for (const relPath of components) {
    const fullPath = path.join(ROOT_DIR, relPath);
    assert.ok(fs.existsSync(fullPath), `Component file should exist: ${relPath}`);
    const content = fs.readFileSync(fullPath, 'utf8');
    assert.ok(content.includes("'use client'"), `${relPath} must be a client component`);
  }
});

test('Phase 14.3 UI: Mood presets integrity (8 agreed presets)', () => {
  const moodFile = path.join(ROOT_DIR, 'src/components/views/journal/MoodSelector.tsx');
  const content = fs.readFileSync(moodFile, 'utf8');

  const expectedMoods = [
    'Melankolis',
    'Kontemplatif',
    'Nostalgia',
    'Tenang',
    'Resah',
    'Hangat',
    'Puitis',
    'Soliter',
  ];

  for (const mood of expectedMoods) {
    assert.ok(
      content.includes(mood),
      `MoodSelector must contain preset mood: ${mood}`
    );
  }

  assert.ok(
    content.includes('export function MoodBadge'),
    'MoodSelector must export MoodBadge helper'
  );
  assert.ok(
    content.includes('Semua Mood'),
    'MoodSelector should support clearing mood with "Semua Mood"'
  );
});

test('Phase 14.3 UI: JournalCard component renders metadata, badges, and attached movie pill', () => {
  const cardFile = path.join(ROOT_DIR, 'src/components/views/journal/JournalCard.tsx');
  const content = fs.readFileSync(cardFile, 'utf8');

  assert.ok(content.includes('data-testid="journal-card"'), 'JournalCard must declare data-testid');
  assert.ok(content.includes('data-testid="badge-draft"'), 'JournalCard must declare draft badge');
  assert.ok(content.includes('data-testid="badge-published"'), 'JournalCard must declare published badge');
  assert.ok(content.includes('data-testid="journal-movie-pill"'), 'JournalCard must declare movie pill');
  assert.ok(content.includes('data-testid="journal-tags"'), 'JournalCard must declare tags container');

  // Verify Retro VHS font tokens
  assert.ok(content.includes('font-serif'), 'JournalCard title must use Fraunces font-serif');
  assert.ok(content.includes('font-pixel'), 'JournalCard OSD badges must use Silkscreen font-pixel');
  assert.ok(content.includes('font-sans'), 'JournalCard body excerpt must use DM Sans font-sans');

  // Reading stats
  assert.ok(content.includes('kata'), 'JournalCard must display word count');
  assert.ok(content.includes('mnt baca') || content.includes('menit'), 'JournalCard must display reading time estimate');
});

test('Phase 14.3 UI: JournalListView supports both stream and archive modes with filters and EmptyState', () => {
  const listFile = path.join(ROOT_DIR, 'src/components/views/journal/JournalListView.tsx');
  const content = fs.readFileSync(listFile, 'utf8');

  assert.ok(content.includes('EmptyState'), 'JournalListView must import EmptyState component');
  assert.ok(content.includes('FilmStripDivider'), 'JournalListView must import FilmStripDivider component');
  assert.ok(content.includes('MoodSelector'), 'JournalListView must import MoodSelector');
  assert.ok(content.includes('JournalCard'), 'JournalListView must render JournalCard items');

  // Modes
  assert.ok(content.includes("mode === 'stream'"), 'JournalListView must support stream mode');
  assert.ok(content.includes("mode === 'archive'") || content.includes("mode !== 'archive'"), 'JournalListView must support archive mode');

  // Filter criteria
  assert.ok(content.includes('search'), 'JournalListView must support search filter');
  assert.ok(content.includes('selectedMood'), 'JournalListView must support mood filter');
  assert.ok(content.includes('statusFilter'), 'JournalListView must support draft/published status filter');
  assert.ok(content.includes('dateFilter'), 'JournalListView must support date filter');
  assert.ok(content.includes('yearFilter'), 'JournalListView must support year filter for archive mode');
});

test('Phase 14.3 UI: JournalDetailView provides editorial reading experience, movie cards, and ConfirmInline deletion', () => {
  const detailFile = path.join(ROOT_DIR, 'src/components/views/journal/JournalDetailView.tsx');
  const content = fs.readFileSync(detailFile, 'utf8');

  assert.ok(content.includes('max-w-[760px]'), 'JournalDetailView must enforce max-width for reading measure');
  assert.ok(content.includes('font-serif'), 'JournalDetailView must use Fraunces font-serif for editorial heading');
  assert.ok(content.includes('PosterCover'), 'JournalDetailView must render PosterCover for attached movies');
  assert.ok(content.includes('resonanceNote'), 'JournalDetailView must render curator resonance notes');
  assert.ok(content.includes('ConfirmInline'), 'JournalDetailView must use ConfirmInline for safe deletion');
  assert.ok(content.includes('deleteJournalAction'), 'JournalDetailView must call deleteJournalAction');
});

test('Phase 14.3 UI: JournalEditorView implements hybrid distraction-free writing canvas and metadata drawer', () => {
  const editorFile = path.join(ROOT_DIR, 'src/components/views/journal/JournalEditorView.tsx');
  const content = fs.readFileSync(editorFile, 'utf8');

  // Hybrid editor components
  assert.ok(content.includes('journal-title'), 'Editor must contain title input');
  assert.ok(content.includes('journal-content'), 'Editor must contain content textarea');
  assert.ok(content.includes('MovieAttachmentDrawer'), 'Editor must integrate MovieAttachmentDrawer');
  assert.ok(content.includes('MoodSelector'), 'Editor must integrate MoodSelector');

  // Actions
  assert.ok(content.includes('createJournalAction'), 'Editor must call createJournalAction');
  assert.ok(content.includes('updateJournalAction'), 'Editor must call updateJournalAction');
  assert.ok(content.includes('attachMovieAction'), 'Editor must call attachMovieAction');
  assert.ok(content.includes('removeMovieAction'), 'Editor must call removeMovieAction');

  // Draft vs Published buttons
  assert.ok(content.includes('Simpan Draf'), 'Editor must offer Save Draft action');
  assert.ok(content.includes('Publikasikan Jurnal'), 'Editor must offer Publish Journal action');

  // Feedback
  assert.ok(content.includes('useToast'), 'Editor must provide toast notifications');
});

test('Phase 14.3 UI: MovieAttachmentDrawer supports search, autocomplete selection, and resonance notes', () => {
  const drawerFile = path.join(ROOT_DIR, 'src/components/views/journal/MovieAttachmentDrawer.tsx');
  const content = fs.readFileSync(drawerFile, 'utf8');

  assert.ok(content.includes('selectedMovieId'), 'Drawer must handle selectedMovieId');
  assert.ok(content.includes('resonanceNote'), 'Drawer must handle resonanceNote');
  assert.ok(content.includes('500'), 'Drawer must enforce 500 characters max for resonance notes');
  assert.ok(content.includes('onSelectMovie'), 'Drawer must provide onSelectMovie callback');
  assert.ok(content.includes('onChangeResonanceNote'), 'Drawer must provide onChangeResonanceNote callback');
});

test('Phase 14.3/14.5 Scope: BottomNav maintains 5 slots and Header includes brand identity', () => {
  const headerFile = path.join(ROOT_DIR, 'src/components/Header.tsx');
  const bottomNavFile = path.join(ROOT_DIR, 'src/components/BottomNav.tsx');

  const headerContent = fs.readFileSync(headerFile, 'utf8');
  const bottomNavContent = fs.readFileSync(bottomNavFile, 'utf8');

  // BottomNav maintains 5 slots
  assert.ok(bottomNavContent.includes('grid-cols-5'), 'BottomNav must maintain exactly 5 slots');
  assert.ok(headerContent.includes('logo-horizontal.webp'), 'Header must render brand logo');
});

test('Phase 14.3 Strict Scope: Database migrations must remain untouched', () => {
  const migrationsDir = path.join(ROOT_DIR, 'supabase/migrations');
  const migrationFiles = fs.readdirSync(migrationsDir);

  // Exactly 4 migrations: 3 original + 1 from Phase 14.1
  assert.equal(
    migrationFiles.length,
    4,
    'There should be exactly 4 migration files in supabase/migrations'
  );
  assert.ok(
    migrationFiles.includes('20261108000000_phase14_journal_and_notes.sql'),
    'Phase 14.1 migration must exist'
  );
});
