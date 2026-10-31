import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('MovieDetailView: Implements Cinema Dossier layout, Badge states, and PosterCover', () => {
  const filePath = path.resolve(process.cwd(), 'src/components/views/MovieDetailView.tsx');
  const content = fs.readFileSync(filePath, 'utf8');

  // Hierarchy & Dossier Identity
  assert.ok(content.includes('CINEMA DOSSIER // MOCAB'), 'Must display Cinema Dossier dossier watermark');
  assert.ok(content.includes('Kembali ke Movie Bank'), 'Must provide breadcrumb to Movie Bank');
  assert.ok(content.includes('href="/bank"'), 'Breadcrumb must route to /bank');

  // Badge component usage
  assert.ok(content.includes('Badge'), 'Must use Badge component');
  assert.ok(content.includes("movie.done ? 'watched' : 'watchlist'"), 'Must toggle watched/watchlist Badge');
  assert.ok(content.includes('SUDAH DITONTON'), 'Must display SUDAH DITONTON label');
  assert.ok(content.includes('BELUM DITONTON'), 'Must display BELUM DITONTON label');

  // PosterCover integration
  assert.ok(content.includes('<PosterCover'), 'Must render PosterCover');
  assert.ok(content.includes('big'), 'Must set big prop for hero poster');
  assert.ok(content.includes('group/poster'), 'Must provide ambient glow wrapper');

  // Action controls
  assert.ok(content.includes('Buka Tautan Nonton'), 'Must have watch link action button');
  assert.ok(content.includes('ConfirmInline'), 'Must use ConfirmInline for delete confirmation');
  assert.ok(content.includes('Edit Catatan Riset'), 'Must provide link to edit research notes');
  assert.ok(content.includes('Catat Setelah Nonton'), 'Must provide link to record notes if unwatched');

  // Creator Archive / Personal Journal
  assert.ok(content.includes("The Writer's Room"), 'Must display The Writers Room header');
  assert.ok(content.includes('Rating Film'), 'Must show Rating Film card');
  assert.ok(content.includes('Potensi Konten'), 'Must show Potensi Konten card');
  assert.ok(content.includes('/10'), 'Scores must be out of 10');

  // Safe Watch URL
  assert.ok(content.includes('hasSafeWatchUrl'), 'Must validate safe watch URL before rendering link');

  // Semantic Tokens (no hardcoded dark hex)
  assert.ok(!content.includes('#121017'), 'Must not hardcode dark hex #121017');
  assert.ok(!content.includes('#0B0812'), 'Must not hardcode dark hex #0B0812');
});

test('AddMovieView: Implements VHS Recording Room, TMDB intake console, and form validation', () => {
  const filePath = path.resolve(process.cwd(), 'src/components/views/AddMovieView.tsx');
  const content = fs.readFileSync(filePath, 'utf8');

  // Header & Recording Room concept
  assert.ok(content.includes('RECORDING ROOM'), 'Must display RECORDING ROOM badge');
  assert.ok(content.includes('Tambah Film ke Kabin'), 'Must display H1 title');

  // Step 1: Intake Console with required padding offsets (pl-10 pr-16)
  assert.ok(content.includes('pl-10 pr-16'), 'Must keep pl-10 pr-16 padding on search input');
  assert.ok(content.includes('1. Cari Judul Film'), 'Must have Step 1 label');
  assert.ok(content.includes('isSearching'), 'Must handle searching spinner');

  // PosterCover in search results & preview
  assert.ok(content.includes('<PosterCover'), 'Must use PosterCover');
  assert.ok(content.includes('handlePickResult'), 'Must handle picking search result');

  // Step 2: Selected Movie Details (TMDB & Manual modes)
  assert.ok(content.includes('2. Data Rekaman Film Dipilih'), 'Must have Step 2 label');
  assert.ok(content.includes('selectedMovie.manual'), 'Must support manual input toggle');
  assert.ok(content.includes('Ganti film'), 'Must provide button to change selected movie');

  // Step 3: Mood selection & custom creation
  assert.ok(content.includes('3. Kurasi Mood'), 'Must have Step 3 label');
  assert.ok(content.includes('MoodChips'), 'Must use MoodChips');
  assert.ok(content.includes('Kelola Mood'), 'Must have button to manage moods modal');
  assert.ok(content.includes('MoodManagerModal'), 'Must integrate MoodManagerModal');
  assert.ok(content.includes('handleAddCustomMood'), 'Must support quick custom mood addition');

  // Step 4: Watch link & Submit
  assert.ok(content.includes('4. Tautan Nonton'), 'Must have Step 4 label');
  assert.ok(content.includes('Simpan Film ke Kabin'), 'Must have submit button text');
  assert.ok(content.includes('TmdbAttribution'), 'Must render TmdbAttribution');

  // Semantic Tokens (no hardcoded dark hex)
  assert.ok(!content.includes('#121017'), 'Must not hardcode dark hex #121017');
  assert.ok(!content.includes('#0B0812'), 'Must not hardcode dark hex #0B0812');
});

test('CatatView: Implements Cinema Dossier reflection form with NumberScale and validation', () => {
  const filePath = path.resolve(process.cwd(), 'src/components/views/CatatView.tsx');
  const content = fs.readFileSync(filePath, 'utf8');

  // Editorial Dossier Identity
  assert.ok(content.includes('AFTER WATCH'), 'Must have AFTER WATCH badge');
  assert.ok(content.includes('Refleksi Sinematik'), 'Must have Refleksi Sinematik header');
  assert.ok(content.includes('Batal (Kembali ke detail film)'), 'Must provide cancel navigation back to movie detail');
  assert.ok(content.includes('href={`/bank/${movie.id}`}'), 'Must route cancel back to /bank/${movie.id}');

  // NumberScale Integration for Rating & Potential
  assert.ok(content.includes('1. Rating Film'), 'Must have Rating Film section');
  assert.ok(content.includes('2. Potensi Menjadi Konten'), 'Must have Potensi Menjadi Konten section');
  assert.ok(content.includes('<NumberScale'), 'Must render NumberScale component');

  // Qualitative Research Fields
  assert.ok(content.includes('3. Analisis & Catatan Penulis'), 'Must have qualitative section header');
  assert.ok(content.includes('Tema Utama'), 'Must have Tema Utama input');
  assert.ok(content.includes('Adegan yang Nempel'), 'Must have Adegan yang Nempel input');
  assert.ok(content.includes('Angle Konten / Sudut Pandang'), 'Must have Angle Konten input');
  assert.ok(content.includes('Catatan Bebas & Corat-Coret'), 'Must have Catatan Bebas textarea');

  // Submit action
  assert.ok(content.includes('Simpan Catatan Riset'), 'Must have submit button');
  assert.ok(content.includes('saveLog'), 'Must call saveLog API');

  // Semantic Tokens (no hardcoded dark hex)
  assert.ok(!content.includes('#121017'), 'Must not hardcode dark hex #121017');
  assert.ok(!content.includes('#0B0812'), 'Must not hardcode dark hex #0B0812');
});
