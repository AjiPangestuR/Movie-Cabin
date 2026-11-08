# MOCAB — PHASE 14.3.0 PRE-IMPLEMENTATION UI AUDIT
## PERSONAL JOURNAL UI ARCHITECTURE & DESIGN AUDIT

**Project:** Movie Cabin (MOCAB) — Beruang Sastra  
**Author:** Antigravity AI  
**Date:** 2026-11-08  
**Baseline Git Branch:** `master`  
**Phase:** 14.3 — Personal Journal UI Implementation  

---

## 1. EXECUTIVE SUMMARY

Following the approved completion of **Phase 14.1** (Database Foundation & Security Hardening) and **Phase 14.2** (Data Services & Server Actions), this audit establishes the complete blueprint for **Phase 14.3: Personal Journal UI Implementation**.

The objective of Phase 14.3 is to deliver the full client interface for the Personal Journal feature across five dedicated routes:
1. `/journal` — My Journal stream (chronological personal writing stream with search, mood filters, date filter, tag filters, and draft indicators).
2. `/journal/archive` — Journal Archive / Chronicle Vault (chronological vault view with search, year/month filtering, and timeline cards).
3. `/journal/[id]` — Journal Detail (high-gravity editorial reader view with Fraunces typography, resonance blockquotes, linked movie cards, edit and inline delete).
4. `/journal/new` — Create Journal (hybrid writing canvas with distraction-free typography and collapsible metadata drawer for date, mood, tags, and movie attachment).
5. `/journal/[id]/edit` — Edit Journal (prefilled editor with movie management, resonance note editing, draft saving, and publishing).

### Scope Boundaries Enforced in Phase 14.3:
- **Zero Schema or Migration Changes:** Database tables, triggers, and RLS policies remain untouched.
- **Zero Changes to Movie Notes (`watch_logs`):** Creator video essay logs remain strictly separated from introspective journals.
- **No Navigation Modification:** `Header.tsx` and `BottomNav.tsx` remain untouched (Navigation integration is strictly reserved for Phase 14.5).
- **No Notes UI (`/notes`):** Personal Notes UI is strictly reserved for Phase 14.4.
- **No Unsanctioned Git Commits:** Working tree remains local without automatic commits or pushes.

---

## 2. DESIGN SYSTEM & RETRO VHS CINEMA COMPLIANCE

The UI strictly adheres to MOCAB's established design identity:
$$\text{Visual Ratio} = 70\% \text{ Modern Cinematic UI} + 20\% \text{ Retro VHS Identity} + 10\% \text{ Pixel Art Decoration}$$

### Typography Tokens
- **Editorial Headings:** `font-serif` (Fraunces variable font) — used for journal titles, detail reader headlines, and section banners.
- **Body & Prose:** `font-sans` (DM Sans) — used for journal reading paragraphs, form fields, and narrative excerpts.
- **Technical OSD & Badges:** `font-pixel` (Silkscreen) — used for tape counters, date stamps, status badges (`DRAFT`, `PUBLISHED`, `TAPE: 24:00`), and category labels.

### Theme Tokens & Color Palette
- **Dark Mode (Default):**
  - Background: `#0B0812` (`var(--bg)`)
  - Primary Surface: `#15101F` (`var(--surface)`)
  - Elevated Surface: `#21152E` (`var(--surface-elevated)`)
  - Border Lines: `#352044` (`var(--line)`)
  - Accents: Signature Purple `#9B35E8` (`var(--primary)`), Neon Violet `#C16BFF` (`var(--primary-bright)`), Neon Magenta `#F044C8` (`var(--neon-magenta)`).
- **Light Mode (Retro Lavender):**
  - Background: `#F7F1FC`
  - Primary Surface: `#FFFFFF`
  - Elevated Surface: `#F2E9F7`
  - Border Lines: `#E2D0ED`
  - Accent: Deep Purple `#7A1BBF`

### Component Reuse Matrix
| Existing Component | File Path | Phase 14.3 Journal Usage |
|---|---|---|
| `<Badge>` | `src/components/Badge.tsx` | Status indicators (`DRAFT`, `PUBLISHED`), mood presets, and category pills |
| `<PosterCover>` | `src/components/PosterCover.tsx` | Movie cards embedded within journal entries and detail views |
| `<EmptyState>` | `src/components/EmptyState.tsx` | Zero-state states with Beruang Sastra paw stamp (`/brand/avatar-paw.webp`) |
| `<ConfirmInline>` | `src/components/ConfirmInline.tsx` | Two-step inline confirmation for journal deletion |
| `<FilmStripDivider>`| `src/components/FilmStripDivider.tsx`| Editorial divider between date-grouped timeline entries |
| `<LoadingSpinner>` | `src/components/LoadingSpinner.tsx` | Async action feedback and loading states |
| `useToast()` | `src/components/Toast.tsx` | Success/error feedback for draft saving, publishing, deleting, and movie attachment |

---

## 3. COMPONENT & ROUTE ARCHITECTURE

### Directory Structure Plan
```
src/
├── app/
│   └── journal/
│       ├── page.tsx                  // Server Component: /journal (My Journal Stream)
│       ├── archive/
│       │   └── page.tsx              // Server Component: /journal/archive (Chronicle Vault)
│       ├── new/
│       │   └── page.tsx              // Server Component: /journal/new (Create Journal)
│       └── [id]/
│           ├── page.tsx              // Server Component: /journal/[id] (Journal Detail)
│           └── edit/
│               └── page.tsx          // Server Component: /journal/[id]/edit (Edit Journal)
└── components/
    └── views/
        └── journal/
            ├── JournalListView.tsx       // Client View for /journal and /journal/archive
            ├── JournalDetailView.tsx     // Client View for /journal/[id]
            ├── JournalEditorView.tsx     // Client View for /journal/new and /journal/[id]/edit
            ├── JournalCard.tsx           // Stream / Timeline card component
            ├── MoodSelector.tsx          // 8-preset mood chip selector
            └── MovieAttachmentDrawer.tsx // Search & attach movie picker with resonance note
```

### Route & Data Flow Breakdown

#### 1. `/journal` (Stream View)
- **Data Fetching:** Calls `listJournals({ page: 1, limit: 20 })` server-side.
- **Client Features:**
  - Real-time client-side and server-supported search filtering.
  - 8-preset mood filter pills (`Melankolis`, `Kontemplatif`, `Nostalgia`, `Tenang`, `Resah`, `Hangat`, `Puitis`, `Soliter`).
  - Draft vs Published status filter.
  - Date filter input.
  - Active tag filtering.
  - Quick link to `+ Tulis Jurnal` (`/journal/new`) and `Arsip Kronologis` (`/journal/archive`).
  - Empty state with paw stamp avatar when no entries match.

#### 2. `/journal/archive` (Vault View)
- **Data Fetching:** Calls `getJournalArchive(1, 50)` server-side.
- **Client Features:**
  - Timeline grouping by Month & Year (`Februari 2026`, etc.).
  - Year quick jumpers ("Lompatan Masa").
  - Film strip dividers separating chronological epochs.
  - Search and tag filtering.

#### 3. `/journal/[id]` (Detail View)
- **Data Fetching:** Calls `getJournal(id)` server-side (automatically pulls `relatedMovies` with poster paths).
- **Client Features:**
  - Editorial reading container (`max-w-[760px]`).
  - Fraunces serif headline, date stamp, mood badge, reading time estimate, and word count.
  - Prose rendering with preserved paragraph breaks and editorial styling.
  - Attached movie section: renders `PosterCover`, movie title, release year, runtime, and blockquoted `resonanceNote`.
  - Actions: Edit button (`/journal/[id]/edit`) and Delete button with `<ConfirmInline>`.
  - Back navigation button returning to `/journal`.

#### 4. `/journal/new` (Create View)
- **Data Fetching:** Calls `listMovies()` server-side to provide autocomplete candidate movies for attachment.
- **Client Features:**
  - Hybrid editor layout: distraction-free main writing area.
  - Collapsible metadata drawer (date picker defaulting to today, 8 mood chips, tag adder, movie attachment picker).
  - Actions: "Simpan Draft" (creates draft, content optional) and "Publikasikan Jurnal" (creates published entry, content required).
  - Toast notification and auto-redirection on success.

#### 5. `/journal/[id]/edit` (Edit View)
- **Data Fetching:** Calls `getJournal(id)` and `listMovies()` server-side.
- **Client Features:**
  - Prefilled form fields with existing entry data.
  - Movie attachment management: attach new movie, detach existing movie via `removeMovieAction`, edit resonance note via `updateResonanceNoteAction`.
  - Actions: "Simpan Perubahan" and "Publikasikan" (if currently a draft).

---

## 4. MOVIE RELATION INTEGRATION WORKFLOW

The journal-to-movie attachment feature allows curators to anchor personal reflections to films in their cabin catalog:
```
┌────────────────────────────────┐         ┌────────────────────────────────┐
│   Journal Editor / Detail      │         │     Catalog Movie              │
│   (public.journal_entries)     │         │     (public.movies)            │
└───────────────┬────────────────┘         └────────────────┬───────────────┘
                │                                           │
                └───────────────┐           ┌───────────────┘
                                ▼           ▼
                   ┌─────────────────────────────────────┐
                   │    public.journal_movie_relations   │
                   ├─────────────────────────────────────┤
                   │  id: uuid                           │
                   │  user_id: uuid (RLS validated)      │
                   │  journal_entry_id: uuid             │
                   │  movie_id: uuid                     │
                   │  resonance_note: text (optional)    │
                   └─────────────────────────────────────┘
```
1. **Selecting a Film:** User searches within their personal movie catalog via title.
2. **Resonance Note:** User can optionally record *why* this movie connects to today's entry (max 500 chars).
3. **Display:** On detail view, attached films render with `PosterCover`, direct link to `/bank/[id]`, and italicized resonance blockquote.

---

## 5. TEST STRATEGY & VERIFICATION MATRIX

The Phase 14.3 test suite (`tests/phase14_3_journal_ui.test.mjs`) will cover:
1. Route export verification for all 5 journal pages.
2. View component contracts and props validation.
3. Empty state rendering when no journal entries exist.
4. Mood presets integrity (8 agreed presets matching `JOURNAL_MOODS`).
5. Journal card structure (title, date, mood, tags, excerpt, movie pill, draft badge).
6. Detail view reading container and typography tokens (`font-serif`, `font-sans`, `font-pixel`).
7. Editorial metadata display (word count, reading time, date, mood badge).
8. Attached movie presentation (`PosterCover`, title, release year, resonance note).
9. Delete confirmation flow integration (`ConfirmInline`).
10. Hybrid editor structure (distraction-free canvas + metadata drawer).
11. Draft saving workflow vs publishing workflow.
12. Tag input tokenizer (trimming, deduplication, lowercase conversion).
13. Movie attachment and detachment interactions.
14. Resonance note editing interaction.
15. Loading and error state presentation.
16. Responsive styling and mobile ergonomics.

---

## 6. READINESS ASSESSMENT

All dependencies and backend foundations are validated:
- Phase 14.1 database migration is active on Supabase.
- Phase 14.2 Data Services & Server Actions are fully operational and covered by unit tests.
- Reusable UI primitives (`PosterCover`, `Badge`, `EmptyState`, `ConfirmInline`, `FilmStripDivider`, `Toast`) are confirmed and compatible.

Implementation of Phase 14.3 can proceed immediately.
