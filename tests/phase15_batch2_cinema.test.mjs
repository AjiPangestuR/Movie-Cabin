import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('Batch 2 — HomeView: Implements mobile snap-carousel with peek preview & preserves desktop 3-col grid', () => {
  const filePath = path.resolve(process.cwd(), 'src/components/views/HomeView.tsx');
  const content = fs.readFileSync(filePath, 'utf8');

  // Mobile snap carousel classes
  assert.ok(content.includes('overflow-x-auto'), 'Triple-Bill section must support horizontal scrolling on mobile');
  assert.ok(content.includes('snap-x'), 'Triple-Bill section must use snap-x layout');
  assert.ok(content.includes('snap-mandatory'), 'Triple-Bill section must use snap-mandatory scrolling');
  assert.ok(content.includes('w-[82%]'), 'Triple-Bill cards must be sized to peek the next card on mobile');

  // Desktop layout preservation
  assert.ok(content.includes('md:grid'), 'Desktop layout must preserve grid structure');
  assert.ok(content.includes('md:grid-cols-3'), 'Desktop layout must preserve 3-column recommendation grid');
  assert.ok(content.includes('md:overflow-visible'), 'Desktop layout must disable carousel overflow');

  // Recommendation determinism & data preservation
  assert.ok(content.includes('shuffleKey'), 'Must preserve recommendation shuffleKey');
  assert.ok(content.includes('picks'), 'Must preserve recommendation picks state');
  assert.ok(content.includes('FilmStripDivider'), 'Must preserve FilmStripDivider');
});

test('Batch 2 — MovieCard: Compact responsive rating and potential badges prevent 320px collision', () => {
  const filePath = path.resolve(process.cwd(), 'src/components/MovieCard.tsx');
  const content = fs.readFileSync(filePath, 'utf8');

  // Compact star and lightning badge format
  assert.ok(content.includes('★'), 'Must use compact star icon for movie rating');
  assert.ok(content.includes('⚡'), 'Must use compact lightning icon for content potential');
  assert.ok(content.includes('whitespace-nowrap'), 'Badges must prevent line wrapping');

  // Responsive suffix /10 for wider viewports
  assert.ok(content.includes('hidden min-[380px]:inline'), 'Must hide /10 suffix on sub-380px widths to prevent badge collision');

  // Semantic tokens & PosterCover
  assert.ok(content.includes('<PosterCover'), 'Must render PosterCover');
  assert.ok(!content.includes('#121017'), 'Must not hardcode dark hex #121017');
  assert.ok(!content.includes('#0B0812'), 'Must not hardcode dark hex #0B0812');
});

test('Batch 2 — BankView: Responsive movie grid and filter preservation', () => {
  const filePath = path.resolve(process.cwd(), 'src/components/views/BankView.tsx');
  const content = fs.readFileSync(filePath, 'utf8');

  // Responsive grid spacing
  assert.ok(content.includes('grid-cols-2'), 'Must use 2-column grid for mobile');
  assert.ok(content.includes('gap-3 sm:gap-5'), 'Must use 12px gap on mobile to fit 320px screens cleanly');

  // Functional preservation
  assert.ok(content.includes('STATUS_OPTIONS'), 'Must preserve status options');
  assert.ok(content.includes('MoodChips'), 'Must preserve MoodChips filtering');
  assert.ok(content.includes('FilmStripDivider'), 'Must preserve FilmStripDivider');
  assert.ok(content.includes('stats.total'), 'Must display real total statistics');
});

test('Batch 2 — MovieDetailView: Mobile visual hierarchy reordering & strictly conditional Journal Kurator', () => {
  const filePath = path.resolve(process.cwd(), 'src/components/views/MovieDetailView.tsx');
  const content = fs.readFileSync(filePath, 'utf8');

  // Mobile compact hero (< md)
  assert.ok(content.includes('md:hidden space-y-4'), 'Must have mobile-specific compact hero container');
  assert.ok(content.includes('w-24 sm:w-32 flex-shrink-0 group/poster'), 'Mobile poster must be compact thumbnail');
  assert.ok(content.includes('CINEMA DOSSIER // MOCAB'), 'Must retain Cinema Dossier watermark');

  // Desktop preservation (md+)
  assert.ok(content.includes('hidden md:block space-y-5'), 'Must preserve desktop sticky sidebar');
  assert.ok(content.includes('md:grid-cols-[280px_1fr]'), 'Must preserve desktop 2-column layout');

  // Actions & Safety
  assert.ok(content.includes('ConfirmInline'), 'Must use ConfirmInline for delete protection');
  assert.ok(content.includes('hasSafeWatchUrl'), 'Must validate safe watch URL');
  assert.ok(content.includes('Buka Tautan Nonton'), 'Must have watch button');

  // Journal Kurator strictly conditional (no fake data)
  assert.ok(
    content.includes('relatedJournals && relatedJournals.length > 0'),
    'Journal Kurator must only render when real related journals exist'
  );
  assert.ok(content.includes('RelatedJournalSummary'), 'Must export or define RelatedJournalSummary interface');

  // Semantic tokens
  assert.ok(!content.includes('#121017'), 'Must not hardcode dark hex #121017');
  assert.ok(!content.includes('#0B0812'), 'Must not hardcode dark hex #0B0812');
});
