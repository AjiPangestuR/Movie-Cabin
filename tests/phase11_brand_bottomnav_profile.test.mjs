import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('Brand Asset: Official avatar-paw.webp exists with authentic user dimensions and format', () => {
  const assetPath = path.resolve(process.cwd(), 'public/brand/avatar-paw.webp');
  assert.ok(fs.existsSync(assetPath), 'public/brand/avatar-paw.webp must exist');

  const buf = fs.readFileSync(assetPath);
  assert.ok(buf.length > 0, 'Asset file must not be empty');
  assert.equal(buf.toString('ascii', 0, 4), 'RIFF', 'Asset must have RIFF container');
  assert.equal(buf.toString('ascii', 8, 12), 'WEBP', 'Asset must be valid WebP');

  // Verify dimensions (48x54)
  const width = buf.readUInt16LE(26) & 0x3fff;
  const height = buf.readUInt16LE(28) & 0x3fff;
  assert.equal(width, 48, 'Asset width must match official 48px');
  assert.equal(height, 54, 'Asset height must match official 54px');
});

test('Brand Asset: All UI components reference /brand/avatar-paw.webp with object-contain and aspect-square', () => {
  const components = [
    'src/components/Footer.tsx',
    'src/components/EmptyState.tsx',
    'src/components/SearchModal.tsx',
    'src/components/views/HomeView.tsx',
    'src/components/views/ProfileView.tsx',
  ];

  for (const relPath of components) {
    const fullPath = path.resolve(process.cwd(), relPath);
    assert.ok(fs.existsSync(fullPath), `${relPath} must exist`);

    const content = fs.readFileSync(fullPath, 'utf8');
    assert.ok(content.includes('/brand/avatar-paw.webp'), `${relPath} must reference /brand/avatar-paw.webp`);
    assert.ok(content.includes('object-contain'), `${relPath} must use object-contain for paw image`);
    assert.ok(content.includes('aspect-square'), `${relPath} must enforce aspect-square container`);
  }
});

test('BottomNav Component: Implements 5-slot navigation with centered floating Add button', () => {
  const navPath = path.resolve(process.cwd(), 'src/components/BottomNav.tsx');
  const navContent = fs.readFileSync(navPath, 'utf8');

  // Check 5 routes present
  assert.ok(navContent.includes('href="/"'), 'Must contain Home route');
  assert.ok(navContent.includes('href="/bank"'), 'Must contain Bank route');
  assert.ok(navContent.includes('href="/add"'), 'Must contain Add Movie route');
  assert.ok(navContent.includes('href="/archive"'), 'Must contain Archive route');
  assert.ok(navContent.includes('href="/profile"'), 'Must contain Profile route');

  // Check labels
  assert.ok(navContent.includes('>Home<') || navContent.includes('<span>Home</span>'), 'Must contain Home label');
  assert.ok(navContent.includes('>Bank<') || navContent.includes('<span>Bank</span>'), 'Must contain Bank label');
  assert.ok(navContent.includes('>Archive<') || navContent.includes('<span>Archive</span>'), 'Must contain Archive label');
  assert.ok(navContent.includes('>Profil<') || navContent.includes('<span>Profil</span>'), 'Must contain Profil label');

  // Layout distribution: grid-cols-5
  assert.ok(navContent.includes('grid-cols-5'), 'Must use 5-column balanced grid distribution');

  // Centered Floating Add button
  assert.ok(navContent.includes('-mt-5'), 'Add button must be elevated as floating action button');
  assert.ok(navContent.includes('rounded-full'), 'Add button must be rounded circular');
  assert.ok(navContent.includes('bg-gradient-to-tr from-primary to-neon-magenta'), 'Add button must have primary gradient');

  // Minimum touch target 44px
  assert.ok(navContent.includes('min-h-[44px]'), 'Items must enforce min 44px touch target');

  // Safe area padding
  assert.ok(navContent.includes('safe-area-inset-bottom'), 'Must preserve safe area inset bottom');

  // Active state
  assert.ok(navContent.includes('text-neon-magenta font-semibold'), 'Active state must use text-neon-magenta');
});

test('Profile Route & ProfileView: Implements account identity, collection stats, ThemeToggle, and logout', () => {
  const pagePath = path.resolve(process.cwd(), 'src/app/profile/page.tsx');
  assert.ok(fs.existsSync(pagePath), 'Profile page route must exist');
  const pageContent = fs.readFileSync(pagePath, 'utf8');

  assert.ok(pageContent.includes('createClient'), 'Profile page must create Supabase server client');
  assert.ok(pageContent.includes('getUser'), 'Profile page must verify user session via auth.getUser()');
  assert.ok(pageContent.includes('listMovies'), 'Profile page must call existing listMovies service');
  assert.ok(pageContent.includes('listMoods'), 'Profile page must call existing listMoods service');
  assert.ok(pageContent.includes('<ProfileView'), 'Profile page must render ProfileView component');

  const viewPath = path.resolve(process.cwd(), 'src/components/views/ProfileView.tsx');
  assert.ok(fs.existsSync(viewPath), 'ProfileView component must exist');
  const viewContent = fs.readFileSync(viewPath, 'utf8');

  // A. Account Identity
  assert.ok(viewContent.includes('{userEmail'), 'Must render user email from active session');
  assert.ok(viewContent.includes('BERUANG SASTRA'), 'Must state Beruang Sastra identity');
  assert.ok(viewContent.includes('avatar-paw.webp'), 'Must render Beruang Sastra paw avatar');

  // B. Collection Statistics
  assert.ok(viewContent.includes('totalMovies'), 'Must compute total movies');
  assert.ok(viewContent.includes('watchedCount'), 'Must compute watched count');
  assert.ok(viewContent.includes('totalMoods'), 'Must display available moods count');

  // C. Appearance
  assert.ok(viewContent.includes('<ThemeToggle />') || viewContent.includes('<ThemeToggle'), 'Must integrate ThemeToggle');

  // D. About MOCAB
  assert.ok(viewContent.includes('Movie Cabin (MOCAB)'), 'Must include description of Movie Cabin');
  assert.ok(viewContent.includes('Retro VHS Cinema') || viewContent.includes('RETRO VHS CINEMA'), 'Must state Retro VHS Cinema identity');

  // E. Account Actions
  assert.ok(viewContent.includes('signOutAction'), 'Must use existing signOutAction');
  assert.ok(viewContent.includes('Keluar dari Akun') || viewContent.includes('Keluar'), 'Must offer logout button');

  // Zero hardcoded dark hex
  assert.ok(!viewContent.includes('#121017'), 'Must not hardcode dark hex #121017');
  assert.ok(!viewContent.includes('#0B0812'), 'Must not hardcode dark hex #0B0812');
});
