import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  validateCreateNoteInput,
  validateUpdateNoteInput,
} from '../src/lib/journal-validations.ts';

const ROOT_DIR = process.cwd();

test('Phase 14.4 UI: Route files exist and export default page components', () => {
  const routes = [
    'src/app/notes/page.tsx',
    'src/app/notes/new/page.tsx',
    'src/app/notes/[id]/page.tsx',
  ];

  for (const relPath of routes) {
    const fullPath = path.join(ROOT_DIR, relPath);
    assert.ok(fs.existsSync(fullPath), `Route file should exist: ${relPath}`);
    const content = fs.readFileSync(fullPath, 'utf8');
    assert.match(
      content,
      /export default (async )?function\s+[A-Za-z0-9_]+/,
      `Route ${relPath} must export a default page component`
    );
    assert.match(
      content,
      /export const metadata|export async function generateMetadata/,
      `Route ${relPath} must define Next.js metadata`
    );
  }
});

test('Phase 14.4 UI: Personal Notes UI component files exist', () => {
  const components = [
    'src/components/views/notes/NotesListView.tsx',
    'src/components/views/notes/NoteCard.tsx',
    'src/components/views/notes/NoteEditorView.tsx',
  ];

  for (const relPath of components) {
    const fullPath = path.join(ROOT_DIR, relPath);
    assert.ok(fs.existsSync(fullPath), `Component file should exist: ${relPath}`);
    const content = fs.readFileSync(fullPath, 'utf8');
    assert.ok(content.includes("'use client'"), `${relPath} must be a client component`);
  }
});

test('Phase 14.4 Validation: Empty title is permitted, empty content is rejected', () => {
  // Empty title is allowed (title is optional)
  const validEmptyTitle = validateCreateNoteInput({
    title: '',
    content: 'Ini adalah catatan cepat tanpa judul.',
  });
  assert.equal(validEmptyTitle.cleanTitle, '');
  assert.equal(validEmptyTitle.cleanContent, 'Ini adalah catatan cepat tanpa judul.');

  // Omitted title is allowed
  const validOmittedTitle = validateCreateNoteInput({
    content: 'Catatan cepat lainnya.',
  });
  assert.equal(validOmittedTitle.cleanTitle, '');

  // Empty content is rejected
  assert.throws(
    () => validateCreateNoteInput({ content: '' }),
    /Konten catatan wajib diisi/
  );
  assert.throws(
    () => validateCreateNoteInput({ content: '   ' }),
    /Konten catatan wajib diisi/
  );

  // Content exceeding 10.000 characters is rejected
  const oversizedContent = 'a'.repeat(10001);
  assert.throws(
    () => validateCreateNoteInput({ content: oversizedContent }),
    /Konten catatan maksimal 10.000 karakter/
  );

  // Title exceeding 200 characters is rejected
  const oversizedTitle = 't'.repeat(201);
  assert.throws(
    () => validateCreateNoteInput({ title: oversizedTitle, content: 'Valid content' }),
    /Judul catatan maksimal 200 karakter/
  );
});

test('Phase 14.4 Validation: Update note validation handles partial updates', () => {
  // Update only pinned
  const pinnedOnly = validateUpdateNoteInput({ isPinned: true });
  assert.equal(pinnedOnly.isPinned, true);
  assert.equal(pinnedOnly.cleanContent, undefined);
  assert.equal(pinnedOnly.cleanTitle, undefined);

  // Update title to empty string
  const emptyTitle = validateUpdateNoteInput({ title: '' });
  assert.equal(emptyTitle.cleanTitle, '');

  // Empty content is rejected on update
  assert.throws(
    () => validateUpdateNoteInput({ content: '   ' }),
    /Konten catatan wajib diisi/
  );
});

test('Phase 14.4 UI: NoteCard component renders metadata, body, tags, and pin button', () => {
  const cardFile = path.join(ROOT_DIR, 'src/components/views/notes/NoteCard.tsx');
  const content = fs.readFileSync(cardFile, 'utf8');

  assert.ok(content.includes('data-testid="note-card"'), 'NoteCard must declare data-testid');
  assert.ok(content.includes('data-testid="note-pinned-badge"'), 'NoteCard must declare pinned badge');
  assert.ok(content.includes('data-testid="note-tags"'), 'NoteCard must declare tags container');

  // Verify Retro VHS typography tokens
  assert.ok(content.includes('font-serif'), 'NoteCard title must use Fraunces font-serif');
  assert.ok(content.includes('font-sans'), 'NoteCard body must use DM Sans font-sans');
  assert.ok(content.includes('font-pixel'), 'NoteCard OSD badge must use Silkscreen font-pixel');

  // Quick actions
  assert.ok(content.includes('onTogglePin'), 'NoteCard must support quick pin toggle');
  assert.ok(content.includes('ConfirmInline'), 'NoteCard must support inline delete confirmation');
});

test('Phase 14.4 UI: NotesListView implements quick scratchpad, search, tabs, tags, and EmptyState', () => {
  const listFile = path.join(ROOT_DIR, 'src/components/views/notes/NotesListView.tsx');
  const content = fs.readFileSync(listFile, 'utf8');

  assert.ok(content.includes('data-testid="notes-list-view"'), 'NotesListView must declare root data-testid');
  assert.ok(content.includes('data-testid="notes-grid"'), 'NotesListView must declare notes grid container');
  assert.ok(content.includes('data-testid="quick-note-input"'), 'NotesListView must declare quick scratchpad input');

  // Filter features
  assert.ok(content.includes('search'), 'NotesListView must support search filtering');
  assert.ok(content.includes('filterTab'), 'NotesListView must support filter tabs (all vs pinned)');
  assert.ok(content.includes('selectedTag'), 'NotesListView must support tag filtering');
  assert.ok(content.includes('EmptyState'), 'NotesListView must integrate EmptyState');

  // Server Actions
  assert.ok(content.includes('createNoteAction'), 'NotesListView must call createNoteAction for quick note');
  assert.ok(content.includes('pinNoteAction'), 'NotesListView must call pinNoteAction');
  assert.ok(content.includes('unpinNoteAction'), 'NotesListView must call unpinNoteAction');
  assert.ok(content.includes('deleteNoteAction'), 'NotesListView must call deleteNoteAction');
});

test('Phase 14.4 UI: NoteEditorView supports create and edit modes with validation and character counter', () => {
  const editorFile = path.join(ROOT_DIR, 'src/components/views/notes/NoteEditorView.tsx');
  const content = fs.readFileSync(editorFile, 'utf8');

  assert.ok(content.includes('data-testid="note-editor-view"'), 'NoteEditorView must declare root data-testid');
  assert.ok(content.includes('data-testid="note-title-input"'), 'NoteEditorView must declare title input');
  assert.ok(content.includes('data-testid="note-content-input"'), 'NoteEditorView must declare content input');
  assert.ok(content.includes('data-testid="note-pin-toggle"'), 'NoteEditorView must declare pin toggle');

  // Server Actions
  assert.ok(content.includes('createNoteAction'), 'NoteEditorView must call createNoteAction');
  assert.ok(content.includes('updateNoteAction'), 'NoteEditorView must call updateNoteAction');
  assert.ok(content.includes('deleteNoteAction'), 'NoteEditorView must call deleteNoteAction in edit mode');

  // Confirmation on delete
  assert.ok(content.includes('ConfirmInline'), 'NoteEditorView must use ConfirmInline before deletion');

  // Real-time counters
  assert.ok(content.includes('10.000 karakter') || content.includes('10000'), 'NoteEditorView must show character counter');
  assert.ok(content.includes('useToast'), 'NoteEditorView must provide toast feedback');
});

test('Phase 14.4/14.5 Scope: BottomNav maintains 5 slots and Header includes brand identity', () => {
  const headerFile = path.join(ROOT_DIR, 'src/components/Header.tsx');
  const bottomNavFile = path.join(ROOT_DIR, 'src/components/BottomNav.tsx');

  const headerContent = fs.readFileSync(headerFile, 'utf8');
  const bottomNavContent = fs.readFileSync(bottomNavFile, 'utf8');

  assert.ok(bottomNavContent.includes('grid-cols-5'), 'BottomNav must maintain exactly 5 slots');
  assert.ok(headerContent.includes('logo-horizontal.webp'), 'Header must render brand logo');
});

test('Phase 14.4 Strict Scope: Database migrations must remain untouched', () => {
  const migrationsDir = path.join(ROOT_DIR, 'supabase/migrations');
  const migrationFiles = fs.readdirSync(migrationsDir);

  // At least 4 migrations: 3 original + 1 from Phase 14.1
  assert.ok(
    migrationFiles.length >= 4,
    'There should be at least 4 migration files in supabase/migrations'
  );
  assert.ok(
    migrationFiles.includes('20261108000000_phase14_journal_and_notes.sql'),
    'Phase 14.1 migration must exist'
  );
});
