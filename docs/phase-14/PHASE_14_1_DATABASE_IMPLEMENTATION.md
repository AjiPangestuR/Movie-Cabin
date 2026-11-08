# MOCAB — PHASE 14.1 DATABASE IMPLEMENTATION REPORT (REVISED)
## Daily Journal System & Personal Notes: Foundation, Constraints, Security & RLS

**Project**: Movie Cabin (MOCAB) — Beruang Sastra  
**Phase**: Phase 14.1 Targeted Revision  
**Date**: November 8, 2026  
**Status**: COMPLETE (Revision 2 — Ready for Review & Phase 14.2 Approval)  
**Migration Target**: `supabase/migrations/20261108000000_phase14_journal_and_notes.sql`  
**Migration Deployment State**: **CREATED (UNAPPLIED)** — Not yet applied to any live remote or local Supabase instance  
**Test Suite**: `tests/phase14_1_database.test.mjs` (All 123 tests passing)  
**Companion Documents**:
- Phase 14.0 System Audit: `docs/phase-14/PHASE_14_0_SYSTEM_AUDIT.md`
- Navigation Proposal (Revision 2): `docs/phase-14/PHASE_14_NAVIGATION_PROPOSAL.md`
- Revision Report: `docs/phase-14/PHASE_14_1_REVISION_REPORT.md`

---

## 1. EXECUTIVE SUMMARY

Phase 14.1 establishes the PostgreSQL foundation for MOCAB's personal writing architecture:
1. **Personal Journal (`public.journal_entries`)**: Chronological daily reflection stream with calendar date semantics, mood tagging, and robust draft-to-published content validation.
2. **Journal-to-Movie Relations (`public.journal_movie_relations`)**: Optional contextual linking between journal reflections and user-owned movies with explicit trigger error codes (`P0001`, `P0002`).
3. **Personal Notes (`public.personal_notes`)**: Rapid-capture scratchpad decoupled from films and journals, storing optional titles as default empty strings (`''`) and enforcing mandatory content.

### Strict Scope Boundary Compliance
- **Zero UI Implementation**: No `/journal`, `/notes`, or related React pages/components were created.
- **Zero Navigation Changes**: `src/components/layout/Header.tsx`, `src/components/layout/BottomNav.tsx`, and all route manifests remain 100% untouched.
- **Preservation of Movie Notes (`public.watch_logs`)**: The existing film research log system is completely unaltered and operates independently.
- **Strict Stop Condition**: Execution halts at the conclusion of this revision, awaiting explicit user approval before commencing Phase 14.2.

---

## 2. IMPLEMENTED DATABASE SCHEMA

### 2.1 Table: `public.journal_entries`
Captures personal reflections, mood states, and multi-entry daily logs.

| Column | Type | Constraints & Defaults | Description |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | `PRIMARY KEY DEFAULT gen_random_uuid()` | Unique entry identifier |
| `user_id` | `uuid` | `NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid()` | Owner identifier |
| `title` | `text` | `NOT NULL CHECK (char_length(trim(title)) >= 1 AND char_length(title) <= 200)` | Mandatory title (1–200 chars) |
| `content` | `text` | `NOT NULL DEFAULT '' CHECK (char_length(content) <= 50000 AND (is_draft = true OR char_length(trim(content)) >= 1))` | Body content (draft/published rules) |
| `entry_date` | `date` | `NOT NULL DEFAULT CURRENT_DATE` | Calendar date of entry |
| `mood` | `text` | `NULL CHECK (mood IS NULL OR mood IN (...8 presets...))` | 8 fixed aesthetic mood presets |
| `tags` | `text[]` | `NOT NULL DEFAULT array[]::text[]` | Native array tags |
| `is_draft` | `boolean` | `NOT NULL DEFAULT false` | Draft state indicator |
| `created_at` | `timestamptz` | `NOT NULL DEFAULT now()` | Creation timestamp |
| `updated_at` | `timestamptz` | `NOT NULL DEFAULT now()` | Auto-updating timestamp |

#### Calendar Date Semantics & Multi-Entry Support
- The column `entry_date` uses PostgreSQL `date NOT NULL DEFAULT CURRENT_DATE` (not `timestamptz`), avoiding timezone-dependent day shifts.
- Multiple entries per date are supported (no unique constraint on `(user_id, entry_date)`).
- Chronological ordering is preserved via composite index on `(user_id, entry_date DESC, created_at DESC)`.

#### Draft vs Published Boundary Validation
The database enforces content integrity through a single declarative constraint:
```sql
content text not null default '' check (
  char_length(content) <= 50000
  and (
    is_draft = true
    or char_length(trim(content)) >= 1
  )
)
```
- **When `is_draft = true`**: Entries can be saved with empty content (`content = ''`) or partial notes.
- **When `is_draft = false`**: The entry must contain at least one non-whitespace character (`char_length(trim(content)) >= 1`).
- **Draft-to-Published Transition**: If an update changes `is_draft` from `true` to `false` without non-whitespace content, PostgreSQL rejects the update immediately at the database boundary.
- **Title**: Mandatory for both drafts and published entries (`char_length(trim(title)) >= 1 AND char_length(title) <= 200`).

#### Mood Presets Specification
The `mood` column enforces the 8 agreed retro VHS emotional presets:
`Melankolis`, `Kontemplatif`, `Nostalgia`, `Tenang`, `Resah`, `Hangat`, `Puitis`, `Soliter`.
Movie taxonomy moods (`public.moods`: Psikologis, Emosional, etc.) remain untouched.

---

### 2.2 Table: `public.journal_movie_relations`
Associates personal journal reflections with movies in the user's collection, providing optional contextual resonance notes.

| Column | Type | Constraints & Defaults | Description |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | `PRIMARY KEY DEFAULT gen_random_uuid()` | Unique relation identifier |
| `user_id` | `uuid` | `NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid()` | Relation owner identifier |
| `journal_entry_id`| `uuid` | `NOT NULL REFERENCES public.journal_entries(id) ON DELETE CASCADE` | Linked journal entry |
| `movie_id` | `uuid` | `NOT NULL REFERENCES public.movies(id) ON DELETE CASCADE` | Linked movie in collection |
| `resonance_note` | `text` | `NULL CHECK (resonance_note IS NULL OR char_length(resonance_note) <= 500)` | Contextual note (max 500 chars) |
| `created_at` | `timestamptz` | `NOT NULL DEFAULT now()` | Timestamp of attachment |

#### Compound Uniqueness & Cascade
- **Compound Unique**: `CONSTRAINT journal_movie_unique UNIQUE (journal_entry_id, movie_id)` prevents duplicate link pairs.
- **Cascade Deletion**: Purging a movie deletes its junction records without affecting the journal entry; purging a journal deletes its junction records without affecting the movie.

---

### 2.3 Table: `public.personal_notes`
Provides a rapid-capture memo board completely decoupled from movies and daily journals.

| Column | Type | Constraints & Defaults | Description |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | `PRIMARY KEY DEFAULT gen_random_uuid()` | Unique note identifier |
| `user_id` | `uuid` | `NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid()` | Owner identifier |
| `title` | `text` | `NOT NULL DEFAULT '' CHECK (char_length(title) <= 200)` | Optional title (stored as empty string `''` by default) |
| `content` | `text` | `NOT NULL CHECK (char_length(trim(content)) >= 1 AND char_length(content) <= 10000)` | Mandatory content (1–10k chars) |
| `tags` | `text[]` | `NOT NULL DEFAULT array[]::text[]` | Native array tags |
| `is_pinned` | `boolean` | `NOT NULL DEFAULT false` | Pin state for memo board |
| `created_at` | `timestamptz` | `NOT NULL DEFAULT now()` | Creation timestamp |
| `updated_at` | `timestamptz` | `NOT NULL DEFAULT now()` | Auto-updating timestamp |

#### Schema Reconciliation Details
- From the user's perspective, a title is completely optional.
- At the database level, untitled notes are stored as empty strings (`title text NOT NULL DEFAULT ''`), avoiding tri-state boolean logic and NULL complexity while enforcing `char_length(title) <= 200`.
- Content is strictly mandatory (`char_length(trim(content)) >= 1`) and capped at 10,000 characters.

---

## 3. TIMESTAMPS & TRIGGER PREREQUISITES

### Dependency on Existing Helper Function
The tables `public.journal_entries` and `public.personal_notes` attach `BEFORE UPDATE` triggers executing `public.handle_updated_at()`.

```sql
create trigger set_journal_entries_updated_at
  before update on public.journal_entries
  for each row execute function public.handle_updated_at();

create trigger set_personal_notes_updated_at
  before update on public.personal_notes
  for each row execute function public.handle_updated_at();
```

### Clarification on Extensions & Migration Order:
- **No external extensions created**: This migration does NOT install or require `moddatetime` or `pg_trgm`.
- **Pre-existing function**: The function `public.handle_updated_at()` was originally defined in `supabase/migrations/20261028000000_phase2_init_schema.sql` (lines 14–24):
  ```sql
  create or replace function public.handle_updated_at()
  returns trigger
  language plpgsql
  security definer
  set search_path = ''
  as $$
  begin
    new.updated_at = pg_catalog.now();
    return new;
  end;
  $$;
  ```
- It is reused directly without re-creation or modification, preserving schema integrity.

---

## 4. CROSS-OWNERSHIP PROTECTION & EXPLICIT ERROR CODES

### Database-Level Trigger Function
To ensure data isolation, `validate_journal_movie_ownership()` runs `BEFORE INSERT OR UPDATE` on `public.journal_movie_relations`:

```sql
create or replace function public.validate_journal_movie_ownership()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- 1. Ensure referenced journal entry exists and belongs to the relation user_id
  if not exists (
    select 1 from public.journal_entries j
    where j.id = new.journal_entry_id and j.user_id = new.user_id
  ) then
    raise exception 'Cross-ownership error: journal entry does not belong to the user.'
      using errcode = 'P0001';
  end if;

  -- 2. Ensure referenced movie exists and belongs to the relation user_id
  if not exists (
    select 1 from public.movies m
    where m.id = new.movie_id and m.user_id = new.user_id
  ) then
    raise exception 'Cross-ownership error: movie does not belong to the user.'
      using errcode = 'P0002';
  end if;

  return new;
end;
$$;
```

### Explicit Error Codes & Security Definer Hardening:
- `P0001`: Journal entry does not exist or does not belong to `NEW.user_id`.
- `P0002`: Movie does not exist or does not belong to `NEW.user_id`.
- Function security: `SECURITY DEFINER` with empty `set search_path = ''` completely hardens against search path injection attacks. All table references (`public.journal_entries`, `public.movies`) are schema-qualified.

---

## 5. ROW LEVEL SECURITY & PRIVILEGE HARDENING

All 3 tables enable RLS and permit operations strictly to `authenticated` users:

```sql
alter table public.journal_entries enable row level security;
alter table public.journal_movie_relations enable row level security;
alter table public.personal_notes enable row level security;
```

### Policy Matrix & Protection Against `user_id` Mutation:

| Table | SELECT | INSERT | UPDATE | DELETE |
| :--- | :--- | :--- | :--- | :--- |
| `journal_entries` | `user_id = auth.uid()` | `user_id = auth.uid()` | `USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())` | `user_id = auth.uid()` |
| `journal_movie_relations` | `user_id = auth.uid()` | `WITH CHECK (user_id = auth.uid() AND own_journal AND own_movie)` | `USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid() AND own_journal AND own_movie)` | `user_id = auth.uid()` |
| `personal_notes` | `user_id = auth.uid()` | `user_id = auth.uid()` | `USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())` | `user_id = auth.uid()` |

> **Security Note**: The `WITH CHECK (user_id = auth.uid())` clause on UPDATE policies prevents an authenticated user from transferring records to another user's `user_id`.

### Privilege Hardening
```sql
revoke all on public.journal_entries from anon, public;
revoke all on public.journal_movie_relations from anon, public;
revoke all on public.personal_notes from anon, public;

grant select, insert, update, delete on public.journal_entries to authenticated;
grant select, insert, update, delete on public.journal_movie_relations to authenticated;
grant select, insert, update, delete on public.personal_notes to authenticated;
```

---

## 6. QUERY OPTIMIZATION & INDEXES

The migration defines 9 purposeful, non-redundant indexes matching the required query patterns:

```sql
-- 1. Chronological Journal Archive (user + calendar date + timestamp)
create index if not exists journal_entries_user_date_idx 
  on public.journal_entries (user_id, entry_date desc, created_at desc);

-- 2. Journal Mood Filtering
create index if not exists journal_entries_user_mood_idx 
  on public.journal_entries (user_id, mood);

-- 3. Journal Tag Search (GIN for array operations)
create index if not exists journal_entries_tags_gin 
  on public.journal_entries using gin (tags);

-- 4. Journal Drafts vs Published Filter
create index if not exists journal_entries_user_draft_idx 
  on public.journal_entries (user_id, is_draft);

-- 5. Relation Lookup by Journal Entry
create index if not exists journal_movies_journal_idx 
  on public.journal_movie_relations (journal_entry_id);

-- 6. Relation Lookup by Movie
create index if not exists journal_movies_movie_idx 
  on public.journal_movie_relations (movie_id);

-- 7. Relation Lookup by User
create index if not exists journal_movies_user_idx 
  on public.journal_movie_relations (user_id);

-- 8. Pinned and Recently Updated Personal Notes
create index if not exists personal_notes_user_pinned_idx 
  on public.personal_notes (user_id, is_pinned desc, updated_at desc);

-- 9. Personal Notes Tag Search (GIN for array operations)
create index if not exists personal_notes_tags_gin 
  on public.personal_notes using gin (tags);
```

---

## 7. VERIFICATION & QUALITY ASSURANCE

### 7.1 Automated Node.js Test Suite (`tests/phase14_1_database.test.mjs`)
123 automated tests pass with 0 failures:
- Migration structure & helper dependency checks.
- Calendar date semantics (`entry_date date not null default current_date`).
- Chronological ordering index `(user_id, entry_date desc, created_at desc)`.
- Draft vs published content boundary simulation (empty draft allowed, published requires content).
- Cross-ownership trigger verification with explicit error codes (`P0001`, `P0002`).
- Multi-user security simulation test validating RLS isolation and ownership mutation prevention.
- Personal notes optional title (`default ''`) and content cap (10k).

### 7.2 Full Code Health Checks
- **Automated Tests**: 123 / 123 PASS (`npm test`)
- **TypeScript**: 0 errors (`npm run type-check`)
- **ESLint**: 0 errors, 0 warnings (`npm run lint`)
- **Turbopack Build**: Compiled successfully in Next.js (`npm run build`)

### 7.3 Git State & Deployment Reality (Reconciliation)
- **Git Working Tree Status**: The working tree is **NOT clean**. It contains 3 untracked file paths:
  ```
  ?? docs/phase-14/
  ?? supabase/migrations/20261108000000_phase14_journal_and_notes.sql
  ?? tests/phase14_1_database.test.mjs
  ```
- **`.gitignore` Status**: Does NOT ignore `supabase/migrations/` or `.sql` files. The migration file is untracked solely because no `git add` or `git commit` has been executed.
- **Testing Limitation**: **Live PostgreSQL / Supabase integration testing has NOT been performed**. Verification relies on static AST parsing, DDL structure checks, and in-memory mock boundary simulations.
- **Deployment Limitation**: The migration has **NOT been applied** to any live database environment.

---

## 8. STATUS BREAKDOWN & TESTING SCOPE

| Item | Category | Status | Details |
| :--- | :--- | :--- | :--- |
| `journal_entries` DDL | Database | **IMPLEMENTED** | Defined in `20261108000000_phase14_journal_and_notes.sql` |
| `journal_movie_relations` DDL | Database | **IMPLEMENTED** | Defined in `20261108000000_phase14_journal_and_notes.sql` |
| `personal_notes` DDL | Database | **IMPLEMENTED** | Defined in `20261108000000_phase14_journal_and_notes.sql` |
| Cross-ownership Trigger | Security | **IMPLEMENTED** | Explicit `P0001` and `P0002` error codes; `set search_path = ''` |
| RLS Policies & Hardening | Security | **IMPLEMENTED** | Scoped `to authenticated`, `with check (user_id = auth.uid())` |
| Indexes (GIN & Composite) | Performance | **IMPLEMENTED** | 9 targeted indexes |
| Static & Unit Simulations | QA | **TESTED** | 123/123 tests PASS locally |
| Production Build Check | Code Health | **TESTED** | Next.js Turbopack build succeeds |
| Live PostgreSQL / Supabase Integration | Deployment | **NOT TESTED** | Requires active container or staging DB |
| Remote Supabase Execution | Deployment | **NOT TESTED** | **Migration is UNAPPLIED**; pending deployment |
| Phase 14.2 Data Services | Backend | **DEFERRED** | Awaiting user approval |
| Phase 14.3 UI Implementation | Frontend | **DEFERRED** | Awaiting subsequent phases |
| Navigation Component Edits | Navigation | **REQUIRES USER APPROVAL** | Approach C finalized in proposal |

---

## 9. ROLLBACK & DEPLOYMENT CONSIDERATIONS

### Current State:
This migration has **NOT been applied to any live database environment**.

### If Applying to Fresh Database:
Run the migration file:
`supabase/migrations/20261108000000_phase14_journal_and_notes.sql`

### If Applying Follow-Up Patch to an Instance with Preliminary Draft:
If an external instance already executed the preliminary Phase 14.1 draft, execute this safe patch:
```sql
-- 1. Alter entry_date to calendar date
ALTER TABLE public.journal_entries 
  ALTER COLUMN entry_date TYPE date USING entry_date::date,
  ALTER COLUMN entry_date SET DEFAULT current_date;

-- 2. Update content check constraint
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

-- 4. Update trigger function with explicit error codes and set search_path = ''
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

### Complete Clean Rollback:
```sql
DROP TRIGGER IF EXISTS check_journal_movie_ownership ON public.journal_movie_relations;
DROP FUNCTION IF EXISTS public.validate_journal_movie_ownership();
DROP TABLE IF EXISTS public.journal_movie_relations CASCADE;
DROP TABLE IF EXISTS public.personal_notes CASCADE;
DROP TABLE IF EXISTS public.journal_entries CASCADE;
```
