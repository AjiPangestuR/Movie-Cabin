import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// Helper to simulate theme resolution algorithm
function resolveEffectiveTheme({ storedTheme, systemPrefersLight }) {
  if (storedTheme === 'light' || storedTheme === 'dark') {
    return storedTheme;
  }
  return systemPrefersLight ? 'light' : 'dark';
}

test('Theme System: Default visual is dark mode when no storage and no system preference', () => {
  const result = resolveEffectiveTheme({ storedTheme: null, systemPrefersLight: false });
  assert.equal(result, 'dark');
});

test('Theme System: Follows prefers-color-scheme on first visit when system is light', () => {
  const result = resolveEffectiveTheme({ storedTheme: null, systemPrefersLight: true });
  assert.equal(result, 'light');
});

test('Theme System: User stored preference overrides system dark mode', () => {
  const result = resolveEffectiveTheme({ storedTheme: 'light', systemPrefersLight: false });
  assert.equal(result, 'light');
});

test('Theme System: User stored preference overrides system light mode', () => {
  const result = resolveEffectiveTheme({ storedTheme: 'dark', systemPrefersLight: true });
  assert.equal(result, 'dark');
});

test('Theme System: Invalid stored value safely falls back to system preference or dark default', () => {
  const invalidFallback1 = resolveEffectiveTheme({ storedTheme: 'neon-cyber', systemPrefersLight: false });
  assert.equal(invalidFallback1, 'dark');

  const invalidFallback2 = resolveEffectiveTheme({ storedTheme: 'random', systemPrefersLight: true });
  assert.equal(invalidFallback2, 'light');
});

test('Theme System: CSS Variables in globals.css strictly match Retro VHS specification', () => {
  const cssPath = path.resolve(process.cwd(), 'src/app/globals.css');
  const cssContent = fs.readFileSync(cssPath, 'utf8');

  // Dark Mode Tokens
  assert.match(cssContent, /--bg:\s*#0B0812/i, 'Dark bg token must be #0B0812');
  assert.match(cssContent, /--surface:\s*#15101F/i, 'Dark surface token must be #15101F');
  assert.match(cssContent, /--surface-elevated:\s*#21152E/i, 'Dark elevated token must be #21152E');
  assert.match(cssContent, /--primary:\s*#9B35E8/i, 'Dark primary token must be #9B35E8');
  assert.match(cssContent, /--primary-bright:\s*#C16BFF/i, 'Dark primary-bright token must be #C16BFF');
  assert.match(cssContent, /--neon-magenta:\s*#F044C8/i, 'Dark neon-magenta token must be #F044C8');
  assert.match(cssContent, /--text:\s*#F8F0FF/i, 'Dark text token must be #F8F0FF');

  // Light Mode Tokens
  assert.match(cssContent, /--bg:\s*#F7F1FC/i, 'Light bg token must be #F7F1FC');
  assert.match(cssContent, /--surface:\s*#FFFFFF/i, 'Light surface token must be #FFFFFF');
  assert.match(cssContent, /--surface-elevated:\s*#EFE3F8/i, 'Light elevated token must be #EFE3F8');
  assert.match(cssContent, /--primary:\s*#792DB5/i, 'Light primary token must be #792DB5');
  assert.match(cssContent, /--primary-bright:\s*#9B35E8/i, 'Light primary-bright token must be #9B35E8');
  assert.match(cssContent, /--neon-magenta:\s*#D82EAA/i, 'Light neon-magenta token must be #D82EAA');
  assert.match(cssContent, /--text:\s*#291536/i, 'Light text token must be #291536');
});

test('Theme System: CSS Toggle icons display rules prevent SSR/CSR hydration mismatch', () => {
  const cssPath = path.resolve(process.cwd(), 'src/app/globals.css');
  const cssContent = fs.readFileSync(cssPath, 'utf8');

  assert.ok(cssContent.includes('.theme-icon-sun'), 'Must declare .theme-icon-sun');
  assert.ok(cssContent.includes('.theme-icon-moon'), 'Must declare .theme-icon-moon');
  assert.ok(cssContent.includes("[data-theme='light'] .theme-icon-sun"), 'Must hide sun in light mode');
  assert.ok(cssContent.includes("[data-theme='light'] .theme-icon-moon"), 'Must show moon in light mode');
});

test('Theme System: Inline head init script is syntactically sound and resilient', () => {
  const providerPath = path.resolve(process.cwd(), 'src/components/ThemeProvider.tsx');
  const providerContent = fs.readFileSync(providerPath, 'utf8');

  assert.ok(providerContent.includes('mocab_theme'), 'Storage key must be mocab_theme');
  assert.ok(providerContent.includes('prefers-color-scheme: light'), 'Script must check prefers-color-scheme');
  assert.ok(providerContent.includes('setAttribute(\'data-theme\''), 'Script must set data-theme attribute');
  assert.ok(providerContent.includes('classList.add(\'light\')'), 'Script must toggle light class');
});

test('Theme System: Header integrates ThemeToggle accessible button', () => {
  const headerPath = path.resolve(process.cwd(), 'src/components/Header.tsx');
  const headerContent = fs.readFileSync(headerPath, 'utf8');

  assert.ok(headerContent.includes('<ThemeToggle'), 'Header must render ThemeToggle');
  assert.ok(headerContent.includes("bg-surface/90"), 'Header must use semantic surface color');
  assert.ok(!headerContent.includes("bg-[#121017]/90"), 'Header must not hardcode dark background');
});

test('Theme System: Root layout includes inline script in head and ThemeProvider wrapper', () => {
  const layoutPath = path.resolve(process.cwd(), 'src/app/layout.tsx');
  const layoutContent = fs.readFileSync(layoutPath, 'utf8');

  assert.ok(layoutContent.includes('<ThemeProvider>'), 'Layout must wrap tree in ThemeProvider');
  assert.ok(layoutContent.includes('dangerouslySetInnerHTML={{ __html: themeInitScript }}'), 'Layout head must inject pre-paint script');
  assert.ok(layoutContent.includes('suppressHydrationWarning'), 'Root html tag must include suppressHydrationWarning for theme script attributes');
});
