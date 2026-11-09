import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('1. ProfileView: Contains all 3 shortcuts with correct hrefs, labels, and touch targets', () => {
  const profilePath = path.resolve(process.cwd(), 'src/components/views/ProfileView.tsx');
  assert.ok(fs.existsSync(profilePath), 'ProfileView.tsx must exist');

  const content = fs.readFileSync(profilePath, 'utf8');

  // Verify Section Title
  assert.ok(
    content.includes('Ruang Tulis & Refleksi Sinema'),
    'ProfileView must have "Ruang Tulis & Refleksi Sinema" section'
  );

  // Shortcut 1: My Journal
  assert.ok(
    content.includes('href="/journal"'),
    'ProfileView must link to /journal'
  );
  assert.ok(
    content.includes('My Journal'),
    'ProfileView must display My Journal title'
  );
  assert.ok(
    content.includes('data-testid="profile-shortcut-journal"'),
    'ProfileView must have data-testid for journal shortcut'
  );

  // Shortcut 2: Chronicle Vault
  assert.ok(
    content.includes('href="/journal/archive"'),
    'ProfileView must link to /journal/archive'
  );
  assert.ok(
    content.includes('Chronicle Vault'),
    'ProfileView must display Chronicle Vault title'
  );
  assert.ok(
    content.includes('data-testid="profile-shortcut-vault"'),
    'ProfileView must have data-testid for vault shortcut'
  );

  // Shortcut 3: Personal Notes
  assert.ok(
    content.includes('href="/notes"'),
    'ProfileView must link to /notes'
  );
  assert.ok(
    content.includes('Personal Notes'),
    'ProfileView must display Personal Notes title'
  );
  assert.ok(
    content.includes('data-testid="profile-shortcut-notes"'),
    'ProfileView must have data-testid for notes shortcut'
  );

  // Touch targets >= 44px
  assert.ok(
    content.includes('min-h-[52px]') || content.includes('min-h-[44px]'),
    'Shortcuts must satisfy >= 44px touch targets'
  );
});

test('2. CreationDrawer: Contains secondary link to /journal with >= 44px touch target', () => {
  const drawerPath = path.resolve(process.cwd(), 'src/components/CreationDrawer.tsx');
  assert.ok(fs.existsSync(drawerPath), 'CreationDrawer.tsx must exist');

  const content = fs.readFileSync(drawerPath, 'utf8');

  // Verify secondary link exists
  assert.ok(
    content.includes('href="/journal"'),
    'CreationDrawer must contain link to /journal'
  );
  assert.ok(
    content.includes('Buka Jurnal Saya'),
    'CreationDrawer must contain "Buka Jurnal Saya" text'
  );
  assert.ok(
    content.includes('Ingin membaca tulisan sebelumnya?'),
    'CreationDrawer must have secondary prompt text'
  );
  assert.ok(
    content.includes('data-testid="drawer-link-journal"'),
    'CreationDrawer must have data-testid for journal link'
  );

  // Preserves 3 primary creation actions
  assert.ok(content.includes('data-testid="action-add-movie"'), 'Action 1 Add Movie preserved');
  assert.ok(content.includes('data-testid="action-new-journal"'), 'Action 2 New Journal preserved');
  assert.ok(content.includes('data-testid="action-new-note"'), 'Action 3 Quick Note preserved');

  // Touch target >= 44px
  assert.ok(
    content.includes('min-h-[44px]'),
    'Secondary link must have min-h-[44px] touch envelope'
  );
});

test('3. Footer: Contains quick links to /journal and /notes while preserving existing layout', () => {
  const footerPath = path.resolve(process.cwd(), 'src/components/Footer.tsx');
  assert.ok(fs.existsSync(footerPath), 'Footer.tsx must exist');

  const content = fs.readFileSync(footerPath, 'utf8');

  // Verify quick links exist
  assert.ok(content.includes('href="/journal"'), 'Footer must link to /journal');
  assert.ok(content.includes('href="/notes"'), 'Footer must link to /notes');

  // Verify all previous links are preserved
  assert.ok(content.includes('href="/"'), 'Footer must preserve Home link');
  assert.ok(content.includes('href="/bank"'), 'Footer must preserve Bank link');
  assert.ok(content.includes('href="/archive"'), 'Footer must preserve Archive link');
  assert.ok(content.includes('href="/add"'), 'Footer must preserve Add Movie link');

  // Safe area bottom padding preserved
  assert.ok(
    content.includes('safe-area-inset-bottom'),
    'Footer must preserve mobile safe-area padding'
  );
});

test('4. BottomNav: Retains exactly 5 navigation slots and is completely unmodified', () => {
  const navPath = path.resolve(process.cwd(), 'src/components/BottomNav.tsx');
  assert.ok(fs.existsSync(navPath), 'BottomNav.tsx must exist');

  const content = fs.readFileSync(navPath, 'utf8');

  // Exactly 5 slots
  assert.ok(content.includes('grid-cols-5'), 'BottomNav must use grid-cols-5');
  assert.ok(content.includes('data-testid="bottomnav-home"'), 'Slot 1: Home');
  assert.ok(content.includes('data-testid="bottomnav-bank"'), 'Slot 2: Bank');
  assert.ok(content.includes('data-testid="bottomnav-creation-trigger"'), 'Slot 3: Create (+)');
  assert.ok(content.includes('data-testid="bottomnav-archive"'), 'Slot 4: Archive');
  assert.ok(content.includes('data-testid="bottomnav-profile"'), 'Slot 5: Profile');
});

test('5. Route Preservation: All previous route endpoints remain intact', () => {
  const routes = [
    'src/app/page.tsx',
    'src/app/bank/page.tsx',
    'src/app/bank/[id]/page.tsx',
    'src/app/archive/page.tsx',
    'src/app/journal/page.tsx',
    'src/app/journal/archive/page.tsx',
    'src/app/journal/new/page.tsx',
    'src/app/journal/[id]/page.tsx',
    'src/app/notes/page.tsx',
    'src/app/notes/new/page.tsx',
    'src/app/notes/[id]/page.tsx',
    'src/app/profile/page.tsx',
    'src/app/add/page.tsx',
  ];

  for (const route of routes) {
    const fullPath = path.resolve(process.cwd(), route);
    assert.ok(fs.existsSync(fullPath), `Route file ${route} must exist`);
  }
});
