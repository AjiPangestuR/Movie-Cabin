# MOCAB — PHASE 14.4.0 PRE-IMPLEMENTATION UI AUDIT
## PERSONAL NOTES UI ARCHITECTURE & DESIGN AUDIT

**Project:** Movie Cabin (MOCAB) — Beruang Sastra  
**Author:** Antigravity AI  
**Date:** 2026-11-08  
**Baseline Git Branch:** `master`  
**Phase:** 14.4 — Personal Notes UI Implementation  

---

## 1. EXECUTIVE SUMMARY

Following the successful implementation and verification of **Phase 14.3: Personal Journal UI**, we now proceed to **Phase 14.4: Personal Notes UI**.

Personal Notes functions as a lightweight, personal scratchpad and memo board designed for rapid ideation, fleeting thoughts, dialogue snippets, quotes, and research fragments. Unlike Personal Journal (which represents structured, long-form chronological reflections) and `watch_logs` (which represents video essay analysis tied 1:1 to movies), Personal Notes is intentionally informal, fast, and frictionless.

### Fundamental System Distinctions

```
┌─────────────────────────┐   ┌─────────────────────────┐   ┌─────────────────────────┐
│     Personal Notes      │   │     Personal Journal    │   │     Movie Watch Logs    │
│ (Table: personal_notes) │   │(Table: journal_entries) │   │   (Table: watch_logs)   │
├─────────────────────────┤   ├─────────────────────────┤   ├─────────────────────────┤
│ • Fast scratchpad memo  │   │ • Editorial literature  │   │ • Video essay ideation  │
│ • Title is OPTIONAL     │   │ • Title is MANDATORY    │   │ • Tied 1:1 to a movie   │
│ • No mood presets       │   │ • 8 Mood presets        │   │ • Rating & Potential    │
│ • Card board / Pinning  │   │ • Stream & Archive      │   │ • Scene, Angle, Theme   │
│ • Max 10,000 chars      │   │ • Max 50,000 chars      │   │ • Displayed in Archive  │
└─────────────────────────┘   └─────────────────────────┘   └─────────────────────────┘
```

---

## 2. BACKEND CONTRACT & DATA SERVICES AUDIT

The backend foundation was established in **Phase 14.1** (`supabase/migrations/20261108000000_phase14_journal_and_notes.sql`) and **Phase 14.2** (`src/lib/notes.ts`, `src/app/actions/notesActions.ts`).

### Database Contract (`public.personal_notes`)
| Column | Type | Constraints & Defaults | Notes |
|---|---|---|---|
| `id` | `uuid` | Primary Key, `default gen_random_uuid()` | Immutable UUID identifier |
| `user_id` | `uuid` | `not null references auth.users(id) on delete cascade` | RLS enforces `auth.uid() = user_id` |
| `title` | `text` | `not null default ''`, `char_length(title) <= 200` | Optional; saved as empty string if omitted |
| `content` | `text` | `not null check (char_length(trim(content)) >= 1 and char_length(content) <= 10000)` | Mandatory content body |
| `tags` | `text[]` | `not null default array[]::text[]`, GIN indexed | Lowercase sanitized array |
| `is_pinned`| `boolean` | `not null default false` | Pinned cards render at top of board |
| `created_at`| `timestamptz` | `not null default now()` | Creation timestamp |
| `updated_at`| `timestamptz` | `not null default now()`, trigger maintained | Auto-updated on row modification |

### Data Services (`src/lib/notes.ts`)
1. `createNote(input: CreateNoteInput): Promise<PersonalNote>` — Inserts a note with sanitized title, content, tags, and pinned state. Revalidates `/notes` and `/`.
2. `getNote(id: string): Promise<PersonalNote | null>` — Fetches a note by validated UUID, returns `null` if not found or unauthorized.
3. `listNotes(filter?: NoteListFilter): Promise<{ notes: PersonalNote[]; total: number }>` — Queries notes ordered by `is_pinned DESC, updated_at DESC`. Supports `search`, `tag`, `isPinned`, and pagination (`page`, `limit`).
4. `updateNote(id: string, input: UpdateNoteInput): Promise<PersonalNote>` — Selectively updates fields scoped to authenticated `user.id`.
5. `deleteNote(id: string): Promise<boolean>` — Hard deletes the note scoped to authenticated `user.id`.
6. `pinNote(id: string): Promise<PersonalNote>` — Shortcut setting `is_pinned = true`.
7. `unpinNote(id: string): Promise<PersonalNote>` — Shortcut setting `is_pinned = false`.

### Server Actions (`src/app/actions/notesActions.ts`)
- All mutations return the standardized contract `ActionResponse<T>` (`{ success: boolean, data?: T, error?: string }`).
- Authenticated user ID is exclusively derived from the Supabase SSR cookie session on the server; client input is never trusted for ownership.
- Raw database error messages are sanitized and mapped to friendly Indonesian error descriptions via `mapJournalDbError`.

---

## 3. UI ARCHITECTURE & ROUTE DESIGN

### Route Map
```
src/
├── app/
│   └── notes/
│       ├── page.tsx          # Server Component: /notes (Personal Memo Board)
│       ├── new/
│       │   └── page.tsx      # Server Component: /notes/new (Quick Create Note)
│       └── [id]/
│           └── page.tsx      # Server Component: /notes/[id] (Edit Note & Details)
└── components/
    └── views/
        └── notes/
            ├── NotesListView.tsx   # Client View: board grid, search, filters, quick pin
            ├── NoteCard.tsx        # Client Component: memo card with OSD & quick actions
            └── NoteEditorView.tsx  # Client View: scratchpad editor (reusable create/edit)
```

### Route & Interaction Choices: Modal vs Dedicated Route
- **Dedicated Route Strategy Selected:** We utilize `/notes/new` and `/notes/[id]` as dedicated dynamic pages, backed by a responsive modal-ready component structure.
- **Rationale:**
  1. *Mobile Ergonomics:* On mobile browsers, dedicated pages avoid virtual keyboard overlap, viewport jump, and scroll containment bugs common with nested modal dialogs.
  2. *Deep Linking & PWA Support:* Dedicated routes support direct navigation, browser history, back-swipe gestures, and offline restoration.
  3. *Fluid Quick Capture:* On `/notes`, we also provide an inline quick scratchpad at the top of the board, allowing one-click capture without page transitions.

---

## 4. DESIGN SYSTEM & RETRO VHS AESTHETICS

Personal Notes adopts the MOCAB Retro VHS Cinema Design System:
- **Tone:** Casual, literary scratchpad, warm bulletin board for thoughts.
- **Headings:** Fraunces variable font (`font-serif font-bold text-lg sm:text-xl text-text`).
- **Body & Prose:** DM Sans (`font-sans text-sm sm:text-base text-text-subtle`).
- **Technical OSD:** Silkscreen (`font-pixel text-[10px] tracking-wider uppercase`).
- **Cards & Grids:** Responsive CSS grid (`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5`).
- **Pinned State:** Prominent amber/gold pin marker and subtle warm highlight ring (`border-amber/40 bg-surface-elevated/90`).
- **Untitled Note Ergonomics:** When a note has no title, the first line of content is styled cleanly as an italicized lead sentence, ensuring the card never feels incomplete or "broken".

### Reusable Component Matrix
| Reusable Component | File Path | Personal Notes Usage |
|---|---|---|
| `<EmptyState>` | `src/components/EmptyState.tsx` | Displayed when notes list is empty with paw avatar stamp |
| `<ConfirmInline>` | `src/components/ConfirmInline.tsx` | Two-step inline confirmation before deleting a note |
| `useToast()` | `src/components/Toast.tsx` | Notification feedback for create, edit, pin, and delete |
| `<LoadingSpinner>` | `src/components/LoadingSpinner.tsx` | Transition feedback during async mutations |

---

## 5. SCOPE BOUNDARIES & SECURITY POLICIES

To prevent architectural regression:
1. **Zero Database Modifications:** No tables, columns, indexes, or migrations are created or altered.
2. **Zero Journal or Movie Coupling:** Personal Notes does NOT link to `journal_entries` or `movies`. It is a pure, independent personal memo system.
3. **Navigation Integration Deferred:** `Header.tsx` and `BottomNav.tsx` will NOT be modified in Phase 14.4. All navigation integration is strictly reserved for Phase 14.5.
4. **No Productivity Clutter:** No checklists, due dates, reminder notifications, fake hardware dials, or social sharing feeds.
5. **Ownership Isolation:** All actions verify authenticated session. UUIDs are strictly validated before execution.

---

## 6. VERIFICATION PLAN

The implementation will be validated using:
1. Dedicated test suite: `tests/phase14_4_personal_notes_ui.test.mjs`.
2. Existing test suite regression: `npm test` (all 147 tests must remain passing).
3. TypeScript compiler: `npm run type-check` (0 errors).
4. ESLint rules: `npm run lint` (0 errors, 0 warnings).
5. Next.js Turbopack production build: `npm run build` (dynamic SSR verified).
