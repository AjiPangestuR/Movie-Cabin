-- ==============================================================================
-- MOCAB (Movie Cabin) - Migration: Phase 16.1 Watch Sources Management
-- Table:
--   1. public.movie_watch_sources
-- Prerequisites:
--   - Schema dependency: public.movies(id) & auth.users(id)
--   - Helper function: public.handle_updated_at() from 20261028000000_phase2_init_schema.sql
-- Security:
--   - Row Level Security (RLS) enabled
--   - Strict scoping to authenticated users with user_id = auth.uid()
--   - Cross-ownership database trigger verifying movie_id belongs to user_id (P0003)
--   - Partial unique index guaranteeing at most one primary source per movie
--   - Atomic RPC function for safe primary source switching
--   - Revocation of table privileges from anon and public roles
-- Backward Compatibility:
--   - movies.watch_url remains intact and untouched
--   - Idempotent legacy data backfill preserving historical watch links
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Table: public.movie_watch_sources
-- Multiple watch links and physical media sources for each curated movie.
-- ------------------------------------------------------------------------------
create table if not exists public.movie_watch_sources (
  id uuid primary key default gen_random_uuid(),
  movie_id uuid not null references public.movies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  platform_name text not null check (
    char_length(trim(platform_name)) >= 1
    and char_length(platform_name) <= 100
  ),
  source_url text null default null check (
    source_url is null
    or (
      char_length(source_url) <= 2048
      and source_url ~* '^https?://\S+$'
    )
  ),
  access_type text not null check (
    access_type in (
      'subscription',
      'free',
      'rent',
      'buy',
      'cinema',
      'physical',
      'other'
    )
  ),
  is_primary boolean not null default false,
  notes text null default null check (
    notes is null
    or char_length(notes) <= 500
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Trigger: automatically update updated_at timestamp
drop trigger if exists set_movie_watch_sources_updated_at on public.movie_watch_sources;
create trigger set_movie_watch_sources_updated_at
  before update on public.movie_watch_sources
  for each row execute function public.handle_updated_at();

-- Indexes for performance and foreign key lookups
create index if not exists movie_watch_sources_movie_id_idx 
  on public.movie_watch_sources (movie_id);

create index if not exists movie_watch_sources_user_id_idx 
  on public.movie_watch_sources (user_id);

create index if not exists movie_watch_sources_movie_primary_idx 
  on public.movie_watch_sources (movie_id, is_primary);

-- ------------------------------------------------------------------------------
-- 2. Partial Unique Index: Primary Source Uniqueness
-- Guarantees at database engine level that at most ONE watch source per movie
-- can be flagged as is_primary = true.
-- (Note: Does not force a movie to have a primary source if it has 0 sources).
-- ------------------------------------------------------------------------------
create unique index if not exists movie_watch_sources_primary_unique 
  on public.movie_watch_sources (movie_id) 
  where (is_primary = true);

-- ------------------------------------------------------------------------------
-- 3. Database-Level Cross-Ownership Validation Trigger
-- Enforces that the referenced movie exists and belongs to the same user_id.
-- ------------------------------------------------------------------------------
create or replace function public.validate_movie_watch_source_ownership()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.movies m
    where m.id = new.movie_id and m.user_id = new.user_id
  ) then
    raise exception 'Cross-ownership error: movie does not exist or does not belong to the user.'
      using errcode = 'P0003';
  end if;

  return new;
end;
$$;

drop trigger if exists check_movie_watch_source_ownership on public.movie_watch_sources;
create trigger check_movie_watch_source_ownership
  before insert or update on public.movie_watch_sources
  for each row execute function public.validate_movie_watch_source_ownership();

-- ------------------------------------------------------------------------------
-- 4. Atomic Primary Source Switching RPC Function
-- Safely demotes existing primary source and sets the target source as primary
-- within a single atomic PostgreSQL transaction, preventing partial unique index collision.
-- ------------------------------------------------------------------------------
create or replace function public.set_primary_watch_source(p_source_id uuid)
returns public.movie_watch_sources
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_target record;
  v_updated public.movie_watch_sources;
begin
  -- 1. Locate target record and verify ownership
  select id, movie_id, user_id, is_primary
  into v_target
  from public.movie_watch_sources
  where id = p_source_id;

  if not found then
    raise exception 'Watch source not found.' using errcode = 'P0004';
  end if;

  if v_target.user_id <> auth.uid() then
    raise exception 'Unauthorized: watch source does not belong to the user.' using errcode = '42501';
  end if;

  -- 2. If already primary, return directly
  if v_target.is_primary = true then
    select * into v_updated from public.movie_watch_sources where id = p_source_id;
    return v_updated;
  end if;

  -- 3. Atomically demote previous primary source for this movie
  update public.movie_watch_sources
  set is_primary = false, updated_at = now()
  where movie_id = v_target.movie_id
    and is_primary = true
    and id <> p_source_id;

  -- 4. Set target record as primary
  update public.movie_watch_sources
  set is_primary = true, updated_at = now()
  where id = p_source_id
  returning * into v_updated;

  return v_updated;
end;
$$;

revoke all on function public.set_primary_watch_source(uuid) from anon, public;
grant execute on function public.set_primary_watch_source(uuid) to authenticated;

-- ------------------------------------------------------------------------------
-- 5. Row Level Security (RLS) - Private by Default
-- ------------------------------------------------------------------------------
alter table public.movie_watch_sources enable row level security;

-- SELECT: User can only select their own watch sources
drop policy if exists "Users can select own watch sources" on public.movie_watch_sources;
create policy "Users can select own watch sources"
  on public.movie_watch_sources for select
  to authenticated
  using (user_id = auth.uid());

-- INSERT: User can only insert if source belongs to them AND movie belongs to them
drop policy if exists "Users can insert own watch sources" on public.movie_watch_sources;
create policy "Users can insert own watch sources"
  on public.movie_watch_sources for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.movies m
      where m.id = movie_watch_sources.movie_id
        and m.user_id = auth.uid()
    )
  );

-- UPDATE: User can only update their own watch sources
drop policy if exists "Users can update own watch sources" on public.movie_watch_sources;
create policy "Users can update own watch sources"
  on public.movie_watch_sources for update
  to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.movies m
      where m.id = movie_watch_sources.movie_id
        and m.user_id = auth.uid()
    )
  );

-- DELETE: User can only delete their own watch sources
drop policy if exists "Users can delete own watch sources" on public.movie_watch_sources;
create policy "Users can delete own watch sources"
  on public.movie_watch_sources for delete
  to authenticated
  using (user_id = auth.uid());

-- ------------------------------------------------------------------------------
-- 6. Role Permission Hardening: Revoke from anon, grant to authenticated
-- ------------------------------------------------------------------------------
revoke all on public.movie_watch_sources from anon, public;
grant select, insert, update, delete on public.movie_watch_sources to authenticated;

-- ------------------------------------------------------------------------------
-- 7. Legacy Data Backfill (Idempotent)
-- Migrates existing movies.watch_url into public.movie_watch_sources.
-- Original movies.watch_url column is strictly preserved for backward compatibility.
-- ------------------------------------------------------------------------------
insert into public.movie_watch_sources (
  movie_id,
  user_id,
  platform_name,
  source_url,
  access_type,
  is_primary,
  notes,
  created_at,
  updated_at
)
select
  m.id as movie_id,
  m.user_id as user_id,
  case
    when m.watch_url ~* 'netflix\.com' then 'Netflix'
    when m.watch_url ~* '(primevideo\.com|amazon\.com)' then 'Prime Video'
    when m.watch_url ~* '(disneyplus\.com|hotstar\.com)' then 'Disney+'
    when m.watch_url ~* '(apple\.com/tv|tv\.apple\.com)' then 'Apple TV+'
    when m.watch_url ~* 'vidio\.com' then 'Vidio'
    when m.watch_url ~* 'catchplay\.com' then 'Catchplay+'
    when m.watch_url ~* 'wetv\.vip' then 'WeTV'
    when m.watch_url ~* '(iq\.com|iqiyi\.com)' then 'iQIYI'
    when m.watch_url ~* '(max\.com|hbomax\.com|hbogoasia)' then 'HBO Max / Go'
    when m.watch_url ~* 'bioskoponline\.com' then 'Bioskop Online'
    when m.watch_url ~* '(youtube\.com|youtu\.be)' then 'YouTube'
    when m.watch_url ~* 'mubi\.com' then 'MUBI'
    when m.watch_url ~* 'criterionchannel\.com' then 'Criterion Channel'
    when m.watch_url ~* 'viki\.com' then 'Viki'
    when m.watch_url ~* 'klikfilm\.com' then 'KlikFilm'
    else 'Tautan Tontonan'
  end as platform_name,
  trim(m.watch_url) as source_url,
  case
    when m.watch_url ~* '(netflix\.com|primevideo\.com|amazon\.com|disneyplus\.com|hotstar\.com|apple\.com|vidio\.com|catchplay\.com|wetv\.vip|iq\.com|iqiyi\.com|max\.com|hbomax\.com|hbogoasia|mubi\.com|criterionchannel\.com|viki\.com)' then 'subscription'
    when m.watch_url ~* '(youtube\.com|youtu\.be)' then 'free'
    when m.watch_url ~* '(bioskoponline\.com|klikfilm\.com)' then 'rent'
    else 'other'
  end as access_type,
  true as is_primary,
  'Migrasi otomatis dari tautan tontonan lama' as notes,
  m.created_at,
  m.updated_at
from public.movies m
where m.watch_url is not null
  and trim(m.watch_url) <> ''
  and m.watch_url ~* '^https?://\S+$'
  and not exists (
    select 1 from public.movie_watch_sources ws
    where ws.movie_id = m.id
  );
