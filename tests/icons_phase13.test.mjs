import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

test('Icon Files: All 7 required icon and favicon assets exist on disk', () => {
  const requiredFiles = [
    'public/icons/icon-192.png',
    'public/icons/icon-512.png',
    'public/icons/icon-512-maskable.png',
    'public/icons/apple-touch-icon.png',
    'public/favicon-32x32.png',
    'public/favicon-16x16.png',
    'public/favicon.ico',
  ];

  for (const file of requiredFiles) {
    const fullPath = path.resolve(process.cwd(), file);
    assert.ok(fs.existsSync(fullPath), `${file} must exist`);
    const stats = fs.statSync(fullPath);
    assert.ok(stats.size > 0, `${file} must not be empty (size=${stats.size})`);
  }
});

test('Icon Dimensions: PNG variants match exact required pixel resolutions', async () => {
  const specs = [
    { file: 'public/icons/icon-192.png', width: 192, height: 192 },
    { file: 'public/icons/icon-512.png', width: 512, height: 512 },
    { file: 'public/icons/icon-512-maskable.png', width: 512, height: 512 },
    { file: 'public/icons/apple-touch-icon.png', width: 180, height: 180 },
    { file: 'public/favicon-32x32.png', width: 32, height: 32 },
    { file: 'public/favicon-16x16.png', width: 16, height: 16 },
  ];

  for (const { file, width, height } of specs) {
    const meta = await sharp(file).metadata();
    assert.equal(meta.format, 'png', `${file} must be PNG`);
    assert.equal(meta.width, width, `${file} width must be ${width}`);
    assert.equal(meta.height, height, `${file} height must be ${height}`);
  }
});

test('Favicon ICO: Valid multi-resolution ICO header containing embedded sub-images', () => {
  const icoPath = path.resolve(process.cwd(), 'public/favicon.ico');
  const buf = fs.readFileSync(icoPath);

  // ICO header: reserved = 0, type = 1 (icon)
  assert.equal(buf.readUInt16LE(0), 0, 'ICO reserved header must be 0');
  assert.equal(buf.readUInt16LE(2), 1, 'ICO type must be 1');

  const count = buf.readUInt16LE(4);
  assert.ok(count >= 2, `ICO must contain at least 2 resolutions, found ${count}`);

  const widths = [];
  for (let i = 0; i < count; i++) {
    const entryOffset = 6 + i * 16;
    const w = buf.readUInt8(entryOffset) || 256;
    widths.push(w);
  }

  assert.ok(widths.includes(16), 'ICO must include 16x16 resolution');
  assert.ok(widths.includes(32), 'ICO must include 32x32 resolution');
});

test('Brand Consistency: Corner background pixels strictly match #0B0812 dark theme token', async () => {
  const testFiles = [
    'public/icons/icon-512.png',
    'public/icons/icon-512-maskable.png',
    'public/icons/icon-192.png',
    'public/icons/apple-touch-icon.png',
    'public/favicon-32x32.png',
    'public/favicon-16x16.png',
  ];

  for (const file of testFiles) {
    const { data } = await sharp(file).raw().toBuffer({ resolveWithObject: true });
    // Check top-left pixel (0,0)
    const r = data[0];
    const g = data[1];
    const b = data[2];
    const a = data[3];

    assert.equal(r, 11, `${file} red channel must match 0x0B (11)`);
    assert.equal(g, 8, `${file} green channel must match 0x08 (8)`);
    assert.equal(b, 18, `${file} blue channel must match 0x12 (18)`);
    assert.equal(a, 255, `${file} alpha channel must be solid 255`);
  }
});

test('Maskable Safe Zone: Artwork strictly respects the 80% circle safe zone in 512-maskable icon', async () => {
  const { data } = await sharp('public/icons/icon-512-maskable.png')
    .raw()
    .toBuffer({ resolveWithObject: true });

  const width = 512;
  const height = 512;
  const channels = 4;
  const cx = 256;
  const cy = 256;
  const safeRadius = 512 * 0.40; // 80% diameter safe area = 204.8px radius

  let outsideArtworkCount = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dist = Math.hypot(x - cx, y - cy);
      if (dist > safeRadius) {
        const idx = (y * width + x) * channels;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        // If it deviates from #0B0812 outside the safe radius, artwork leaked outside safe zone
        if (r !== 11 || g !== 8 || b !== 18) {
          outsideArtworkCount++;
        }
      }
    }
  }

  assert.equal(
    outsideArtworkCount,
    0,
    `Maskable icon artwork leaked outside 80% safe circle (${outsideArtworkCount} pixels outside)`
  );
});

test('Next.js Layout Metadata: Configures complete icon suite and applicationName', () => {
  const layoutPath = path.resolve(process.cwd(), 'src/app/layout.tsx');
  const content = fs.readFileSync(layoutPath, 'utf8');

  assert.ok(content.includes("url: '/favicon.ico'"), 'Metadata must declare /favicon.ico');
  assert.ok(content.includes("url: '/favicon-16x16.png'"), 'Metadata must declare /favicon-16x16.png');
  assert.ok(content.includes("url: '/favicon-32x32.png'"), 'Metadata must declare /favicon-32x32.png');
  assert.ok(content.includes("url: '/icons/icon-192.png'"), 'Metadata must declare /icons/icon-192.png');
  assert.ok(content.includes("url: '/icons/icon-512.png'"), 'Metadata must declare /icons/icon-512.png');
  assert.ok(content.includes("url: '/icons/apple-touch-icon.png'"), 'Metadata must declare /icons/apple-touch-icon.png');
  assert.ok(content.includes("applicationName: 'MOCAB'"), 'Metadata applicationName must be MOCAB');
});

test('PWA Manifests: Standalone manifests are synchronized and define required icons', () => {
  const webmanifest = JSON.parse(fs.readFileSync('public/manifest.webmanifest', 'utf8'));
  const jsonManifest = JSON.parse(fs.readFileSync('public/manifest.json', 'utf8'));

  assert.deepEqual(webmanifest, jsonManifest, 'manifest.webmanifest and manifest.json must be identical');
  assert.equal(webmanifest.name, 'MOCAB');
  assert.equal(webmanifest.short_name, 'MOCAB');
  assert.equal(webmanifest.display, 'standalone');

  const icons = webmanifest.icons;
  assert.ok(icons.find((i) => i.src === '/icons/icon-192.png' && i.purpose === 'any'));
  assert.ok(icons.find((i) => i.src === '/icons/icon-512.png' && i.purpose === 'any'));
  assert.ok(icons.find((i) => i.src === '/icons/icon-512-maskable.png' && i.purpose === 'maskable'));
});

test('Service Worker: Pre-caches updated icon suite and bumps cache version', () => {
  const swContent = fs.readFileSync('public/sw.js', 'utf8');

  assert.ok(swContent.includes('mocab-static-v2'), 'Service worker cache version must be bumped to v2');
  assert.ok(swContent.includes("'/favicon.ico'"), 'Service worker must precache /favicon.ico');
  assert.ok(swContent.includes("'/favicon-16x16.png'"), 'Service worker must precache /favicon-16x16.png');
  assert.ok(swContent.includes("'/favicon-32x32.png'"), 'Service worker must precache /favicon-32x32.png');
  assert.ok(swContent.includes("'/icons/icon-192.png'"), 'Service worker must precache /icons/icon-192.png');
  assert.ok(swContent.includes("'/icons/icon-512.png'"), 'Service worker must precache /icons/icon-512.png');
  assert.ok(swContent.includes("'/icons/icon-512-maskable.png'"), 'Service worker must precache /icons/icon-512-maskable.png');
  assert.ok(swContent.includes("'/icons/apple-touch-icon.png'"), 'Service worker must precache /icons/apple-touch-icon.png');
});
