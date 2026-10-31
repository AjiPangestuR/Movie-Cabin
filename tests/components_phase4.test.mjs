import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('PosterCover: Supports 2:3 aspect ratio, object-cover, and semantic theme tokens', () => {
  const filePath = path.resolve(process.cwd(), 'src/components/PosterCover.tsx');
  const content = fs.readFileSync(filePath, 'utf8');

  assert.ok(content.includes('aspect-[2/3]'), 'PosterCover must enforce 2:3 aspect ratio');
  assert.ok(content.includes('object-cover'), 'Image must use object-cover');
  assert.ok(content.includes('bg-surface-elevated'), 'Must use semantic surface-elevated');
  assert.ok(content.includes('border-line'), 'Must use semantic border-line');
  assert.ok(!content.includes('bg-[#121017]'), 'Must not hardcode dark hex #121017');
});

test('PosterCover: Generative fallback includes VHS watermark and editorial typography', () => {
  const filePath = path.resolve(process.cwd(), 'src/components/PosterCover.tsx');
  const content = fs.readFileSync(filePath, 'utf8');

  assert.ok(content.includes('!showImage'), 'Must contain condition for missing poster');
  assert.ok(content.includes('VHS TAPE') || content.includes('NO POSTER'), 'Fallback must have retro tape label');
  assert.ok(content.includes('font-serif font-bold'), 'Must render title with editorial serif font');
  assert.ok(content.includes('font-pixel text-neon-magenta'), 'Must render year with pixel font accent');
});

test('PosterCover: Prop interface compatibility maintained for all callers', () => {
  const filePath = path.resolve(process.cwd(), 'src/components/PosterCover.tsx');
  const content = fs.readFileSync(filePath, 'utf8');

  assert.ok(content.includes('title: string'), 'Must accept title');
  assert.ok(content.includes('identifier?:'), 'Must accept identifier');
  assert.ok(content.includes('done?: boolean'), 'Must accept done');
  assert.ok(content.includes('big?: boolean'), 'Must accept big');
  assert.ok(content.includes('year?:'), 'Must accept year');
  assert.ok(content.includes('posterUrl?:'), 'Must accept posterUrl');
  assert.ok(content.includes('className?: string'), 'Must accept className');
});

test('Badge Component: Defines all required variants and Silkscreen font', () => {
  const filePath = path.resolve(process.cwd(), 'src/components/Badge.tsx');
  const content = fs.readFileSync(filePath, 'utf8');

  assert.ok(content.includes("'movie'"), 'Must support movie variant');
  assert.ok(content.includes("'review'"), 'Must support review variant');
  assert.ok(content.includes("'recommend'"), 'Must support recommend variant');
  assert.ok(content.includes("'analysis'"), 'Must support analysis variant');
  assert.ok(content.includes("'discussion'"), 'Must support discussion variant');
  assert.ok(content.includes("'watchlist'"), 'Must support watchlist variant');
  assert.ok(content.includes("'watched'"), 'Must support watched variant');
  assert.ok(content.includes('font-pixel'), 'Badge must use Silkscreen pixel font');
});

test('Global Button Primitives: Defines primary gradient, secondary, ghost, danger, and disabled states', () => {
  const cssPath = path.resolve(process.cwd(), 'src/app/globals.css');
  const cssContent = fs.readFileSync(cssPath, 'utf8');

  assert.ok(cssContent.includes('.btn.primary'), 'Must define .btn.primary');
  assert.ok(cssContent.includes('linear-gradient'), 'Primary button must use vivid gradient');
  assert.ok(cssContent.includes('.btn.secondary'), 'Must define .btn.secondary');
  assert.ok(cssContent.includes('.btn.ghost'), 'Must define .btn.ghost');
  assert.ok(cssContent.includes('.btn.danger'), 'Must define .btn.danger');
  assert.ok(cssContent.includes('.btn[disabled]'), 'Must define .btn[disabled]');
  assert.ok(cssContent.includes('.btn:focus-visible'), 'Must define .btn:focus-visible');
});

test('Global Card Primitives: Defines .card with hover elevation and semantic tokens', () => {
  const cssPath = path.resolve(process.cwd(), 'src/app/globals.css');
  const cssContent = fs.readFileSync(cssPath, 'utf8');

  assert.ok(cssContent.includes('.card {'), 'Must define .card class');
  assert.ok(cssContent.includes('background: var(--surface)'), 'Card must use var(--surface)');
  assert.ok(cssContent.includes('.card:hover'), 'Card must define hover micro-interaction');
});

test('Input Primitives: Enhanced focus ring and .input-error state', () => {
  const cssPath = path.resolve(process.cwd(), 'src/app/globals.css');
  const cssContent = fs.readFileSync(cssPath, 'utf8');

  assert.ok(cssContent.includes('input[type="search"]'), 'Must support search inputs');
  assert.ok(cssContent.includes('.input-error'), 'Must define .input-error state');
  assert.ok(cssContent.includes('border-color: var(--danger)'), 'Error state must use var(--danger)');
});

test('Micro-interactions: Active scale on buttons and reduced motion support', () => {
  const cssPath = path.resolve(process.cwd(), 'src/app/globals.css');
  const cssContent = fs.readFileSync(cssPath, 'utf8');

  assert.ok(cssContent.includes('scale(0.98)'), 'Must include subtle active scale on buttons');
  assert.ok(cssContent.includes('@media (prefers-reduced-motion: reduce)'), 'Must respect prefers-reduced-motion');
});

test('MovieCard Component: Uses PosterCover, semantic tokens, and no hardcoded dark hex', () => {
  const cardPath = path.resolve(process.cwd(), 'src/components/MovieCard.tsx');
  const content = fs.readFileSync(cardPath, 'utf8');

  assert.ok(content.includes('<PosterCover'), 'MovieCard must render PosterCover');
  assert.ok(content.includes('text-neon-magenta'), 'Must use neon-magenta accent');
  assert.ok(!content.includes('#121017'), 'Must not hardcode dark hex #121017');
});

test('NumberScale & EmptyState: Use gradient primary and no hardcoded dark text', () => {
  const emptyPath = path.resolve(process.cwd(), 'src/components/EmptyState.tsx');
  const emptyContent = fs.readFileSync(emptyPath, 'utf8');
  assert.ok(!emptyContent.includes('text-[#121017]'), 'EmptyState must not hardcode dark text #121017');
  assert.ok(emptyContent.includes('from-primary to-neon-magenta'), 'EmptyState must use primary gradient');

  const scalePath = path.resolve(process.cwd(), 'src/components/NumberScale.tsx');
  const scaleContent = fs.readFileSync(scalePath, 'utf8');
  assert.ok(!scaleContent.includes('text-[#121017]'), 'NumberScale must not hardcode dark text #121017');
  assert.ok(scaleContent.includes('from-primary to-neon-magenta'), 'NumberScale must use primary gradient');
});
