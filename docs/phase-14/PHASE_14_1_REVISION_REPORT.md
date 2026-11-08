# MOCAB — PHASE 14.1 TARGETED REVISION REPORT
## Daily Journal System & Personal Notes: Architectural Revision, Security Review & Navigation Alignment

**Project**: Movie Cabin (MOCAB) — Beruang Sastra  
**Phase**: Phase 14.1 Targeted Revision  
**Date**: November 8, 2026  
**Status**: REVISION COMPLETE (Ready for Review & Phase 14.2 Authorization)  
**Target Migration**: `supabase/migrations/20261108000000_phase14_journal_and_notes.sql`  
**Migration State**: **CREATED (UNAPPLIED)** — Has not been applied to any database instance  

---

## 1. SUMMARY OF REVISION

Following the owner's review of the initial Phase 14.1 database foundation, a targeted engineering revision was performed. No application code or UI was modified, no existing tables (`watch_logs`, `movies`, `moods`) were altered, and the 5-slot mobile BottomNav baseline was firmly preserved.

---

## 2. DETAILED BREAKDOWN OF CHANGES MADE

### 2.1 Journal Date Semantics
- **Changed**: `journal_entries.entry_date` updated from `timestamptz NOT NULL DEFAULT now()` to:
  ```sql
  entry_date date NOT NULL DEFAULT CURRENT_DATE
  ```
- **Rationale**: Eliminates timezone-induced day-shifting bugs. A journal entry written for "Nov 8, 2026" remains anchored to that calendar date regardless of the viewing client's timezone offset.
- **Multiple Entries**: Multiple entries per date are supported without unique constraints on `(user_id, entry_date)`.
- **Chronological Index**: Updated index to:
  ```sql
  CREATE INDEX journal_entries_user_date_idx 
    ON public.journal_entries (user_id, entry_date DESC, created_at DESC);
  ```

### 2.2 Draft & Published Content Boundary Validation
- **Added**: Declarative PostgreSQL check constraint on `public.journal_entries`:
  ```sql
  content text NOT NULL DEFAULT '' CHECK (
    char_length(content) <= 50000
    AND (
      is_draft = true
      OR char_length(trim(content)) >= 1
    )
  )
  ```
- **Behavior**:
  - `is_draft = true`: Empty content (`content = ''` by default) or whitespace drafts are allowed.
  - `is_draft = false`: Published entries strictly require at least one non-whitespace character.
  - Transition check: Updating `is_draft` to `false` without non-whitespace content is rejected immediately at the database boundary.
  - Mandatory Title: Title remains mandatory for both draft and published states (`char_length(trim(title)) >= 1 AND char_length(title) <= 200`).

### 2.3 Personal Notes Schema Reconciliation
- **Preserved SQL**: Maintained `title text NOT NULL DEFAULT '' CHECK (char_length(title) <= 200)`.
- **Report Reconciliation**: Corrected `PHASE_14_1_DATABASE_IMPLEMENTATION.md` to accurately document that:
  - From the UX perspective, the title is optional.
  - At the database level, it is stored as an empty string (`''`) by default, avoiding NULL handling quirks while capping length at 200 characters.
  - Content is mandatory (`char_length(trim(content)) >= 1`) and capped at 10,000 characters.

### 2.4 Timestamp Trigger Prerequisites
- **Corrected Documentation**: Removed incorrect references claiming `moddatetime` extension prerequisites.
- **Confirmed Dependency**: Confirmed that `public.handle_updated_at()` exists from `supabase/migrations/20261028000000_phase2_init_schema.sql` (lines 14–24). The triggers on `journal_entries` and `personal_notes` directly call this existing helper without re-creating or altering it.

### 2.5 Explicit Trigger Error Codes & SECURITY DEFINER Hardening
- **Updated**: `validate_journal_movie_ownership()` trigger function now uses `SET search_path = ''` and explicitly assigns SQL error codes:
  ```sql
  CREATE OR REPLACE FUNCTION public.validate_journal_movie_ownership()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = ''
  AS $$
  BEGIN
    -- 1. Ensure referenced journal entry exists and belongs to the relation user_id
    IF NOT EXISTS (
      SELECT 1 FROM public.journal_entries j
      WHERE j.id = NEW.journal_entry_id AND j.user_id = NEW.user_id
    ) THEN
      RAISE EXCEPTION 'Cross-ownership error: journal entry does not belong to the user.'
        USING ERRCODE = 'P0001';
    END IF;

    -- 2. Ensure referenced movie exists and belongs to the relation user_id
    IF NOT EXISTS (
      SELECT 1 FROM public.movies m
      WHERE m.id = NEW.movie_id AND m.user_id = NEW.user_id
    ) THEN
      RAISE EXCEPTION 'Cross-ownership error: movie does not belong to the user.'
        USING ERRCODE = 'P0002';
    END IF;

    RETURN NEW;
  END;
  $$;
  ```
- **Hardening Details**: Setting `search_path = ''` strictly eliminates search-path injection vulnerabilities (CWE-426). All database objects (`public.journal_entries`, `public.movies`) are schema-qualified. Runs `BEFORE INSERT OR UPDATE` on `public.journal_movie_relations`.

### 2.6 Navigation Proposal Realignment (Approach C)
- **Rewrote**: `docs/phase-14/PHASE_14_NAVIGATION_PROPOSAL.md`.
- **Primary Recommendation**: **Approach C** is now the primary, owner-selected recommendation:
  - 100% preservation of the current 5-slot mobile BottomNav (`Home`, `Bank`, `Add`, `Archive`, `Profile`).
  - Direct 1-tap access to Movie Archive (`/archive`) is preserved.
  - Movie Bank (`/bank`) remains unchanged.
  - Central floating `(+)` button evaluates a Retro VHS Creation Drawer (Rekam Film, Tulis Jurnal, Catatan Cepat).
  - Desktop Header adds direct links for `Catatan Harian` and `Catatan Pribadi` utilizing available horizontal canvas (>350px).
  - Explicitly rejected: unauthorized `/studio` umbrella route and intrusive left sidebars.

### 2.7 Automated Test Suite Expansion
- **Updated**: `tests/phase14_1_database.test.mjs` expanded to 123 tests, adding:
  - Verification of `date NOT NULL DEFAULT CURRENT_DATE`.
  - Composite chronological index verification `(user_id, entry_date desc, created_at desc)`.
  - Draft vs published boundary simulation tests.
  - Multi-user security simulation tests (User A vs User B) verifying RLS isolation, trigger error codes (`P0001`, `P0002`), and prevention of `user_id` mutation on update.

---

## 3. EXISTING IMPLEMENTATION PRESERVED

The following architectural foundations from the original Phase 14.1 work remain intact:
1. **Tables & Entities**: `public.journal_entries`, `public.journal_movie_relations`, `public.personal_notes`.
2. **Mood Presets**: The 8 fixed aesthetic mood presets (`Melankolis`, `Kontemplatif`, `Nostalgia`, `Tenang`, `Resah`, `Hangat`, `Puitis`, `Soliter`).
3. **Many-to-Many Relational Mechanics**: Compound unique constraint `(journal_entry_id, movie_id)` and cascade deletion rules.
4. **Row Level Security (RLS)**: Strict authenticated scoping (`user_id = auth.uid()`) across all tables.
5. **Role Privilege Hardening**: Complete revocation of permissions from `anon` and `public`; granting only to `authenticated`.
6. **GIN Indexing**: Native array tags with GIN indexes on both journal entries and personal notes.
7. **Creator Research Isolation**: `public.watch_logs` (Movie Notes) remains 100% untouched and independent.

---

## 4. STATIC TESTS VS ACTUAL DATABASE INTEGRATION TESTS

| Test Category | Methodology | Scope Tested | Execution Result |
| :--- | :--- | :--- | :--- |
| **Static DDL & AST Validation** | Regex & string analysis of migration SQL | Table syntax, column types, default values, check constraints, foreign keys, cascade rules, RLS policies, indexes, and triggers | **PASS (100%)** |
| **In-Memory Logic Simulations** | Pure JavaScript logic simulations in `phase14_1_database.test.mjs` | - Draft content boundary (empty draft allowed, published required)<br>- Mood preset validation<br>- Multi-user RLS isolation (User A vs User B)<br>- `user_id` update mutation rejection<br>- Trigger error codes (`P0001`, `P0002`) | **PASS (100%)** |
| **Live Database Integration Tests** | Execution against running PostgreSQL / Supabase server | **NOT EXECUTED IN THIS PHASE** | **Deferred to deployment / staging** |

> **Honesty & Transparency Note**: No live database credentials were used, no remote Supabase instance was contacted, and no local Docker container was started. All verification in Phase 14.1 is verified through static SQL AST analysis and node test runner simulations.

---

## 5. MIGRATION APPLIED VS MIGRATION MERELY CREATED

- **Current State**: **MIGRATION CREATED (UNAPPLIED)**.
- The migration file:
  `supabase/migrations/20261108000000_phase14_journal_and_notes.sql`
  is an untracked local file in the Git workspace.
- It has **NOT** been applied to any production, staging, or local Supabase database.
- It is ready to be run cleanly on a fresh database instance.

### Optional Non-Destructive Follow-Up Patch (If an Instance Applied the Preliminary Draft):
If an external environment ran the preliminary draft before this revision, run this idempotent patch:
```sql
-- 1. Convert entry_date to calendar date
ALTER TABLE public.journal_entries 
  ALTER COLUMN entry_date TYPE date USING entry_date::date,
  ALTER COLUMN entry_date SET DEFAULT current_date;

-- 2. Apply draft-to-published content constraint
ALTER TABLE public.journal_entries 
  DROP CONSTRAINT IF EXISTS journal_entries_content_check;
ALTER TABLE public.journal_entries 
  ALTER COLUMN content SET DEFAULT '',
  ADD CONSTRAINT journal_entries_content_check CHECK (
    char_length(content) <= 50000
    AND (is_draft = true OR char_length(trim(content)) >= 1)
  );

-- 3. Update index to include created_at desc
DROP INDEX IF EXISTS public.journal_entries_user_date_idx;
CREATE INDEX journal_entries_user_date_idx 
  ON public.journal_entries (user_id, entry_date DESC, created_at DESC);

-- 4. Update trigger function with explicit error codes P0001/P0002 and SET search_path = ''
CREATE OR REPLACE FUNCTION public.validate_journal_movie_ownership()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.journal_entries j WHERE j.id = NEW.journal_entry_id AND j.user_id = NEW.user_id) THEN
    RAISE EXCEPTION 'Cross-ownership error: journal entry does not belong to the user.' USING ERRCODE = 'P0001';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.movies m WHERE m.id = NEW.movie_id AND m.user_id = NEW.user_id) THEN
    RAISE EXCEPTION 'Cross-ownership error: movie does not belong to the user.' USING ERRCODE = 'P0002';
  END IF;
  RETURN NEW;
END;
$$;
```

---

## 6. CODE HEALTH & GIT STATE RECONCILIATION

- **Automated Tests**: **123 / 123 tests PASS** (`npm test`)
- **TypeScript**: **0 errors** (`npm run type-check`)
- **ESLint**: **0 errors, 0 warnings** (`npm run lint`)
- **Turbopack Build**: **Compiled successfully** in 915 ms (`npm run build`)
- **Git State Truth (Reconciliation)**:
  - `git status --short` shows untracked files:
    ```
    ?? docs/phase-14/
    ?? supabase/migrations/20261108000000_phase14_journal_and_notes.sql
    ?? tests/phase14_1_database.test.mjs
    ```
  - `.gitignore` does **NOT** ignore `supabase/migrations/` or `.sql` files.
  - The working tree is **NOT clean** because untracked files are present; however, **zero tracked application files have been modified or staged**.
  - **Testing Reality**: Live PostgreSQL/Supabase integration tests have **NOT** been performed. All verification is based on static DDL parsing and in-memory Node test runner simulations.

---

## 7. REMAINING LIMITATIONS & RECOMMENDED NEXT PHASE

1. **Remote Database Migration**: The migration file must be executed against the target Supabase instance (via Supabase CLI or SQL Editor) when the project owner decides to deploy.
2. **Phase 14.2 Authorization**: Phase 14.2 (Data Services & Server Actions) is ready to implement TypeScript client/server data mappers and actions once approved.
3. **Navigation Implementation**: Deferred to future UI phases; Approach C blueprint is ready.

---

## 8. STOP CONDITION REACHED

> [!IMPORTANT]
> Targeted revision of Phase 14.1 is complete. No Phase 14.2 services or UI components were initiated. Execution is halted awaiting user instruction.
