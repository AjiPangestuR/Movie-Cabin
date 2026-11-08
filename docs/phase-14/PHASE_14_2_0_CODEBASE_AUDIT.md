# MOCAB — PHASE 14.2.0 READ-ONLY CODEBASE AUDIT
## Architectural Patterns, Authentication, Supabase Client & Service Conventions

**Project**: Movie Cabin (MOCAB) — Beruang Sastra  
**Document**: Phase 14.2.0 Read-Only Codebase Audit  
**Date**: November 8, 2026  
**Status**: AUDIT COMPLETE (Ready to Implement Steps 1–6)  
**Target Tables**:
1. `public.journal_entries`
2. `public.journal_movie_relations`
3. `public.personal_notes`

---

## 1. DIRECTORY STRUCTURE & MODULE ORGANIZATION

The MOCAB application utilizes the standard Next.js App Router architecture:
```
src/
├── app/                  # App Router route segments, layouts, and pages
│   ├── add/              # Route /add (VHS recording console)
│   ├── archive/          # Route /archive (Creator watch_logs dossier)
│   ├── auth/actions.ts   # Authentication Server Actions (login, signOut)
│   ├── bank/             # Route /bank (Movie Bank catalog)
│   ├── profile/          # Route /profile (Account profile)
│   ├── layout.tsx        # Root layout with Header and BottomNav
│   └── page.tsx          # Home page
├── components/           # UI components & views
│   ├── layout/           # Header, BottomNav, Footer
│   ├── views/            # Screen views (BankView, ArchiveView, etc.)
│   └── ui/               # Badge, NumberScale, PosterCover, etc.
├── lib/                  # Business logic, services & database clients
│   ├── supabase/         # Official Supabase client instances
│   │   ├── client.ts     # Browser client (createBrowserClient)
│   │   ├── server.ts     # Server client (createServerClient with cookies)
│   │   └── proxy.ts      # Middleware session update handler
│   ├── movies.ts         # Core film & research log services ('use server')
│   ├── moods.ts          # Film mood taxonomy service
│   ├── validations.ts    # Pure input validators & error mappers
│   └── tmdb.ts           # TMDB external API integration
├── types/                # TypeScript interface definitions
│   └── index.ts          # Movie, WatchLog, Mood, etc.
└── proxy.ts              # Next.js edge proxy (middleware entry)
tests/                    # Node.js built-in test runner suites (*.test.mjs)
```

---

## 2. SUPABASE CLIENT & SESSION HANDLING

### 2.1 Official Supabase Client Architecture
MOCAB strictly follows the `@supabase/ssr` pattern:
1. **Server Client (`@/lib/supabase/server`)**:
   ```typescript
   import { createServerClient } from '@supabase/ssr';
   import { cookies } from 'next/headers';

   export async function createClient() {
     const cookieStore = await cookies();
     const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
     const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

     return createServerClient(supabaseUrl, supabaseAnonKey, {
       cookies: {
         getAll() { return cookieStore.getAll(); },
         setAll(cookiesToSet) { ... }
       }
     });
   }
   ```
2. **Browser Client (`@/lib/supabase/client`)**:
   Uses `createBrowserClient(supabaseUrl, supabaseAnonKey)`.
3. **Architectural Rule**:
   - **DO NOT create a new Supabase client**.
   - All server actions and data services must import `createClient` exclusively from `@/lib/supabase/server`.
   - Never use or expose the `service_role` key. All operations execute with the caller's session tokens through the anon key, guaranteeing PostgreSQL RLS (`auth.uid() = user_id`) is strictly enforced at the database layer.

### 2.2 Authentication & User Identification Pattern
- Identity extraction:
  ```typescript
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('Autentikasi diperlukan. Silakan masuk terlebih dahulu.');
  }
  ```
- **Rule**: Client-supplied `user_id` must NEVER be trusted or accepted as an argument in Server Actions. The authenticated `user.id` is always derived directly from `supabase.auth.getUser()`.

---

## 3. SERVER ACTIONS & DATA SERVICE PATTERNS

### 3.1 Existing Pattern in `src/lib/movies.ts`
- Directive: `'use server';` at the top of the file.
- Direct invocation: Async functions are imported and called directly by React Client Components (e.g. `CatatView.tsx` calls `saveLog(id, payload)`).
- Cache invalidation: Calls `revalidatePath('/bank')`, `revalidatePath('/archive')`, etc., upon successful mutations.
- Error handling: Throws localized `Error` with user-friendly messages (`throw new Error('Judul wajib diisi.')`).

### 3.2 Standardized Action Response Contract for Phase 14
For Phase 14.2 Server Actions, we will provide both:
1. **Direct Data Service Functions** (return `Promise<T>`, throw on error — ideal for Server Components like `page.tsx`).
2. **Server Actions** with a consistent response contract (ideal for Client Components in Phase 14.3 / 14.4):
   ```typescript
   export interface ActionResponse<T = void> {
     success: boolean;
     data?: T;
     error?: string;
   }
   ```
   This prevents unhandled runtime exceptions in Client Components and cleanly maps errors to UI toasts.

---

## 4. INPUT VALIDATION & ERROR HANDLING

### 4.1 Validation Conventions (`src/lib/validations.ts`)
Existing validation helpers include:
- `isValidUuid(id: string): boolean`: Strict regex matching for UUID v4.
- `validateMovieInput(...)`: Sanitizes strings, parses numbers, checks lengths.
- Error mapping functions (`mapMovieRpcError`, `mapWatchLogRpcError`): Catches PostgREST/PostgreSQL error codes (e.g., `23505` for unique violations, `P0001` for trigger exceptions) and translates them into friendly Indonesian text without leaking raw DB column names.

### 4.2 Phase 14 Constraints to Validate on Server:
1. **Journal Entries**:
   - `title`: String, trimmed length 1–200 characters.
   - `content`:
     - If `is_draft === true`: string length 0–50,000 characters (empty allowed).
     - If `is_draft === false`: trimmed length 1–50,000 characters (non-whitespace mandatory).
   - `entry_date`: Valid date format `YYYY-MM-DD` (defaults to current date if omitted).
   - `mood`: Nullable; if present, must be strictly one of the 8 presets:
     `Melankolis`, `Kontemplatif`, `Nostalgia`, `Tenang`, `Resah`, `Hangat`, `Puitis`, `Soliter`.
   - `tags`: Array of strings, each trimmed (non-empty, max 50 chars each).
   - `is_draft`: Boolean (defaults to `false`).
2. **Journal Movie Relations**:
   - `journal_entry_id`: Valid UUID.
   - `movie_id`: Valid UUID.
   - `resonance_note`: Nullable; if present, max 500 characters.
3. **Personal Notes**:
   - `title`: String, max 200 characters (defaults to `''` if omitted/empty).
   - `content`: String, trimmed length 1–10,000 characters.
   - `tags`: Array of strings.
   - `is_pinned`: Boolean (defaults to `false`).

---

## 5. EXISTING DATABASE & TYPE ECOSYSTEM

### 5.1 Type Separation
- `src/types/index.ts` currently defines `Movie`, `WatchLog`, `Mood`, etc.
- **Rule**:
  - `public.moods` is reserved for film taxonomy (Psikologis, Emosional, etc.).
  - Journal moods must be defined as an independent TypeScript union:
    ```typescript
    export type JournalMood =
      | 'Melankolis'
      | 'Kontemplatif'
      | 'Nostalgia'
      | 'Tenang'
      | 'Resah'
      | 'Hangat'
      | 'Puitis'
      | 'Soliter';
    ```
  - Personal Notes must NOT import or touch `WatchLog`. `WatchLog` remains strictly tied to `public.watch_logs` (1:1 with `movies`).

---

## 6. TESTING CONVENTIONS

- Test Runner: Node.js native test runner via `npm test` (`node --no-warnings=MODULE_TYPELESS_PACKAGE_JSON --test tests/**/*.test.mjs`).
- Assertions: `node:assert/strict`.
- Files: ES modules (`.test.mjs`).
- Approach:
  - Unit tests for validation logic and mappers.
  - Mock/Simulation tests for service workflows, draft transitions, cross-ownership boundaries, and Action response contracts.
  - Transparent statement that live Supabase integration tests require an active staging environment and are deferred to deployment.

---

## 7. AUDIT CONCLUSION & ROADMAP

The codebase is clean, consistent, and well-structured. No architectural conflicts were identified.

### Implementation Plan:
1. **Types**: Create `src/types/journal.ts` (or expand `src/types/index.ts`) for Journal, JournalMovieRelation, and PersonalNote interfaces.
2. **Validations**: Add Journal and Notes validation helpers in `src/lib/journal-validations.ts`.
3. **Data Services**:
   - `src/lib/journal.ts`: Service for `public.journal_entries` and `public.journal_movie_relations`.
   - `src/lib/notes.ts`: Service for `public.personal_notes`.
4. **Server Actions**:
   - `src/app/actions/journalActions.ts`: Next.js Server Actions for Journal & Movie relations.
   - `src/app/actions/notesActions.ts`: Next.js Server Actions for Personal Notes.
5. **Testing**: Create comprehensive test suite `tests/phase14_2_services.test.mjs`.
6. **Verification**: Run `npm test`, `npm run type-check`, `npm run lint`, and `npm run build`.
7. **Report**: Write `docs/phase-14/PHASE_14_2_IMPLEMENTATION_REPORT.md`.

We are ready to begin STEP 1.
