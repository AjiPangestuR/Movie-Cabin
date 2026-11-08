import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('PWA Manifest: Valid manifest.webmanifest with required MOCAB identity and standalone mode', () => {
  const manifestPath = path.resolve(process.cwd(), 'public/manifest.webmanifest');
  assert.ok(fs.existsSync(manifestPath), 'public/manifest.webmanifest must exist');

  const content = fs.readFileSync(manifestPath, 'utf8');
  const manifest = JSON.parse(content);

  assert.equal(manifest.name, 'MOCAB', 'Manifest name must be MOCAB');
  assert.equal(manifest.short_name, 'MOCAB', 'Manifest short_name must be MOCAB');
  assert.equal(manifest.description, 'Personal Movie Collection & Creative Workspace', 'Manifest description must match');
  assert.equal(manifest.display, 'standalone', 'Display mode must be standalone');
  assert.equal(manifest.start_url, '/', 'start_url must be /');
  assert.equal(manifest.theme_color, '#0B0812', 'theme_color must match dark theme token #0B0812');
  assert.equal(manifest.background_color, '#0B0812', 'background_color must match launch screen #0B0812');
  assert.equal(manifest.orientation, 'portrait-primary', 'orientation must be portrait-primary');

  // Verify icons array
  assert.ok(Array.isArray(manifest.icons) && manifest.icons.length >= 3, 'Manifest must have at least 3 icon declarations');
  const icon192 = manifest.icons.find((i) => i.sizes === '192x192');
  assert.ok(icon192, 'Must declare 192x192 icon');
  assert.equal(icon192.type, 'image/png');

  const icon512 = manifest.icons.find((i) => i.sizes === '512x512' && (!i.purpose || i.purpose === 'any'));
  assert.ok(icon512, 'Must declare standard 512x512 icon');

  const maskable512 = manifest.icons.find((i) => i.sizes === '512x512' && i.purpose === 'maskable');
  assert.ok(maskable512, 'Must declare maskable 512x512 icon');

  // Check manifest.json alias exists
  const jsonPath = path.resolve(process.cwd(), 'public/manifest.json');
  assert.ok(fs.existsSync(jsonPath), 'public/manifest.json must exist as alias');
});

test('PWA Icons: All required icons exist on disk with valid PNG headers', () => {
  const iconFiles = [
    'public/icons/icon-192.png',
    'public/icons/icon-512.png',
    'public/icons/icon-512-maskable.png',
    'public/icons/apple-touch-icon.png',
  ];

  for (const file of iconFiles) {
    const fullPath = path.resolve(process.cwd(), file);
    assert.ok(fs.existsSync(fullPath), `${file} must exist`);

    const buf = fs.readFileSync(fullPath);
    assert.ok(buf.length > 0, `${file} must not be empty`);
    assert.equal(buf.toString('ascii', 1, 4), 'PNG', `${file} must be a valid PNG file`);
  }
});

test('Service Worker: Implements safe caching, strict Supabase/API isolation, and offline fallback', () => {
  const swPath = path.resolve(process.cwd(), 'public/sw.js');
  assert.ok(fs.existsSync(swPath), 'public/sw.js must exist');

  const swContent = fs.readFileSync(swPath, 'utf8');

  // Security: Supabase and API isolation (NEVER cached)
  assert.ok(swContent.includes('supabase.co'), 'Must isolate supabase.co requests');
  assert.ok(swContent.includes("url.pathname.startsWith('/api/')"), 'Must isolate /api/ proxy endpoints');
  assert.ok(swContent.includes("url.pathname.startsWith('/auth/')"), 'Must isolate auth routes');

  // Precaching core static assets
  assert.ok(swContent.includes('/offline'), 'Must precache /offline page');
  assert.ok(swContent.includes('/icons/icon-192.png'), 'Must precache 192 icon');
  assert.ok(swContent.includes('/icons/icon-512.png'), 'Must precache 512 icon');

  // Navigation Network-First with Offline fallback
  assert.ok(swContent.includes("request.mode === 'navigate'"), 'Must handle navigation requests separately');
  assert.ok(swContent.includes("match('/offline')"), 'Must fall back to /offline when network fails');

  // Lifecycle handlers
  assert.ok(swContent.includes('skipWaiting'), 'Must support skipWaiting');
  assert.ok(swContent.includes('clients.claim'), 'Must claim clients on activate');
});

test('Offline Route: Statically communicates offline status with retry action and no fake data', () => {
  const pagePath = path.resolve(process.cwd(), 'src/app/offline/page.tsx');
  assert.ok(fs.existsSync(pagePath), 'Offline page component must exist');

  const content = fs.readFileSync(pagePath, 'utf8');
  assert.ok(content.includes('Koneksi Internet Terputus'), 'Must clearly state connection failure');
  assert.ok(content.includes('NO SIGNAL'), 'Must feature retro VHS NO SIGNAL indicator');
  assert.ok(content.includes('Coba Hubungkan Kembali'), 'Must provide retry/reconnect action button');
  assert.ok(content.includes('window.location.reload'), 'Retry action must reload window');
  assert.ok(!content.includes('#121017'), 'Must not hardcode dark hex #121017');
});

test('Layout Metadata: Configures manifest, iOS Safari web app, themeColor, and PwaRegister', () => {
  const layoutPath = path.resolve(process.cwd(), 'src/app/layout.tsx');
  const content = fs.readFileSync(layoutPath, 'utf8');

  assert.ok(content.includes("manifest: '/manifest.webmanifest'"), 'Layout metadata must link manifest.webmanifest');
  assert.ok(content.includes("applicationName: 'MOCAB'"), 'Metadata must declare applicationName MOCAB');
  assert.ok(content.includes('appleWebApp:'), 'Metadata must declare appleWebApp properties');
  assert.ok(content.includes("themeColor: '#0B0812'"), 'Viewport must declare dark themeColor #0B0812');
  assert.ok(content.includes('<PwaRegister />'), 'Layout must mount PwaRegister client component');
  assert.ok(content.includes('apple-touch-icon'), 'Head must link apple-touch-icon');
});

test('Proxy / Middleware: Exempts PWA manifest, service worker, offline page, and icons from login redirect', () => {
  const proxyPath = path.resolve(process.cwd(), 'src/proxy.ts');
  const proxyContent = fs.readFileSync(proxyPath, 'utf8');

  assert.ok(proxyContent.includes('sw'), 'proxy.ts matcher must exclude sw.js');
  assert.ok(proxyContent.includes('manifest'), 'proxy.ts matcher must exclude manifests');

  const supabaseProxyPath = path.resolve(process.cwd(), 'src/lib/supabase/proxy.ts');
  const supabaseProxyContent = fs.readFileSync(supabaseProxyPath, 'utf8');

  assert.ok(supabaseProxyContent.includes('/offline'), 'Supabase proxy must allow public /offline path');
  assert.ok(supabaseProxyContent.includes('/sw.js'), 'Supabase proxy must allow public /sw.js path');
  assert.ok(supabaseProxyContent.includes('/manifest.webmanifest'), 'Supabase proxy must allow public /manifest.webmanifest path');
});
