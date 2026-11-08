# MOCAB — Phase 15 (Batch 2: Core Cinema Engine) Implementation Report

**Date:** 2026-11-08  
**Scope:** Group A — Core Cinema Engine (Home Dashboard, Movie Bank, Movie Detail)  
**Baseline Commit:** `b92200ad423323620cf6c56afe169c7d2186024b` (`master`)  
**Status:** COMPLETED — Awaiting User Approval before Batch 3

---

## 1. Executive Summary

Batch 2 of MOCAB Phase 15 (Mobile UI/UX Redesign) successfully implemented the approved Google Stitch Group A designs across the Core Cinema Engine without altering database schemas, migrations, or backend business logic.

Key achievements:
1. **Home Dashboard:** Converted the vertical 3-card stack (~2,160px height) into a horizontal snap-carousel on mobile (`w-[82%]` peek preview with `snap-x snap-mandatory`), preserving the 3-column grid on desktop.
2. **Movie Bank:** Completely eliminated badge wrapping and collisions at narrow viewports (320px–360px) via compact `★` (Rating) and `⚡` (Potensi) badges with `min-[380px]` progressive disclosure, paired with an optimized `gap-3 sm:gap-5` 2-column mobile grid.
3. **Movie Detail:** Resolved the ~540px poster dominance on mobile by introducing an editorial compact hero header that presents the poster thumbnail (`w-24 sm:w-32`) alongside the title, status badge, year, runtime, and primary action buttons within the first viewport fold, preserving the classic 2-column sticky dossier on desktop.
4. **Journal Kurator:** Supported strictly conditional rendering (only shown when real `relatedJournals` exist, zero mock or fabricated data).
5. **Full Health Suite:** 173/173 tests passing (including new `phase15_batch2_cinema.test.mjs`), 0 TypeScript errors, 0 ESLint errors/warnings, and 100% successful Next.js production build.

---

## 2. Files Modified

| File | Type | Purpose of Modification |
|---|---|---|
| `src/components/views/HomeView.tsx` | UI View | Triple-Bill horizontal snap-carousel on mobile with edge-bleed peek, compacted collection stats padding for 320px screens. |
| `src/components/MovieCard.tsx` | Component | Compact responsive rating (`★`) and content potential (`⚡`) badge strip, eliminating 320px line wrap collision. |
| `src/components/views/BankView.tsx` | UI View | Mobile grid spacing refinement (`gap-3 sm:gap-5`) ensuring comfortable 138px card widths on 320px devices. |
| `src/components/views/MovieDetailView.tsx` | UI View | Mobile compact hero header with immediate title/actions/synopsis visibility; desktop 2-column preservation; strictly conditional Journal Kurator. |
| `tests/phase15_batch2_cinema.test.mjs` | Test Suite | 4 automated test suites validating Group A mobile responsive layouts, badge collisions, and data preservation. |

---

## 3. Changes Per Screen

### 3.1 Home Dashboard (`HomeView.tsx`)
- **Mobile Snap Carousel:** Refactored the Triple-Bill recommendation container to `flex md:grid md:grid-cols-3 overflow-x-auto md:overflow-visible pb-4 md:pb-0 snap-x snap-mandatory [scrollbar-width:none] [-webkit-overflow-scrolling:touch] -mx-4 px-4 sm:-mx-6 sm:px-6 md:mx-0 md:px-0`.
- **Peek Preview:** Sized cards to `w-[82%] sm:w-[65%] md:w-auto snap-center sm:snap-start`, revealing ~18% of the next recommendation to immediately cue horizontal swiping.
- **Mobile Swipe Indicator:** Added subtle OSD micro-label (`GESER KARTU // 3 REKOMENDASI` with pulsating magenta dot and `SNAP CAROUSEL ↔`) visible on `<md`.
- **Vertical Footprint Reduction:** Decreased Triple-Bill vertical space consumption on mobile from ~2,160px down to ~380px.
- **Collection Overview Compact Spacing:** Adjusted stats tile padding to `p-3.5 sm:p-5` with `text-2xl sm:text-3xl` numbers so the 4 metrics display cleanly on 320px viewports without horizontal overflowing.
- **Preserved Logic:** Retained initial deterministic render (`shuffleKey === 0`), `handleShuffle`, real collection counts (`total`, `watched`, `unwatched`, `withNotes`), and atmospheric mood spectrum exploration.

### 3.2 Movie Bank (`BankView.tsx` & `MovieCard.tsx`)
- **Rating Badge Collision Fix:** Replaced verbose text labels (`Rating 8/10` and `Potensi Konten 9/10`) with compact icon badges (`★ 8` and `⚡ 9`).
- **Progressive Disclosure:** Labels (`Rating`, `Potensi`) and `/10` score suffixes are shown via `hidden min-[380px]:inline` and `hidden sm:inline`, ensuring that on narrow 320px–360px phones the badges consume only ~55px of the 138px card footer.
- **Non-Wrapping Badges:** Added `whitespace-nowrap` to badge containers and spans, completely preventing awkward 2-line wraps.
- **Grid Refinement:** Set grid spacing to `gap-3 sm:gap-5` across `grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6`, leaving adequate breathing room on 320px screens.
- **Preserved Filtering:** Kept status toggles (`Semua Film`, `Belum Ditonton`, `Sudah Ditonton`), search input with instant clear button, mood chips with reset button, and sorting (`new`, `title`, `pot`).

### 3.3 Movie Detail (`MovieDetailView.tsx`)
- **Mobile Compact Hero (`< md`):**
  - Displays breadcrumb navigation accompanied by mobile OSD watermark `CINEMA DOSSIER // MOCAB`.
  - Side-by-side header lockup: compact poster thumbnail (`w-24 sm:w-32` with ambient glow and `PosterCover ... big`) placed next to status badge (`SUDAH DITONTON` / `BELUM DITONTON`), TMDB badge, `<h1>` title, and metadata ledger (`year / runtime / Format Digital`).
  - Brings primary actions directly beneath the header: high-contrast "Buka Tautan Nonton" (or disabled fallback), "Catat Setelah Nonton" / "Edit Catatan Riset", and confirmation-protected Delete button (`ConfirmInline`).
  - Synopsis, Mood curation chips, and source links are accessible within the first 1–2 folds without scrolling through ~600px of media.
- **Desktop Dossier Preservation (`md:` and `lg:`):**
  - Left column remains a sticky 280px–320px sidebar with full hero poster and action buttons.
  - Right column maintains editorial watermark, title, metadata ledger, mood assignment, synopsis, watch link, FilmStripDivider, and Writer's Room research dossier.
- **Strictly Conditional Journal Kurator:**
  - Added `relatedJournals?: RelatedJournalSummary[]` prop to `MovieDetailViewProps`.
  - Conditioned with `relatedJournals && relatedJournals.length > 0`.
  - When empty or omitted, renders zero placeholder or fake journal data.
  - When populated, renders linked cards to `/journal/[id]` with title, date, and resonance note.
- **Safety Protection:** Delete action strictly requires inline confirmation (`ConfirmInline`).

---

## 4. Design Compliance & Tokens

- **Typography:**
  - Headings: Fraunces serif (`font-serif font-bold`).
  - Body & metadata: DM Sans (`font-sans`) and mono font (`font-mono`).
  - Badges & OSD watermarks: Silkscreen pixel art (`font-pixel text-[10px]`).
- **Color Tokens:**
  - Fully semantic via Tailwind `@theme` variables (`bg-surface`, `border-line`, `text-primary-bright`, `text-neon-magenta`, `text-lavender`, `text-ok`).
  - Zero hardcoded dark hex codes (`#121017` or `#0B0812`) in component code.
- **Touch Targets:**
  - All interactive buttons, chip pills, and links meet WCAG 2.5.5 / 2.5.8 standards (`>= 44 × 44 pt`).

---

## 5. Responsive Viewport Inspection

| Viewport | Screen Width | Home Dashboard | Movie Bank | Movie Detail |
|---|---|---|---|---|
| **Ultra-compact** | **320px** | Triple-bill snaps horizontally (card ~236px wide with 18% peek); collection stats tiles 2×2 without overflow. | 2-column grid (`gap-3`, cards 138px wide); `★` & `⚡` badges fit cleanly on one line without wrapping. | Compact poster (96px wide) + title/badges lockup fits in top 200px; actions and synopsis immediately visible. |
| **Small Mobile** | **360px** | Clean snap carousel, comfortable peek preview, touch targets accessible. | Cards 158px wide; rating numbers and potential badges comfortably spaced. | Header lockup balanced; primary buttons span full width with high visual contrast. |
| **Standard Mobile**| **390px** | Proportional snap scroller; stats tiles comfortably breathe; mood chips scroll cleanly. | Cards 173px wide; `/10` suffix appears cleanly without wrapping. | Editorial layout mirrors Stitch Group A mobile mockup with compact thumbnail and early synopsis. |
| **Large Mobile** | **430px** | Generous card previews in carousel; stats ledger easily legible. | Clean 2-column layout with ample margins. | Poster thumbnail slightly expands to 128px; actions aligned side-by-side. |
| **Desktop** | **>=768px** | Smooth transition to 3-column recommendation grid; horizontal overflow disabled. | 4 to 6-column catalog grid with hover elevation and glowing borders. | Classic 2-column sticky dossier layout preserved identically to Phase 8/Phase 14 baseline. |

---

## 6. Functional & Architectural Integrity Preserved

1. **Deterministic Hydration:** `HomeView` initial render (`shuffleKey === 0`) remains strictly deterministic, preventing SSR/CSR hydration mismatches.
2. **Real Data Integrity:** All movie counts, watch statuses, mood tags, and logs use authentic database records.
3. **No Database Changes:** Zero migrations created, zero schema modifications, zero backend changes.
4. **Shell Invariants:** Batch 1 shell components (`BottomNav`, `CreationDrawer`, `Footer`) were left untouched.
5. **Personal Writing Suite Isolation:** Personal Journal and Notes components were left untouched, awaiting Batch 3 and Batch 4.

---

## 7. Automated Test & Build Verification

### 7.1 Test Suite
```bash
npm test
```
**Result:**
- Total tests: **173 passed, 0 failed, 0 skipped** (506ms)
- New tests added: `tests/phase15_batch2_cinema.test.mjs` (4 tests covering Home snap carousel, MovieCard badge collision prevention, BankView responsive grid, and MovieDetailView mobile hierarchy & conditional Journal Kurator).

### 7.2 TypeScript Check
```bash
npm run type-check
```
**Result:**
- `tsc --noEmit`: **0 errors**

### 7.3 ESLint Check
```bash
npm run lint
```
**Result:**
- `eslint`: **0 warnings, 0 errors**

### 7.4 Next.js Production Build
```bash
npm run build
```
**Result:**
- Compiled successfully in 1049ms.
- 20 static and dynamic routes compiled without errors.

---

## 8. Git Status

```
On branch master
Your branch is up to date with 'origin/master'.

Changes not staged for commit:
	modified:   src/app/layout.tsx
	modified:   src/components/BottomNav.tsx
	modified:   src/components/CreationDrawer.tsx
	modified:   src/components/Footer.tsx
	modified:   src/components/MovieCard.tsx
	modified:   src/components/views/BankView.tsx
	modified:   src/components/views/HomeView.tsx
	modified:   src/components/views/MovieDetailView.tsx

Untracked files:
	docs/PHASE_15_0_IMPLEMENTATION_RECONNAISSANCE.md
	docs/PHASE_15_BATCH_1_IMPLEMENTATION_REPORT.md
	docs/PHASE_15_BATCH_2_IMPLEMENTATION_REPORT.md
	docs/phase-15/
	tests/phase15_batch1_shell.test.mjs
	tests/phase15_batch2_cinema.test.mjs
```
*(No commit or push performed, strictly obeying constraints).*

---

## 9. Known Limitations

- **Related Journals Data Feeding:** `MovieDetailView` is fully equipped to render the Journal Kurator section when `relatedJournals` is provided. If the backend query for movie-related journal entries is added in future batches or integrations, the component will display them automatically without requiring layout revisions.
- **TMDB Poster Fallbacks:** When a movie lacks a TMDB poster or local poster URL, the generative SVG fallback displays within the new compact thumbnail container.

---

> [!IMPORTANT]
> **STOP CONDITION ENFORCED:** Batch 2 is complete. No further files will be modified. Awaiting user review and authorization before proceeding to **Batch 3: Personal Writing Suite (Journal)**.
