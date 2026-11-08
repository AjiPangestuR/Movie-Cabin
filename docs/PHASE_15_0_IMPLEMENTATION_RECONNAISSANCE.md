# MOCAB — Phase 15.0: Implementation Reconnaissance & Mapping
**Project:** MOCAB (Movie Cabin) — Beruang Sastra  
**Document Type:** Technical Reconnaissance & Pre-Implementation Audit Report  
**Phase:** Phase 15 — Mobile UI/UX Redesign (Batch 0)  
**Author:** Antigravity Architect & Senior Frontend Reviewer  
**Date:** November 2026  
**Status:** Complete — Baseline Verified (READ-ONLY)  
**Deliverable File:** `docs/PHASE_15_0_IMPLEMENTATION_RECONNAISSANCE.md`  

---

## 1. Executive Summary & Verification Methodology

This reconnaissance report establishes the factual, code-level baseline of the MOCAB codebase prior to executing the Phase 15 Mobile UI/UX Redesign. All findings documented herein were verified through direct repository inspection, schema checks, automated test executions, and build validations.

### Verification Key
- **[VERIFIED]:** Direct code, configuration, or test result verified in the active repository.
- **[ASSUMPTION / PROPOSAL]:** Engineering interpretation or proposed implementation strategy subject to user review.
- **[UNKNOWN]:** Information that cannot be determined from the repository alone and requires user clarification or runtime testing.

---

## 2. Current Repository Baseline

### 2.1 Git State & Working Tree
- **[VERIFIED] Active Branch:** `master`
- **[VERIFIED] Recorded Baseline Commit:** `b92200ad423323620cf6c56afe169c7d2186024b` (`b92200a`)
- **[VERIFIED] Remote Synchronization:** Up to date with `origin/master`.
- **[VERIFIED] Working Tree Status:** Clean with respect to tracked files. Untracked documentation files exist in `docs/phase-15/` (`MOCAB_Phase_15_UI_UX_Implementation_Brief.md` and `PHASE_15_0_MOBILE_UI_AUDIT.md`). No unstaged or staged application modifications exist.

### 2.2 Framework & Dependency Versions (`package.json`)
- **[VERIFIED] Next.js:** `16.3.6` (App Router, Turbopack enabled)
- **[VERIFIED] React / React DOM:** `19.2.8` (React 19 Server Components & Actions)
- **[VERIFIED] Tailwind CSS:** `^4.0.0` (integrated via `@tailwindcss/postcss ^4` and `@theme` block in `globals.css`)
- **[VERIFIED] TypeScript:** `^5.0.0`
- **[VERIFIED] Supabase:** `@supabase/ssr ^0.12.7`, `@supabase/supabase-js ^2.118.0`
- **[VERIFIED] ESLint:** `^9.0.0` with `eslint-config-next 16.3.6`

### 2.3 Health Suite Status
Prior to any modifications, the existing codebase was subjected to the complete verification pipeline:
- **[VERIFIED] TypeScript Check (`npm run type-check`):** Exit Code 0 (0 type errors).
- **[VERIFIED] ESLint Check (`npm run lint`):** Exit Code 0 (0 lint warnings or errors).
- **[VERIFIED] Test Suite (`npm test`):** Exit Code 0 — **165 of 165 tests passing** (584ms duration).
- **[VERIFIED] Production Build (`npm run build`):** Exit Code 0 — Compiled and optimized all 19 dynamic and static routes cleanly with Next.js Turbopack.

---

## 3. Screen-to-Component Mapping

The following mapping establishes the exact relationship between the approved Stitch design groups and the actual repository implementation files.

### 3.1 Group A — Core Cinema Engine

| Approved Design Screen | Route | Page Controller | View Component | Key Subcomponents & Dependencies | Existing Data Services & Actions |
|---|---|---|---|---|---|
| **A1. Home Dashboard** | `/` | `src/app/page.tsx` (Server Component) | `src/components/views/HomeView.tsx` (Client Component) | `MovieCard.tsx`, `PosterCover.tsx`, `Badge.tsx`, `FilmStripDivider.tsx`, `EmptyState.tsx` | `listMovies()`, `listMoods()` in `src/lib/movies.ts` and `src/lib/moods.ts` |
| **A2. Movie Bank** | `/bank` | `src/app/bank/page.tsx` (Server Component) | `src/components/views/BankView.tsx` (Client Component) | `MovieCard.tsx`, `PosterCover.tsx`, `MoodChips.tsx`, `FilmStripDivider.tsx`, `EmptyState.tsx` | `listMovies()`, `listMoods()` in `src/lib/movies.ts` and `src/lib/moods.ts` |
| **A3. Movie Detail** | `/bank/[id]` | `src/app/bank/[id]/page.tsx` (Server Component) | `src/components/views/MovieDetailView.tsx` (Client Component) | `PosterCover.tsx`, `Badge.tsx`, `ConfirmInline.tsx`, `FilmStripDivider.tsx` | `getMovie()`, `deleteMovieAction()` in `src/lib/movies.ts` and `src/app/actions/` |
| **[Related] Reflection Log** | `/bank/[id]/catat` | `src/app/bank/[id]/catat/page.tsx` (Server Component) | `src/components/views/CatatView.tsx` (Client Component) | `NumberScale.tsx`, `Badge.tsx` | `saveLog()` in `src/lib/movies.ts` |
| **[Related] Add Movie** | `/add` | `src/app/add/page.tsx` (Server Component) | `src/components/views/AddMovieView.tsx` (Client Component) | `PosterCover.tsx`, `Badge.tsx` | `searchTmdbMovies()`, `createMovie()` via TMDB API routes |
| **[Related] Writer's Room Archive** | `/archive` | `src/app/archive/page.tsx` (Server Component) | `src/components/views/ArchiveView.tsx` (Client Component) | `PosterCover.tsx`, `Badge.tsx`, `FilmStripDivider.tsx` | `listMovies()` filtering watched movies with logs |

### 3.2 Group B — Personal Writing Suite

| Approved Design Screen | Route | Page Controller | View Component | Key Subcomponents & Dependencies | Existing Data Services & Actions |
|---|---|---|---|---|---|
| **B1. My Journal (Stream)** | `/journal` | `src/app/journal/page.tsx` (Server Component) | `src/components/views/journal/JournalListView.tsx` (mode='stream') | `JournalCard.tsx`, `MoodSelector.tsx`, `EmptyState.tsx`, `FilmStripDivider.tsx` | `listJournalEntries()` in `src/lib/journal.ts` |
| **B2. Chronicle Vault** | `/journal/archive` | `src/app/journal/archive/page.tsx` (Server Component) | `src/components/views/journal/JournalListView.tsx` (mode='archive') | `JournalCard.tsx`, `MoodSelector.tsx`, `EmptyState.tsx`, `FilmStripDivider.tsx` | `listJournalEntries()` in `src/lib/journal.ts` |
| **B3. Journal Editor (Create)** | `/journal/new` | `src/app/journal/new/page.tsx` (Server Component) | `src/components/views/journal/JournalEditorView.tsx` (mode='create') | `MoodSelector.tsx`, `MovieAttachmentDrawer.tsx`, `Toast.tsx` | `createJournalAction()`, `attachMovieAction()` in `src/app/actions/journalActions.ts` |
| **B3. Journal Editor (Edit)** | `/journal/[id]/edit` | `src/app/journal/[id]/edit/page.tsx` (Server Component) | `src/components/views/journal/JournalEditorView.tsx` (mode='edit') | `MoodSelector.tsx`, `MovieAttachmentDrawer.tsx`, `Toast.tsx` | `updateJournalAction()`, `attachMovieAction()`, `removeMovieAction()` |
| **[Related] Journal Detail** | `/journal/[id]` | `src/app/journal/[id]/page.tsx` (Server Component) | `src/components/views/journal/JournalDetailView.tsx` (Client Component) | `MoodSelector.tsx` (`MoodBadge`), `PosterCover.tsx`, `ConfirmInline.tsx` | `getJournalEntry()`, `deleteJournalAction()` in `src/lib/journal.ts` |
| **B4. Personal Notes** | `/notes` | `src/app/notes/page.tsx` (Server Component) | `src/components/views/notes/NotesListView.tsx` (Client Component) | `NoteCard.tsx`, `EmptyState.tsx`, `Toast.tsx` | `listNotes()`, `createNoteAction()`, `pinNoteAction()`, `unpinNoteAction()`, `deleteNoteAction()` |
| **B5. Note Editor (Create)** | `/notes/new` | `src/app/notes/new/page.tsx` (Server Component) | `src/components/views/notes/NoteEditorView.tsx` (mode='create') | `Toast.tsx` | `createNoteAction()` in `src/app/actions/notesActions.ts` |
| **B5. Note Editor (Edit)** | `/notes/[id]` | `src/app/notes/[id]/page.tsx` (Server Component) | `src/components/views/notes/NoteEditorView.tsx` (mode='edit') | `ConfirmInline.tsx`, `Toast.tsx` | `updateNoteAction()`, `deleteNoteAction()` in `src/app/actions/notesActions.ts` |

### 3.3 Group C — Global System Overlays

| Approved Design Screen | Mounting Location | Controlling Component | Rendered Overlay Component | Existing Data Services & Actions |
|---|---|---|---|---|
| **C1. Bottom Navigation** | `src/app/layout.tsx` | Client render on `<BottomNav />` | `src/components/BottomNav.tsx` | Route state via Next.js `usePathname()`. Excludes `/login`. 5 slots: Home, Bank, (+), Archive, Profile. |
| **C2. Creation Drawer** | `src/components/BottomNav.tsx` | `isDrawerOpen` state triggered by central (+) button | `src/components/CreationDrawer.tsx` | Direct navigation routes: `/add`, `/journal/new`, `/notes/new`. |
| **C3. Global Search** | `src/components/Header.tsx` (and mobile search button) | `isSearchOpen` state triggered by Ctrl+K or search button | `src/components/SearchModal.tsx` | `listMovies()` in `src/lib/movies.ts`. Currently queries movies only. |
| **C4. Curator Profile** | `/profile` (`src/app/profile/page.tsx`) | Server page passing `userEmail`, `movies`, `moods` | `src/components/views/ProfileView.tsx` | Supabase Auth session (`getUser()`), `signOutAction()`, PWA install triggers via `useSyncExternalStore`. |

---

## 4. Reusable Component Inventory

| Component Name | File Path | Props Contract & Variants | Current Mobile Behavior & Reusability in Phase 15 |
|---|---|---|---|
| `Badge` | `src/components/Badge.tsx` | `variant: 'movie' \| 'watched' \| 'analysis' \| 'review' \| 'custom'`, `size: 'xs' \| 'sm' \| 'md'` | Fully reusable. Uses Silkscreen font, rounded pill containers, and theme variables. |
| `PosterCover` | `src/components/PosterCover.tsx` | `title`, `year`, `runtime`, `posterUrl`, `identifier`, `done`, `big`, `aspectRatio` | 2:3 aspect ratio poster cover. Supports TMDB URLs and generative VHS typographical fallbacks. |
| `MovieCard` | `src/components/MovieCard.tsx` | `movie: Movie`, `onToggleDone?: (id) => void` | Used in 2-column mobile grids. Bottom rating badges wrap on 320px screens. |
| `NumberScale` | `src/components/NumberScale.tsx` | `value`, `onChange`, `min=1`, `max=10`, `ariaLabelPrefix` | Fully responsive (`grid-cols-5 sm:grid-cols-10`). Generous 44px tap targets. |
| `FilmStripDivider` | `src/components/FilmStripDivider.tsx` | `label?: string`, `className?: string` | Pure CSS/SVG vintage sprocket holes divider. Lightweight and responsive. |
| `EmptyState` | `src/components/EmptyState.tsx` | `title`, `description`, `actionText`, `actionHref`, `onAction`, `primaryAction` | Standardized empty state featuring the Beruang Sastra paw stamp artwork. |
| `ConfirmInline` | `src/components/ConfirmInline.tsx` | `isConfirming`, `onInitiate`, `onConfirm`, `onCancel`, `promptText`, `confirmText`, `cancelText`, `triggerText` | Two-step inline deletion confirmation. Reusable, but needs compact reflow on 320px widths. |
| `MoodSelector` & `MoodBadge` | `src/components/views/journal/MoodSelector.tsx` | `selectedMood`, `onSelectMood`, `allowClear`, `size?: 'xs' \| 'sm' \| 'md'` | 8 preset moods with distinct pastel neon borders and active states. Reusable across Journal and Search. |
| `JournalCard` | `src/components/views/journal/JournalCard.tsx` | `entry: JournalEntry`, `showActions?: boolean` | Editorial card with tape metadata, word count, excerpt, and movie resonance pill. |
| `NoteCard` | `src/components/views/notes/NoteCard.tsx` | `note: PersonalNote`, `onTogglePin`, `onDelete` | Memo board card with pinned indicator, tags, title, and body excerpt. |
| `CreationDrawer` | `src/components/CreationDrawer.tsx` | `isOpen: boolean`, `onClose: () => void` | Bottom-sheet dialog with backdrop blur, focus trapping, and safe-area inset support. |
| `SearchModal` | `src/components/SearchModal.tsx` | `isOpen: boolean`, `onClose: () => void` | Full-screen modal with keyboard navigation. Reusable foundation for multi-category search. |
| `ThemeToggle` | `src/components/ThemeToggle.tsx` | Zero props (reads/writes theme state) | Toggles `data-theme="dark"` and `data-theme="light"` on document root without hydration mismatch. |
| `Toast` | `src/components/Toast.tsx` | `useToast()` hook exporting `showToast(msg, isError)` | Global bottom-docked notification container with animated entrance. |

---

## 5. Existing Design Token Inventory

### 5.1 CSS Variables & Semantic Mapping (`src/app/globals.css`)
All tokens are defined in `src/app/globals.css` under the `@theme` block and mapped via CSS custom properties:

```css
@theme {
  --color-bg: var(--bg);
  --color-surface: var(--surface);
  --color-surface-elevated: var(--surface-elevated);
  --color-surface-hover: var(--surface-hover);
  --color-primary: var(--primary);
  --color-primary-bright: var(--primary-bright);
  --color-neon-magenta: var(--neon-magenta);
  --color-lavender: var(--lavender);
  --color-text: var(--text);
  --color-text-subtle: var(--text-subtle);
  --color-muted: var(--muted);
  --color-line: var(--line);
  --color-line-subtle: var(--line-subtle);
  --color-ok: var(--ok);
  --color-danger: var(--danger);
  --color-amber: var(--amber);
  --font-serif: var(--font-fraunces), Georgia, serif;
  --font-sans: var(--font-dm-sans), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-pixel: var(--font-pixel), 'Courier New', monospace;
}
```

### 5.2 Dark vs. Light Theme Palette Values
- **Dark Mode (`[data-theme='dark']` / `:root`):**
  - Background: `#0B0812`
  - Surface: `#15101F`
  - Surface Elevated: `#21152E`
  - Surface Hover: `#2C1C3D`
  - Primary: `#9B35E8`
  - Primary Bright: `#C16BFF`
  - Neon Magenta: `#F044C8`
  - Lavender: `#D9B0FF`
  - Text: `#F8F0FF`
  - Text Subtle: `#D9B0FF`
  - Muted: `#A99AB8`
  - Border (Line): `#352044`
  - OK: `#8FB89A` | Danger: `#F04468` | Amber: `#E5A967`
- **Light Mode (`[data-theme='light']` / `.light`):**
  - Background: `#F7F1FC`
  - Surface: `#FFFFFF`
  - Surface Elevated: `#EFE3F8`
  - Surface Hover: `#E6D3F2`
  - Primary: `#792DB5`
  - Primary Bright: `#9B35E8`
  - Neon Magenta: `#D82EAA`
  - Lavender: `#6A4A87`
  - Text: `#291536`
  - Text Subtle: `#6A4A87`
  - Muted: `#796783`
  - Border (Line): `#E2D0ED`
  - OK: `#3B8754` | Danger: `#D82E4D` | Amber: `#C97E2E`

### 5.3 Responsive Breakpoints & Mobile Safe Insets
- **[VERIFIED] Tailwind Breakpoints:**
  - `sm`: `640px`
  - `md`: `768px` (primary desktop threshold; mobile bottom nav hidden above `md`)
  - `lg`: `1024px`
  - `xl`: `1280px`
- **[VERIFIED] Mobile Safe Areas:**
  - `pb-[calc(8px+env(safe-area-inset-bottom))]` used in `BottomNav.tsx`
  - `pb-[calc(24px+env(safe-area-inset-bottom))]` used in `CreationDrawer.tsx`

---

## 6. Identified Technical Constraints & Guardrails

### 6.1 Database & Security Constraints (Non-Negotiable)
1. **[VERIFIED] Tables & Schema:**
   - `public.movies`, `public.watch_logs`, `public.moods`, `public.movie_moods`
   - `public.journal_entries`, `public.journal_movie_relations`, `public.personal_notes`
   - **Zero Schema Modifications:** Phase 15 does not add tables, columns, constraints, or migrations.
2. **[VERIFIED] Row Level Security (RLS) & Cross-Ownership:**
   - Every operation enforces `auth.uid() = user_id`.
   - `validate_journal_movie_ownership()` enforces cross-table ownership between journal entries and movies with `SET search_path = ''`.
3. **[VERIFIED] Private-by-Default Writing:**
   - Journal entries and Personal Notes have no public sharing, social feeds, followers, or external exposure.

### 6.2 Service & Action Boundaries
1. **[VERIFIED] Journal Business Logic:**
   - `src/lib/journal.ts` and `src/app/actions/journalActions.ts`:
   - Title: 1–200 characters.
   - Draft content: Allowed to be empty (`content = ''`).
   - Published content: Must have non-whitespace content (`char_length(trim(content)) >= 1`).
   - Moods: Strictly restricted to 8 presets (`Melankolis`, `Kontemplatif`, `Nostalgia`, `Tenang`, `Resah`, `Hangat`, `Puitis`, `Soliter`).
   - Movie attachments: At most 1 movie relation per entry supported in current UI flow; resonance note max 500 characters.
2. **[VERIFIED] Personal Notes Business Logic:**
   - `src/lib/notes.ts` and `src/app/actions/notesActions.ts`:
   - Title: Optional (stored as empty string `''` if omitted; max 200 chars).
   - Content: Required (1–10,000 characters).
   - Pinned status: Boolean flag.
   - Decoupled from movies and watch logs. Quick Scratchpad saves directly to `personal_notes`.

---

## 7. Potential Implementation Conflicts & Risks

### Conflict 1: Global Footer Obscuration (P0/P1)
- **[VERIFIED Defect]:** In `src/app/layout.tsx`:
  ```tsx
  <div id="app" className="min-h-screen flex flex-col pb-[100px] md:pb-0">
    <Header />
    <main id="main-content" className="flex-1 max-w-[1100px] w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
      {children}
    </main>
  </div>
  <Footer />
  <BottomNav />
  ```
- **Analysis:** `<Footer />` sits outside `div#app` (which has `pb-[100px]`). Because `<BottomNav />` is `fixed bottom-0` with height ~60px–94px, the bottom 30px–60px of the footer (including TMDB attribution link and OSD status) is obscured.
- **[PROPOSAL] Treatment in Batch 1:** Add `pb-[calc(88px+env(safe-area-inset-bottom))] md:pb-8` directly to `Footer.tsx` or move `<Footer />` inside `div#app` preceding the bottom spacer.

### Conflict 2: Movie Detail Hierarchy vs. Giant Poster (P1)
- **[VERIFIED Defect]:** In `MovieDetailView.tsx`, on viewports `<768px`, the left column renders first. The poster expands to 100% width (`~540px` tall on 390px screens), followed immediately by 3 action buttons. The movie title, year, runtime, and synopsis are pushed completely below the first two viewport folds.
- **[PROPOSAL] Treatment in Batch 2:** Re-architect mobile view to display an editorial header with a compact poster thumbnail floated beside Title, Year, and Synopsis, moving actions into a clear button dock without hiding movie identity.

### Conflict 3: Triple-Bill Height Inflation on Home (P1)
- **[VERIFIED Defect]:** In `HomeView.tsx`, 3 Triple-Bill recommendation cards render as a vertical 1-column stack on mobile with full-width `PosterCover` (`aspect-[2/3]`), creating **~2,160px of vertical scrolling** before reaching collection metrics.
- **[PROPOSAL] Treatment in Batch 2:** Transform mobile Triple-Bill into a horizontal snap-carousel (`overflow-x-auto snap-x flex`) with card peek preview (85% card width visible + 15% next card peek), preserving the feature while reducing height to ~380px.

### Conflict 4: Sticky Action Bar Collisions with Virtual Keyboard (P1)
- **[VERIFIED Defect]:** In `JournalEditorView.tsx`, `sticky bottom-4 z-20` floats over content. When the software keyboard opens on mobile, the viewport shrinks, causing the sticky bar to jump over the active textarea and obscure typing cursors.
- **[PROPOSAL] Treatment in Batch 3:** On mobile screens, dock save/publish controls into the top navigation bar (matching standard mobile writing apps like Apple Notes / Medium) or place them in natural document flow.

### Conflict 5: SearchModal Multi-Category Expansion (Group C3)
- **[VERIFIED Architecture Gap]:** `SearchModal.tsx` currently only queries `listMovies()`. The Phase 15 Brief requires searching Movies, Journal entries, and Personal Notes.
- **[VERIFIED Service Availability]:** Both `src/lib/journal.ts` (`listJournalEntries({ search })`) and `src/lib/notes.ts` (`listNotes({ search })`) already have full-text search capability.
- **[PROPOSAL] Treatment in Batch 1:** Enhance `SearchModal.tsx` with a category tab switcher (`Semua`, `Film`, `Jurnal`, `Catatan`) that leverages existing services without fabricating fake search results or adding unnecessary dependencies.

### Conflict 6: Automated Test Contract Preservation
- **[VERIFIED Constraint]:** Existing tests in `tests/` explicitly assert DOM element attributes, data-testids, and layout classes (e.g. `tests/phase14_3_ui.test.mjs`, `tests/phase14_4_ui.test.mjs`, `tests/phase14_5_navigation.test.mjs`, `tests/ui_polish.test.mjs`).
- **[RISK]:** Modifying component markup carelessly could break these 165 tests.
- **[SAFEGUARD]:** All existing `data-testid` attributes (e.g. `journal-card`, `note-card`, `creation-drawer`, `bottomnav-home`) must be strictly preserved during styling adjustments.

---

## 8. Recommended Implementation Sequence

To minimize risk and ensure reviewability, the redesign is structured into **six disciplined batches**:

```
Batch 0: Baseline & Mapping (COMPLETE)
   │
   ▼
Batch 1: Shared Shell & Global Overlays
   ├── Fix Footer/BottomNav overlap
   ├── Bottom Navigation responsive refinements
   ├── Creation Drawer accessibility & touch polish
   ├── SearchModal multi-category search layout (Movies, Journal, Notes)
   └── Curator Profile settings layout (supported data only)
   │
   ▼
Batch 2: Core Cinema Engine
   ├── HomeView mobile hierarchy & Triple-Bill snap carousel
   ├── MovieBank 2-column card compact badge reflow (320px–360px)
   └── MovieDetailView mobile editorial hierarchy reordering
   │
   ▼
Batch 3: Personal Journal Suite
   ├── My Journal stream & filter consolidation
   ├── Chronicle Vault month/year jumper reflow
   └── Journal Editor keyboard-safe actions & attachment drawer
   │
   ▼
Batch 4: Personal Notes Suite
   ├── Personal Notes list & pinned notes memo board
   ├── Quick Scratchpad compact mobile layout
   └── Note Editor layout, optional title handling & keyboard safety
   │
   ▼
Batch 5: Consolidation, Cross-Device Verification & Regression
   ├── Multi-viewport audit (320px, 360px, 375px, 390px, 430px)
   ├── Full automated test suite verification (165+ tests)
   ├── TypeScript, ESLint, and Production build checks
   └── Final Phase 15 completion report
```

---

## 9. Files Likely to Be Modified in Each Implementation Batch

### Batch 1 — Shared Shell & Global Overlays
- `src/components/Footer.tsx` (Add bottom clearance for mobile BottomNav)
- `src/app/layout.tsx` (Reconcile container bottom padding if needed)
- `src/components/BottomNav.tsx` (Touch targets, active states, labels)
- `src/components/CreationDrawer.tsx` (Accessibility, touch handle, dialog focus)
- `src/components/SearchModal.tsx` (Multi-category tabs for Movies, Journal, Notes)
- `src/components/views/ProfileView.tsx` (Settings layout, PWA install card)
- `src/app/profile/page.tsx` (Pass dynamic counts for Journal and Notes if approved)

### Batch 2 — Core Cinema Engine
- `src/components/views/HomeView.tsx` (Triple-Bill snap-carousel, compact stats)
- `src/components/views/BankView.tsx` (Compact filter bar, list mode toggle)
- `src/components/MovieCard.tsx` (Badge reflow on 320px–360px viewports)
- `src/components/views/MovieDetailView.tsx` (Re-architect mobile layout: poster + header + synopsis + actions)

### Batch 3 — Personal Journal Suite
- `src/components/views/journal/JournalListView.tsx` (Compact mobile filter bar)
- `src/components/views/journal/JournalCard.tsx` (Header badge wrapping & tap targets)
- `src/components/views/journal/JournalDetailView.tsx` (Reading measure & inline delete reflow)
- `src/components/views/journal/JournalEditorView.tsx` (Keyboard-safe action controls)
- `src/components/views/journal/MovieAttachmentDrawer.tsx` (Mobile bottom-sheet picker refactor)

### Batch 4 — Personal Notes Suite
- `src/components/views/notes/NotesListView.tsx` (Quick Scratchpad mobile bar & memo grid)
- `src/components/views/notes/NoteCard.tsx` (Tap targets, pin indicator, delete flow)
- `src/components/views/notes/NoteEditorView.tsx` (Textarea sizing, keyboard safety, pin toggle in header)

### Batch 5 — Consolidation & Regression
- `tests/phase15_mobile_regression.test.mjs` (New test suite for mobile regressions & multi-category search)
- `docs/PHASE_15_IMPLEMENTATION_REPORT.md` (Final completion report)

---

## 10. Testing Strategy

1. **Static Analysis & Type Integrity:**
   - `npm run type-check` after every batch.
   - `npm run lint` after every batch.
2. **Automated Unit & Service Regression:**
   - Run `npm test` before and after every batch.
   - All 165 existing tests must remain green.
   - Add new static/unit tests in `tests/` verifying mobile fixes (e.g., footer padding, search categories, keyboard safety).
3. **Production Build Validation:**
   - `npm run build` executed at the conclusion of each batch to catch Turbopack/SSR anomalies.
4. **Multi-Viewport Responsive Verification:**
   - Test every modified screen at five standard mobile viewports:
     - `320 × 568 px` (iPhone SE 1st gen / ultra-narrow boundary)
     - `360 × 800 px` (Samsung Galaxy S / Android standard)
     - `375 × 812 px` (iPhone Mini / X / XS)
     - `390 × 844 px` (iPhone 12 / 13 / 14 baseline)
     - `430 × 932 px` (iPhone Pro Max / flagships)
5. **No Blind Commit or Push:**
   - Adhere strictly to the stop condition: present changes for user review at the end of each batch.

---
*Report concluded. MOCAB Phase 15 Batch 0 (Reconnaissance & Mapping) complete. Ready for Batch 1 authorization.*
