import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('Paw Identity: EmptyState uses aspect-square container with object-contain and adequate padding', () => {
  const filePath = path.resolve(process.cwd(), 'src/components/EmptyState.tsx');
  const content = fs.readFileSync(filePath, 'utf8');

  assert.ok(content.includes('avatar-paw.webp'), 'EmptyState must reference avatar-paw.webp');
  assert.ok(content.includes('object-contain'), 'Paw image must use object-contain to prevent distortion');
  assert.ok(content.includes('aspect-square'), 'Paw container must enforce aspect-square');
  assert.ok(content.includes('p-1'), 'Paw container must include adequate padding to prevent boundary clipping');
  assert.ok(!content.includes('rounded-full bg-surface border border-line flex items-center justify-center p-0'), 'Must not tightly clip paw in unpadded circle');
});

test('Paw Identity: SearchModal uses aspect-square container with object-contain and adequate padding', () => {
  const filePath = path.resolve(process.cwd(), 'src/components/SearchModal.tsx');
  const content = fs.readFileSync(filePath, 'utf8');

  assert.ok(content.includes('avatar-paw.webp'), 'SearchModal must reference avatar-paw.webp');
  assert.ok(content.includes('object-contain'), 'Paw image must use object-contain');
  assert.ok(content.includes('aspect-square'), 'Paw container must enforce aspect-square');
  assert.ok(content.includes('p-1'), 'Paw container must include padding p-1');
});

test('Paw Identity: Footer uses aspect-square container with object-contain and padding', () => {
  const filePath = path.resolve(process.cwd(), 'src/components/Footer.tsx');
  const content = fs.readFileSync(filePath, 'utf8');

  assert.ok(content.includes('avatar-paw.webp'), 'Footer must reference avatar-paw.webp');
  assert.ok(content.includes('object-contain'), 'Paw image must use object-contain');
  assert.ok(content.includes('aspect-square'), 'Paw container must enforce aspect-square');
  assert.ok(content.includes('p-0.5'), 'Paw container must include padding p-0.5');
  assert.ok(content.includes('BERUANG SASTRA'), 'Footer must preserve BERUANG SASTRA brand text');
});

test('Paw Identity: HomeView research banner uses aspect-square container with object-contain and padding', () => {
  const filePath = path.resolve(process.cwd(), 'src/components/views/HomeView.tsx');
  const content = fs.readFileSync(filePath, 'utf8');

  assert.ok(content.includes('avatar-paw.webp'), 'HomeView must reference avatar-paw.webp');
  assert.ok(content.includes('object-contain'), 'Paw image must use object-contain');
  assert.ok(content.includes('aspect-square'), 'Paw container must enforce aspect-square');
  assert.ok(content.includes('p-0.5'), 'Paw container must include padding p-0.5');
  assert.ok(content.includes('RESEARCH COMPANION // BERUANG SASTRA'), 'HomeView must preserve Beruang Sastra research banner');
});

test('AddMovieView UX: Intake search collapses upon movie selection with active selection banner', () => {
  const filePath = path.resolve(process.cwd(), 'src/components/views/AddMovieView.tsx');
  const content = fs.readFileSync(filePath, 'utf8');

  // Search Intake is conditionally rendered when !selectedMovie
  assert.ok(content.includes('!selectedMovie ? ('), 'Intake search console must only render when no movie is selected');
  assert.ok(content.includes('1. Cari Judul Film'), 'Search step must have step 1 label');
  assert.ok(content.includes('HASIL PENCARIAN'), 'Must have search results section');
  assert.ok(content.includes('PILIH FILM'), 'Search result cards must provide explicit selection button');

  // Active selection banner is rendered when selectedMovie exists
  assert.ok(content.includes('Film Terpilih:'), 'Active selection banner must identify chosen movie');
  assert.ok(content.includes('handleResetSelection'), 'Must provide handler to reset/change selection');
  assert.ok(content.includes('Ganti film'), 'Active banner must offer Ganti film button');
});

test('AddMovieView UX: Smooth auto-scroll to recording console upon selecting film', () => {
  const filePath = path.resolve(process.cwd(), 'src/components/views/AddMovieView.tsx');
  const content = fs.readFileSync(filePath, 'utf8');

  assert.ok(content.includes('formConsoleRef'), 'Must define and bind formConsoleRef');
  assert.ok(content.includes("scrollIntoView({ behavior: 'smooth', block: 'start' })"), 'Must smoothly scroll recording console into view without manual scroll');
});

test('AddMovieView UX: 2-Column layout on desktop with sticky preview dossier and clear 4-group form organization', () => {
  const filePath = path.resolve(process.cwd(), 'src/components/views/AddMovieView.tsx');
  const content = fs.readFileSync(filePath, 'utf8');

  // 2-Column responsive grid
  assert.ok(content.includes('grid grid-cols-1 lg:grid-cols-[280px_1fr]'), 'Must implement two-column desktop layout with left column width and right form');
  assert.ok(content.includes('sticky top-24'), 'Left column dossier preview must be sticky');

  // 4 Groups organization
  assert.ok(content.includes('2. Data Rekaman Film Dipilih'), 'Group 1: Film Identity details');
  assert.ok(content.includes('3. Kurasi Mood'), 'Group 2: Mood curation');
  assert.ok(content.includes('4. Tautan Nonton'), 'Group 3: Additional streaming URL');
  assert.ok(content.includes('Simpan Film ke Kabin'), 'Group 4: Primary submit action');

  // TMDB Attribution & Zero hardcoded dark hex
  assert.ok(content.includes('<TmdbAttribution />'), 'Must retain TMDB attribution');
  assert.ok(!content.includes('#121017'), 'Must not hardcode dark hex #121017');
  assert.ok(!content.includes('#0B0812'), 'Must not hardcode dark hex #0B0812');
});
