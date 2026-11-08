# MOCAB — PHASE 14.5.0 PRE-IMPLEMENTATION NAVIGATION AUDIT
## NAVIGATION INTEGRATION & RECONCILIATION AUDIT

**Project:** Movie Cabin (MOCAB) — Beruang Sastra  
**Author:** Antigravity AI  
**Date:** 2026-11-08  
**Baseline Git Branch:** `master`  
**Phase:** 14.5 — Navigation Integration & Reconciliation  

---

## 1. EXECUTIVE SUMMARY

With the completion of **Phase 14.1** (Database), **Phase 14.2** (Data Services & Server Actions), **Phase 14.3** (Personal Journal UI), and **Phase 14.4** (Personal Notes UI), MOCAB's personal writing architecture is fully built and operational.

The objective of **Phase 14.5** is to integrate these new writing capabilities into the primary application navigation across Desktop, Tablet, and Mobile, adhering strictly to **Approach C** approved by the user.

### Approach C Overview:
1. **Desktop Header:** Add direct links to **Journal** (`/journal`) and **Notes** (`/notes`) alongside the existing `Home` (`/`), `Movie Bank` (`/bank`), and `Archive` (`/archive`).
2. **Mobile BottomNav:** Preserve the 5-slot architecture (`Home`, `Bank`, `+`, `Archive`, `Profile`) without adding 6th/7th slots.
3. **Retro VHS Creation Drawer:** Transform the center floating `+` button in `BottomNav` into an interactive trigger for a themed Creation Drawer providing three distinct actions:
   - **Rekam Film Baru** (`/add`)
   - **Tulis Jurnal** (`/journal/new`)
   - **Catatan Cepat** (`/notes/new`)

---

## 2. EXISTING NAVIGATION ARCHITECTURE AUDIT

### Desktop Header (`src/components/Header.tsx`)
- **Container:** Sticky `top-0 z-30 h-16 bg-surface/90 backdrop-blur-md border-b border-line/60`. Max width `1100px`.
- **Brand Identity:** Left-aligned VHS horizontal logo (`/brand/logo-horizontal.webp`, h-8 to h-9).
- **Navigation Bar (`hidden md:flex`):**
  - Current links: `Home` (`/`), `Movie Bank` (`/bank`), `Archive` (`/archive`).
  - Active indicator: `bg-neon-magenta/15 text-neon-magenta font-semibold border border-neon-magenta/35 shadow-xs shadow-neon-magenta/10`.
- **Right Action Controls:**
  - Search trigger button with keyboard badge (`Ctrl K`).
  - Quick Add button (`/add`, `hidden lg:inline-flex`).
  - `ThemeToggle` component.
  - Sign-out button (`signOutAction`).

### Mobile Bottom Navigation (`src/components/BottomNav.tsx`)
- **Container:** Fixed bottom `left-0 right-0 bottom-0 bg-surface/95 backdrop-blur-lg border-t border-line/80 z-30 pb-[calc(8px+env(safe-area-inset-bottom))]`.
- **Grid Layout:** Exactly 5 slots (`max-w-md mx-auto grid grid-cols-5`):
  1. `Home` (`/`)
  2. `Bank` (`/bank`)
  3. `+` Floating Action Button (`/add` currently hardcoded as a direct Link)
  4. `Archive` (`/archive`)
  5. `Profile` (`/profile`)
- **Active State Token:** `text-neon-magenta font-semibold` on active slot, `text-muted` on idle.

---

## 3. ROUTE HIERARCHY & ACTIVE STATE ANALYSIS

To prevent route conflicts or duplicate active highlights:

| Route Path | Active Slot / Link | Matching Rule | Conflict Mitigation |
|---|---|---|---|
| `/` | Home | `pathname === '/'` | Strict equality prevents root from matching `/bank`, `/journal`, etc. |
| `/bank` | Movie Bank | `pathname.startsWith('/bank') && !pathname.includes('/catat')` | Accurately highlights catalogue & film dossiers. |
| `/bank/[id]/catat` | None (or Movie Bank) | Research log subroute | Subroute of movie bank dossier. |
| `/archive` | Archive | `pathname === '/archive'` | Strict equality ensures `/journal/archive` does NOT highlight Movie Archive. |
| `/journal` | Journal | `pathname.startsWith('/journal')` | Captures `/journal`, `/journal/archive`, `/journal/new`, `/journal/[id]`. |
| `/notes` | Notes | `pathname.startsWith('/notes')` | Captures `/notes`, `/notes/new`, `/notes/[id]`. |
| `/add` | Add / Creation | `pathname === '/add'` | Highlighted when adding movie. |
| `/profile` | Profile | `pathname.startsWith('/profile')` | Captures profile and account settings. |

### Elimination of Route Collisions:
- **`/archive` vs `/journal/archive`:** Because Movie Archive checks `pathname === '/archive'`, navigating to `/journal/archive` will highlight `Journal`, never `Archive`.
- **No Multi-Selection:** Every possible application URL resolves to exactly one primary active link or no active link.

---

## 4. RETRO VHS CREATION DRAWER SPECIFICATION

### Trigger Interaction
- Located at the center slot of `BottomNav`.
- Semantic `<button type="button" aria-haspopup="dialog" aria-expanded={isOpen} aria-label="Buka menu kreasi baru">`.
- Animated icon: rotates $45^\circ$ into an "×" or scales gracefully when active.

### Drawer Structure & Layout
```
┌────────────────────────────────────────────────────────┐
│  [Dark Backdrop: bg-black/70 backdrop-blur-sm]         │
│                                                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │  CREATION CONSOLE // KREASI BARU         [×]     │  │
│  │  Pilih Aksi Kreasi                               │  │
│  ├──────────────────────────────────────────────────┤  │
│  │  [🎬] Rekam Film Baru                   [MOVIE]  │  │
│  │       Tambah film dan catatan ke rak koleksi     │  │
│  │       Route: /add                                │  │
│  ├──────────────────────────────────────────────────┤  │
│  │  [✒️] Tulis Jurnal                    [JOURNAL]  │  │
│  │       Tuangkan renungan batin & resonansi sinema │  │
│  │       Route: /journal/new                        │  │
│  ├──────────────────────────────────────────────────┤  │
│  │  [⚡] Catatan Cepat                     [MEMO]   │  │
│  │       Tangkap ide kilat, kutipan, atau dialog    │  │
│  │       Route: /notes/new                          │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

### Accessibility & Mechanical Integrity
1. **Focus Trap & Keyboard Support:**
   - Pressing `Escape` closes the drawer immediately.
   - Focus is shifted to the drawer upon opening and returned to the `+` trigger button upon closing.
2. **Backdrop & Scroll Lock:**
   - Clicking outside (on the backdrop overlay) dismisses the drawer.
   - Body scroll is locked (`overflow: hidden`) while the drawer is rendered, preventing background drag on mobile browsers.
3. **Mobile Viewport & Safe-Area Insets:**
   - Renders at `z-50` above `BottomNav` (`z-30`).
   - Padding bottom incorporates `env(safe-area-inset-bottom)` to accommodate home indicators on iOS and gesture bars on Android.
4. **Transition & Dismissal:**
   - Selecting any of the three options closes the drawer and smoothly navigates via Next.js client router.

---

## 5. IMPACT ASSESSMENT & BREAKPOINTS

- **Desktop (>= 1024px):** Header effortlessly accommodates 5 navigation links (`Home`, `Movie Bank`, `Archive`, `Journal`, `Notes`) alongside search, quick add, theme toggle, and logout within the 1100px container.
- **Tablet (768px - 1023px):** Header adjusts horizontal gaps and font sizing (`text-xs lg:text-sm`, `gap-1 lg:gap-1.5`) to prevent overflow. Quick add button is gracefully hidden at `< lg` as already designed.
- **Mobile (< 768px):** Header displays logo, search button, theme toggle, and logout. All primary navigation is handled by the 5-slot `BottomNav` and the Creation Drawer.

---

## 6. READINESS ASSESSMENT

All requirements for Approach C are validated against the codebase.
Implementation can proceed immediately:
1. Create `src/components/CreationDrawer.tsx`.
2. Update `src/components/BottomNav.tsx` to integrate the Creation Drawer.
3. Update `src/components/Header.tsx` to add `Journal` and `Notes` links with active state.
4. Implement `tests/phase14_5_navigation.test.mjs`.
5. Run full test suite, lint, type check, and build verification.
