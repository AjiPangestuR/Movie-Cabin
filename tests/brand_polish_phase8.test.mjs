import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('Footer Component: Renders MOCAB brand logo, paw stamp, quick links, and OSD ledger', () => {
  const footerPath = path.resolve(process.cwd(), 'src/components/Footer.tsx');
  assert.ok(fs.existsSync(footerPath), 'Footer component must exist');

  const content = fs.readFileSync(footerPath, 'utf8');
  assert.ok(content.includes('logo-horizontal.webp'), 'Footer must render horizontal brand logo');
  assert.ok(content.includes('avatar-paw.webp'), 'Footer must render Beruang Sastra paw stamp');
  assert.ok(content.includes('BERUANG SASTRA'), 'Footer must state Beruang Sastra identity');
  assert.ok(content.includes('HI-FI STEREO'), 'Footer must have vintage OSD technical ledger');
  assert.ok(content.includes('SP 120 MIN'), 'Footer must have SP 120 MIN tape recording tag');
  assert.ok(content.includes('TMDB API'), 'Footer must state TMDB attribution');
  assert.ok(content.includes('aria-hidden="true"'), 'Decorative elements must have aria-hidden="true"');
  assert.ok(!content.includes('#121017'), 'Footer must not hardcode dark hex');
});

test('Root Layout: Integrates global Footer above mobile BottomNav', () => {
  const layoutPath = path.resolve(process.cwd(), 'src/app/layout.tsx');
  const content = fs.readFileSync(layoutPath, 'utf8');

  assert.ok(content.includes('<Footer />'), 'Root layout must include Footer');
  assert.ok(content.includes('<BottomNav />'), 'Root layout must preserve BottomNav');
  assert.ok(content.includes('<Header />'), 'Root layout must preserve Header');
});

test('FilmStripDivider Component: Lightweight cinematic ornament with accessible attributes', () => {
  const dividerPath = path.resolve(process.cwd(), 'src/components/FilmStripDivider.tsx');
  assert.ok(fs.existsSync(dividerPath), 'FilmStripDivider component must exist');

  const content = fs.readFileSync(dividerPath, 'utf8');
  assert.ok(content.includes('aria-hidden="true"'), 'FilmStripDivider must have aria-hidden="true"');
  assert.ok(content.includes('font-pixel'), 'FilmStripDivider must use Silkscreen pixel typography');
  assert.ok(content.includes('border-line'), 'FilmStripDivider must use semantic border token');
  assert.ok(!content.includes('#121017'), 'FilmStripDivider must not hardcode dark hex');
});

test('EmptyState Component: Features Beruang Sastra paw print identity stamp', () => {
  const emptyPath = path.resolve(process.cwd(), 'src/components/EmptyState.tsx');
  const content = fs.readFileSync(emptyPath, 'utf8');

  assert.ok(content.includes('avatar-paw.webp'), 'EmptyState must include Beruang Sastra paw stamp');
  assert.ok(content.includes('aria-hidden="true"'), 'Paw stamp container must be marked aria-hidden="true"');
  assert.ok(content.includes('font-serif'), 'Title must use Fraunces serif font');
});

test('HomeView Polish: Includes FilmStripDivider, paw identity, and subtle ribbon sticker', () => {
  const homePath = path.resolve(process.cwd(), 'src/components/views/HomeView.tsx');
  const content = fs.readFileSync(homePath, 'utf8');

  assert.ok(content.includes('FilmStripDivider'), 'HomeView must use FilmStripDivider');
  assert.ok(content.includes('avatar-paw.webp'), 'HomeView must use Beruang Sastra paw identity');
  assert.ok(content.includes('sticker-film-ribbon.webp'), 'HomeView must use film ribbon sticker');
  assert.ok(content.includes('SP 120 MIN // CH 03'), 'HomeView must include subtle timestamp OSD');
});

test('BankView & ArchiveView Polish: Integrate FilmStripDivider and OSD ledgers', () => {
  const bankPath = path.resolve(process.cwd(), 'src/components/views/BankView.tsx');
  const bankContent = fs.readFileSync(bankPath, 'utf8');
  assert.ok(bankContent.includes('FilmStripDivider'), 'BankView must use FilmStripDivider');
  assert.ok(bankContent.includes('SP 120 MIN // VOL. 01'), 'BankView must include OSD ledger tag');

  const archivePath = path.resolve(process.cwd(), 'src/components/views/ArchiveView.tsx');
  const archiveContent = fs.readFileSync(archivePath, 'utf8');
  assert.ok(archiveContent.includes('FilmStripDivider'), 'ArchiveView must use FilmStripDivider');
  assert.ok(archiveContent.includes('BERUANG SASTRA // RESEARCH LOG'), 'ArchiveView must include OSD research tag');
});

test('MovieDetailView Polish: Integrates FilmStripDivider and Writer Room research tag', () => {
  const detailPath = path.resolve(process.cwd(), 'src/components/views/MovieDetailView.tsx');
  const content = fs.readFileSync(detailPath, 'utf8');

  assert.ok(content.includes('FilmStripDivider'), 'MovieDetailView must use FilmStripDivider');
  assert.ok(content.includes('BERUANG SASTRA // RESEARCH NOTE'), 'MovieDetailView must include research note OSD tag');
});

test('SearchModal Polish: Features Beruang Sastra paw mark in empty state and animated OSD indicator', () => {
  const modalPath = path.resolve(process.cwd(), 'src/components/SearchModal.tsx');
  const content = fs.readFileSync(modalPath, 'utf8');

  assert.ok(content.includes('avatar-paw.webp'), 'SearchModal empty state must feature paw mark');
  assert.ok(content.includes('animate-pulse'), 'SearchModal OSD tag must have animated recording indicator');
});
