import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT_DIR = process.cwd();

test('Phase 15 Batch 1: Footer - BottomNav Clearance & TMDB Attribution', () => {
  const footerFile = path.join(ROOT_DIR, 'src/components/Footer.tsx');
  assert.ok(fs.existsSync(footerFile), 'Footer.tsx must exist');
  const content = fs.readFileSync(footerFile, 'utf8');

  // Verify mobile bottom padding clears fixed BottomNav
  assert.ok(
    content.includes('env(safe-area-inset-bottom)'),
    'Footer must respect safe-area-inset-bottom'
  );
  assert.ok(
    content.includes('pb-[calc(') && content.includes('md:pb-10'),
    'Footer must apply mobile bottom padding clearance and md:pb-10 desktop fallback'
  );

  // Verify TMDB attribution and links are preserved
  assert.ok(content.includes('TMDB API'), 'Footer must state TMDB API attribution');
  assert.ok(content.includes('https://www.themoviedb.org'), 'Footer must link to TMDB site');
  assert.ok(content.includes('avatar-paw.webp'), 'Footer must display Beruang Sastra paw stamp');
  assert.ok(content.includes('HI-FI STEREO'), 'Footer must maintain vintage OSD technical ledger');
});

test('Phase 15 Batch 1: Root Layout - Container Spacing Reconciled', () => {
  const layoutFile = path.join(ROOT_DIR, 'src/app/layout.tsx');
  assert.ok(fs.existsSync(layoutFile), 'layout.tsx must exist');
  const content = fs.readFileSync(layoutFile, 'utf8');

  // Verify RootLayout mounts Footer and BottomNav
  assert.ok(content.includes('<Footer />'), 'Root layout must include Footer');
  assert.ok(content.includes('<BottomNav />'), 'Root layout must include BottomNav');
  assert.ok(content.includes('id="app"'), 'Root layout must contain div#app');
});

test('Phase 15 Batch 1: BottomNav - 5 Slots, Active States, and Safe Areas', () => {
  const bottomNavFile = path.join(ROOT_DIR, 'src/components/BottomNav.tsx');
  assert.ok(fs.existsSync(bottomNavFile), 'BottomNav.tsx must exist');
  const content = fs.readFileSync(bottomNavFile, 'utf8');

  // Must maintain exactly 5 slots in grid
  assert.ok(content.includes('grid-cols-5'), 'BottomNav must maintain grid-cols-5');

  // Verify test IDs for the 5 slots
  assert.ok(content.includes('bottomnav-home'), 'BottomNav must contain bottomnav-home');
  assert.ok(content.includes('bottomnav-bank'), 'BottomNav must contain bottomnav-bank');
  assert.ok(content.includes('bottomnav-creation-trigger'), 'BottomNav must contain bottomnav-creation-trigger');
  assert.ok(content.includes('bottomnav-archive'), 'BottomNav must contain bottomnav-archive');
  assert.ok(content.includes('bottomnav-profile'), 'BottomNav must contain bottomnav-profile');

  // Safe area compliance
  assert.ok(content.includes('env(safe-area-inset-bottom)'), 'BottomNav must respect safe-area-inset-bottom');

  // Center button integration
  assert.ok(content.includes('CreationDrawer'), 'BottomNav must render CreationDrawer component');
  assert.ok(content.includes('aria-haspopup="dialog"'), 'Center button must declare aria-haspopup="dialog"');
  assert.ok(content.includes('aria-expanded={isDrawerOpen}'), 'Center button must declare aria-expanded attribute');
});

test('Phase 15 Batch 1: CreationDrawer - Actions, Gestures, and Focus Management', () => {
  const drawerFile = path.join(ROOT_DIR, 'src/components/CreationDrawer.tsx');
  assert.ok(fs.existsSync(drawerFile), 'CreationDrawer.tsx must exist');
  const content = fs.readFileSync(drawerFile, 'utf8');

  // Accessibility dialog attributes
  assert.ok(content.includes('role="dialog"'), 'CreationDrawer must declare role="dialog"');
  assert.ok(content.includes('aria-modal="true"'), 'CreationDrawer must declare aria-modal="true"');
  assert.ok(content.includes('aria-labelledby="creation-drawer-title"'), 'CreationDrawer must link title via aria-labelledby');

  // Exactly three actions preserved
  assert.ok(content.includes('data-testid="action-add-movie"'), 'Drawer must have action-add-movie');
  assert.ok(content.includes('data-testid="action-new-journal"'), 'Drawer must have action-new-journal');
  assert.ok(content.includes('data-testid="action-new-note"'), 'Drawer must have action-new-note');

  // Exact routes preserved
  assert.ok(content.includes('href="/add"'), 'Rekam Film Baru must link to /add');
  assert.ok(content.includes('href="/journal/new"'), 'Tulis Jurnal must link to /journal/new');
  assert.ok(content.includes('href="/notes/new"'), 'Catatan Cepat must link to /notes/new');

  // Dismissal mechanisms: close button, backdrop, Escape key, and touch drag-to-dismiss
  assert.ok(content.includes('data-testid="creation-drawer-close"'), 'Drawer must render close button');
  assert.ok(content.includes('data-testid="creation-drawer-backdrop"'), 'Drawer must render backdrop');
  assert.ok(content.includes("e.key === 'Escape'"), 'Drawer must listen for Escape key');
  assert.ok(content.includes('onTouchStart') && content.includes('onTouchEnd'), 'Drawer must support touch gestures');

  // Focus trap & focus restoration
  assert.ok(content.includes('firstActionRef.current?.focus()'), 'Drawer must focus first action upon opening');
  assert.ok(content.includes('previousActiveElement'), 'Drawer must track and restore previous active element on close');

  // Body scroll lock
  assert.ok(content.includes("overflow = 'hidden'"), 'Drawer must lock body scroll when open');
});
