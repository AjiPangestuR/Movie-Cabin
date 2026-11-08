import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT_DIR = process.cwd();

test('Phase 14.5 Navigation: 1. Desktop Header menampilkan Journal dan Notes', () => {
  const headerFile = path.join(ROOT_DIR, 'src/components/Header.tsx');
  assert.ok(fs.existsSync(headerFile), 'Header.tsx must exist');
  const content = fs.readFileSync(headerFile, 'utf8');

  // Verify navigation links for Journal and Notes exist
  assert.ok(content.includes('/journal'), 'Header.tsx must contain link to /journal');
  assert.ok(content.includes('/notes'), 'Header.tsx must contain link to /notes');

  // Verify labels
  assert.ok(
    content.includes('Journal') || content.includes('Catatan Harian'),
    'Header.tsx must label Journal navigation'
  );
  assert.ok(
    content.includes('Notes') || content.includes('Catatan Pribadi'),
    'Header.tsx must label Notes navigation'
  );

  // Verify data-testid attributes for testing
  assert.ok(content.includes('header-nav-'), 'Header must provide test id pattern for links');
  assert.ok(content.includes('/journal'), 'Header must contain /journal link');
  assert.ok(content.includes('/notes'), 'Header must contain /notes link');
});

test('Phase 14.5 Navigation: 2. BottomNav tetap memiliki lima slot', () => {
  const bottomNavFile = path.join(ROOT_DIR, 'src/components/BottomNav.tsx');
  assert.ok(fs.existsSync(bottomNavFile), 'BottomNav.tsx must exist');
  const content = fs.readFileSync(bottomNavFile, 'utf8');

  // Must maintain 5-column grid layout
  assert.ok(content.includes('grid-cols-5'), 'BottomNav must maintain exactly grid-cols-5');

  // Verify the 5 exact slots: Home, Bank, Center Trigger, Archive, Profile
  assert.ok(content.includes('bottomnav-home'), 'BottomNav must contain slot 1 (Home)');
  assert.ok(content.includes('bottomnav-bank'), 'BottomNav must contain slot 2 (Bank)');
  assert.ok(content.includes('bottomnav-creation-trigger'), 'BottomNav must contain slot 3 (Creation Trigger)');
  assert.ok(content.includes('bottomnav-archive'), 'BottomNav must contain slot 4 (Archive)');
  assert.ok(content.includes('bottomnav-profile'), 'BottomNav must contain slot 5 (Profile)');
});

test('Phase 14.5 Navigation: 3. Tombol tengah membuka Creation Drawer', () => {
  const bottomNavFile = path.join(ROOT_DIR, 'src/components/BottomNav.tsx');
  const content = fs.readFileSync(bottomNavFile, 'utf8');

  // Center button triggers drawer
  assert.ok(content.includes('setIsDrawerOpen'), 'Center button must control drawer open state');
  assert.ok(content.includes('CreationDrawer'), 'BottomNav must render CreationDrawer component');
  assert.ok(content.includes('aria-haspopup="dialog"'), 'Center button must declare aria-haspopup="dialog"');
  assert.ok(content.includes('aria-expanded={isDrawerOpen}'), 'Center button must declare aria-expanded attribute');
});

test('Phase 14.5 Navigation: 4, 5, 6, 7. Drawer memiliki tiga tindakan yang benar', () => {
  const drawerFile = path.join(ROOT_DIR, 'src/components/CreationDrawer.tsx');
  assert.ok(fs.existsSync(drawerFile), 'CreationDrawer.tsx must exist');
  const content = fs.readFileSync(drawerFile, 'utf8');

  // Exactly three actions present
  assert.ok(content.includes('data-testid="action-add-movie"'), 'Drawer must have action-add-movie');
  assert.ok(content.includes('data-testid="action-new-journal"'), 'Drawer must have action-new-journal');
  assert.ok(content.includes('data-testid="action-new-note"'), 'Drawer must have action-new-note');

  // Route 5: Rekam Film Baru menuju /add
  assert.ok(content.includes('href="/add"'), 'Rekam Film Baru must link to /add');
  assert.ok(content.includes('Rekam Film Baru'), 'Drawer must label Rekam Film Baru');

  // Route 6: Tulis Jurnal menuju /journal/new
  assert.ok(content.includes('href="/journal/new"'), 'Tulis Jurnal must link to /journal/new');
  assert.ok(content.includes('Tulis Jurnal'), 'Drawer must label Tulis Jurnal');

  // Route 7: Catatan Cepat menuju /notes/new
  assert.ok(content.includes('href="/notes/new"'), 'Catatan Cepat must link to /notes/new');
  assert.ok(content.includes('Catatan Cepat'), 'Drawer must label Catatan Cepat');
});

test('Phase 14.5 Navigation: 8, 9, 10. Drawer dapat ditutup melalui close button, backdrop, dan Escape', () => {
  const drawerFile = path.join(ROOT_DIR, 'src/components/CreationDrawer.tsx');
  const content = fs.readFileSync(drawerFile, 'utf8');

  // 8. Close button
  assert.ok(content.includes('data-testid="creation-drawer-close"'), 'Drawer must render close button');
  assert.ok(content.includes('aria-label="Tutup menu kreasi"'), 'Close button must have accessible label');

  // 9. Backdrop
  assert.ok(content.includes('data-testid="creation-drawer-backdrop"'), 'Drawer must render backdrop');
  assert.ok(content.includes('onClick={onClose}'), 'Backdrop click must invoke onClose');

  // 10. Escape key handler
  assert.ok(content.includes("e.key === 'Escape'"), 'Drawer must listen for Escape key');
  assert.ok(content.includes('window.addEventListener(\'keydown\''), 'Drawer must attach window keydown listener');
});

test('Phase 14.5 Navigation: 11, 12. Active state Journal & Notes bekerja dan tidak menimbulkan active state ganda', () => {
  const headerFile = path.join(ROOT_DIR, 'src/components/Header.tsx');
  const content = fs.readFileSync(headerFile, 'utf8');

  // Active state matching rules
  assert.ok(content.includes("pathname.startsWith('/journal')"), 'isJournal must match pathname.startsWith("/journal")');
  assert.ok(content.includes("pathname.startsWith('/notes')"), 'isNotes must match pathname.startsWith("/notes")');
  assert.ok(content.includes("pathname === '/archive'"), 'isArchive must use exact match so /journal/archive does NOT trigger it');
  assert.ok(content.includes("pathname === '/'"), 'isHome must use exact match');

  // Active styles use MOCAB magenta neon tokens
  assert.ok(content.includes('bg-neon-magenta/15'), 'Active link style must use neon-magenta token');
});

test('Phase 14.5 Navigation: 13. Existing navigation tidak rusak', () => {
  const headerFile = path.join(ROOT_DIR, 'src/components/Header.tsx');
  const content = fs.readFileSync(headerFile, 'utf8');

  // Existing links preserved
  assert.ok(content.includes("href: '/'"), 'Home link preserved');
  assert.ok(content.includes("href: '/bank'"), 'Movie Bank link preserved');
  assert.ok(content.includes("href: '/archive'"), 'Archive link preserved');

  // Existing right controls preserved
  assert.ok(content.includes('SearchModal'), 'SearchModal integration preserved');
  assert.ok(content.includes('ThemeToggle'), 'ThemeToggle integration preserved');
  assert.ok(content.includes('signOutAction'), 'Sign out action preserved');
  assert.ok(content.includes('href="/add"'), 'Quick Add button preserved');
});

test('Phase 14.5 Navigation: 14. Dark and light theme tokens are respected', () => {
  const drawerFile = path.join(ROOT_DIR, 'src/components/CreationDrawer.tsx');
  const content = fs.readFileSync(drawerFile, 'utf8');

  // Verifying semantic token usage
  assert.ok(content.includes('bg-surface-elevated'), 'Drawer must use semantic bg-surface-elevated');
  assert.ok(content.includes('border-line'), 'Drawer must use semantic border-line');
  assert.ok(content.includes('text-text'), 'Drawer must use semantic text-text');
  assert.ok(content.includes('text-muted'), 'Drawer must use semantic text-muted');
});

test('Phase 14.5 Navigation: 15. Responsive layout & accessibility behavior', () => {
  const drawerFile = path.join(ROOT_DIR, 'src/components/CreationDrawer.tsx');
  const bottomNavFile = path.join(ROOT_DIR, 'src/components/BottomNav.tsx');
  const drawerContent = fs.readFileSync(drawerFile, 'utf8');
  const bottomNavContent = fs.readFileSync(bottomNavFile, 'utf8');

  // Accessibility dialog attributes
  assert.ok(drawerContent.includes('role="dialog"'), 'CreationDrawer must declare role="dialog"');
  assert.ok(drawerContent.includes('aria-modal="true"'), 'CreationDrawer must declare aria-modal="true"');
  assert.ok(drawerContent.includes('aria-labelledby="creation-drawer-title"'), 'CreationDrawer must link title via aria-labelledby');

  // Body scroll lock
  assert.ok(drawerContent.includes('overflow = \'hidden\''), 'CreationDrawer must lock body scroll when open');

  // Safe area inset compliance
  assert.ok(bottomNavContent.includes('env(safe-area-inset-bottom)'), 'BottomNav must respect safe-area-inset-bottom');
  assert.ok(drawerContent.includes('env(safe-area-inset-bottom)'), 'CreationDrawer must respect safe-area-inset-bottom');
});
