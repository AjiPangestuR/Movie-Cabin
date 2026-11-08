-- ==============================================================================
-- MOCAB (Movie Cabin) - Migration: Phase 14.1 Daily Journal & Personal Notes
-- Tables:
--   1. public.journal_entries
--   2. public.journal_movie_relations
--   3. public.personal_notes
-- Prerequisites:
--   - Schema dependency: public.handle_updated_at() defined in
--     supabase/migrations/20261028000000_phase2_init_schema.sql
-- Security:
--   - Row Level Security (RLS) enabled on all tables
--   - Strict scoping to authenticated users with user_id = auth.uid()
--   - Cross-ownership database trigger on journal_movie_relations (P0001 / P0002)
--   - Revocation of table privileges from anon and public roles
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Table: public.journal_entries
-- Independent daily reflections. Multiple entries per date are supported.
-- Date semantics use calendar date (date NOT NULL DEFAULT CURRENT_DATE).
-- Drafts may contain empty content; published entries require char_length(trim(content)) >= 1.
-- ------------------------------------------------------------------------------
create table if not exists public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  title text not null check (char_length(trim(title)) >= 1 and char_length(title) <= 200),
  content text not null default '' check (
    char_length(content) <= 50000
    and (
      is_draft = true
      or char_length(trim(content)) >= 1
    )
  ),
  entry_date date not null default current_date,
  mood text null check (
    mood is null or mood in (
      'Melankolis',
      'Kontemplatif',
      'Nostalgia',
      'Tenang',
      'Resah',
      'Hangat',
      'Puitis',
      'Soliter'
    )
  ),
  tags text[] not null default array[]::text[],
  is_draft boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Trigger: automatically update updated_at timestamp using existing helper
drop trigger if exists set_journal_entries_updated_at on public.journal_entries;
create trigger set_journal_entries_updated_at
  before update on public.journal_entries
  for each row execute function public.handle_updated_at();

-- Indexes for journal_entries
create index if not exists journal_entries_user_date_idx 
  on public.journal_entries (user_id, entry_date desc, created_at desc);

create index if not exists journal_entries_user_mood_idx 
  on public.journal_entries (user_id, mood);

create index if not exists journal_entries_tags_gin 
  on public.journal_entries using gin (tags);

create index if not exists journal_entries_user_draft_idx 
  on public.journal_entries (user_id, is_draft);

-- ------------------------------------------------------------------------------
-- 2. Table: public.journal_movie_relations
-- Optional Many-to-Many junction linking journal entries to existing movies.
-- Deleting a journal entry or movie cascades cleanly without leaving orphans.
-- ------------------------------------------------------------------------------
create table if not exists public.journal_movie_relations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  journal_entry_id uuid not null references public.journal_entries(id) on delete cascade,
  movie_id uuid not null references public.movies(id) on delete cascade,
  resonance_note text null check (resonance_note is null or char_length(resonance_note) <= 500),
  created_at timestamptz not null default now(),
  constraint journal_movie_unique unique (journal_entry_id, movie_id)
);

-- Performance indexes for junction lookups
create index if not exists journal_movies_journal_idx 
  on public.journal_movie_relations (journal_entry_id);

create index if not exists journal_movies_movie_idx 
  on public.journal_movie_relations (movie_id);

create index if not exists journal_movies_user_idx 
  on public.journal_movie_relations (user_id);

-- Database-Level Cross-Ownership Validation Trigger Function
-- Enforces that both the journal entry AND the movie belong to the relation user_id
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

drop trigger if exists check_journal_movie_ownership on public.journal_movie_relations;
create trigger check_journal_movie_ownership
  before insert or update on public.journal_movie_relations
  for each row execute function public.validate_journal_movie_ownership();

-- ------------------------------------------------------------------------------
-- 3. Table: public.personal_notes
-- Rapid thought capture, scratchpad fragments, and persistent pinned memos.
-- Completely decoupled from movies and watch_logs.
-- Title is optional from UX perspective, stored as empty string ('') by default.
-- Content is mandatory and limited to 10,000 characters.
-- ------------------------------------------------------------------------------
create table if not exists public.personal_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  title text not null default '' check (char_length(title) <= 200),
  content text not null check (char_length(trim(content)) >= 1 and char_length(content) <= 10000),
  tags text[] not null default array[]::text[],
  is_pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Trigger: automatically update updated_at timestamp using existing helper
drop trigger if exists set_personal_notes_updated_at on public.personal_notes;
create trigger set_personal_notes_updated_at
  before update on public.personal_notes
  for each row execute function public.handle_updated_at();

-- Performance indexes for personal_notes
create index if not exists personal_notes_user_pinned_idx 
  on public.personal_notes (user_id, is_pinned desc, updated_at desc);

create index if not exists personal_notes_tags_gin 
  on public.personal_notes using gin (tags);

-- ------------------------------------------------------------------------------
-- 4. Row Level Security (RLS) - Private by Default
-- ------------------------------------------------------------------------------

-- Enable RLS on all 3 new tables
alter table public.journal_entries enable row level security;
alter table public.journal_movie_relations enable row level security;
alter table public.personal_notes enable row level security;

-- Policies for public.journal_entries
drop policy if exists "Users can select own journal entries" on public.journal_entries;
create policy "Users can select own journal entries"
  on public.journal_entries for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Users can insert own journal entries" on public.journal_entries;
create policy "Users can insert own journal entries"
  on public.journal_entries for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Users can update own journal entries" on public.journal_entries;
create policy "Users can update own journal entries"
  on public.journal_entries for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Users can delete own journal entries" on public.journal_entries;
create policy "Users can delete own journal entries"
  on public.journal_entries for delete
  to authenticated
  using (user_id = auth.uid());

-- Policies for public.journal_movie_relations
drop policy if exists "Users can select own journal movie relations" on public.journal_movie_relations;
create policy "Users can select own journal movie relations"
  on public.journal_movie_relations for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Users can insert own journal movie relations" on public.journal_movie_relations;
create policy "Users can insert own journal movie relations"
  on public.journal_movie_relations for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.journal_entries j
      where j.id = journal_movie_relations.journal_entry_id
        and j.user_id = auth.uid()
    )
    and exists (
      select 1 from public.movies m
      where m.id = journal_movie_relations.movie_id
        and m.user_id = auth.uid()
    )
  );

drop policy if exists "Users can update own journal movie relations" on public.journal_movie_relations;
create policy "Users can update own journal movie relations"
  on public.journal_movie_relations for update
  to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.journal_entries j
      where j.id = journal_movie_relations.journal_entry_id
        and j.user_id = auth.uid()
    )
    and exists (
      select 1 from public.movies m
      where m.id = journal_movie_relations.movie_id
        and m.user_id = auth.uid()
    )
  );

drop policy if exists "Users can delete own journal movie relations" on public.journal_movie_relations;
create policy "Users can delete own journal movie relations"
  on public.journal_movie_relations for delete
  to authenticated
  using (user_id = auth.uid());

-- Policies for public.personal_notes
drop policy if exists "Users can select own personal notes" on public.personal_notes;
create policy "Users can select own personal notes"
  on public.personal_notes for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Users can insert own personal notes" on public.personal_notes;
create policy "Users can insert own personal notes"
  on public.personal_notes for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Users can update own personal notes" on public.personal_notes;
create policy "Users can update own personal notes"
  on public.personal_notes for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Users can delete own personal notes" on public.personal_notes;
create policy "Users can delete own personal notes"
  on public.personal_notes for delete
  to authenticated
  using (user_id = auth.uid());

-- ------------------------------------------------------------------------------
-- 5. Role Permission Hardening: Revoke from anon, grant to authenticated
-- ------------------------------------------------------------------------------
revoke all on public.journal_entries from anon, public;
revoke all on public.journal_movie_relations from anon, public;
revoke all on public.personal_notes from anon, public;

grant select, insert, update, delete on public.journal_entries to authenticated;
grant select, insert, update, delete on public.journal_movie_relations to authenticated;
grant select, insert, update, delete on public.personal_notes to authenticated;
