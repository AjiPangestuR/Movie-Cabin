-- ==============================================================================
-- MOCAB (Movie Cabin) - Migration: Phase 2 Database Schema & Security
-- Tables: movies, moods, movie_moods, watch_logs
-- Triggers, RLS, Helper Functions
-- ==============================================================================

-- Enable UUID extension if not already enabled
create extension if not exists "pgcrypto";

-- ------------------------------------------------------------------------------
-- 1. Helper Function: trigger updated_at
-- ------------------------------------------------------------------------------
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ------------------------------------------------------------------------------
-- 2. Table: movies
-- ------------------------------------------------------------------------------
create table if not exists public.movies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  tmdb_id integer null,
  title text not null,
  release_year integer null,
  runtime integer null,
  synopsis text null default '',
  source_url text null default '',
  watch_url text null default '',
  status text not null default 'unwatched' check (status in ('unwatched', 'watched')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Trigger updated_at for movies
drop trigger if exists set_movies_updated_at on public.movies;
create trigger set_movies_updated_at
  before update on public.movies
  for each row execute function public.handle_updated_at();

-- Unique constraint: (user_id, tmdb_id) when tmdb_id is not null
create unique index if not exists movies_user_tmdb_unique
  on public.movies (user_id, tmdb_id)
  where tmdb_id is not null;

-- Index for title search and user lookup
create index if not exists movies_user_status_idx on public.movies (user_id, status);
create index if not exists movies_user_created_at_idx on public.movies (user_id, created_at desc);

-- ------------------------------------------------------------------------------
-- 3. Table: moods
-- ------------------------------------------------------------------------------
create table if not exists public.moods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  name text not null check (char_length(trim(name)) >= 1 and char_length(trim(name)) <= 24),
  slug text not null,
  created_at timestamptz not null default now()
);

-- Unique constraint: (user_id, lower(trim(name)))
create unique index if not exists moods_user_lower_name_unique
  on public.moods (user_id, lower(trim(name)));

-- ------------------------------------------------------------------------------
-- 4. Table: movie_moods (Many-to-Many)
-- ------------------------------------------------------------------------------
create table if not exists public.movie_moods (
  movie_id uuid not null references public.movies(id) on delete cascade,
  mood_id uuid not null references public.moods(id) on delete cascade,
  primary key (movie_id, mood_id)
);

create index if not exists movie_moods_mood_id_idx on public.movie_moods (mood_id);

-- ------------------------------------------------------------------------------
-- 5. Table: watch_logs (Creator Archive Notes & Ratings)
-- ------------------------------------------------------------------------------
create table if not exists public.watch_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  movie_id uuid not null references public.movies(id) on delete cascade,
  watched_at timestamptz not null default now(),
  movie_rating integer not null check (movie_rating >= 1 and movie_rating <= 10),
  content_potential integer not null check (content_potential >= 1 and content_potential <= 10),
  theme text null default '',
  scene text null default '',
  angle text null default '',
  notes text null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint watch_logs_movie_id_unique unique (movie_id)
);

-- Trigger updated_at for watch_logs
drop trigger if exists set_watch_logs_updated_at on public.watch_logs;
create trigger set_watch_logs_updated_at
  before update on public.watch_logs
  for each row execute function public.handle_updated_at();

create index if not exists watch_logs_user_potential_idx on public.watch_logs (user_id, content_potential desc);

-- ------------------------------------------------------------------------------
-- 6. Helper Function: ensure_default_moods(p_user_id)
-- ------------------------------------------------------------------------------
create or replace function public.ensure_default_moods(p_user_id uuid default auth.uid())
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
begin
  v_user_id := coalesce(p_user_id, auth.uid());
  if v_user_id is null then
    return;
  end if;

  -- Only insert if user currently has 0 moods
  if not exists (select 1 from public.moods where user_id = v_user_id) then
    insert into public.moods (user_id, name, slug)
    values
      (v_user_id, 'Psikologis', 'psikologis'),
      (v_user_id, 'Emosional', 'emosional'),
      (v_user_id, 'Romantis', 'romantis'),
      (v_user_id, 'Coming of Age', 'coming-of-age'),
      (v_user_id, 'Gelap', 'gelap'),
      (v_user_id, 'Intens', 'intens'),
      (v_user_id, 'Reflektif', 'reflektif')
    on conflict (user_id, lower(trim(name))) do nothing;
  end if;
end;
$$;

-- ------------------------------------------------------------------------------
-- 7. Row Level Security (RLS) Policies
-- ------------------------------------------------------------------------------

-- Enable RLS on all tables
alter table public.movies enable row level security;
alter table public.moods enable row level security;
alter table public.movie_moods enable row level security;
alter table public.watch_logs enable row level security;

-- Policies for public.movies
drop policy if exists "Users can select own movies" on public.movies;
create policy "Users can select own movies"
  on public.movies for select
  using (user_id = auth.uid());

drop policy if exists "Users can insert own movies" on public.movies;
create policy "Users can insert own movies"
  on public.movies for insert
  with check (user_id = auth.uid());

drop policy if exists "Users can update own movies" on public.movies;
create policy "Users can update own movies"
  on public.movies for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Users can delete own movies" on public.movies;
create policy "Users can delete own movies"
  on public.movies for delete
  using (user_id = auth.uid());

-- Policies for public.moods
drop policy if exists "Users can select own moods" on public.moods;
create policy "Users can select own moods"
  on public.moods for select
  using (user_id = auth.uid());

drop policy if exists "Users can insert own moods" on public.moods;
create policy "Users can insert own moods"
  on public.moods for insert
  with check (user_id = auth.uid());

drop policy if exists "Users can update own moods" on public.moods;
create policy "Users can update own moods"
  on public.moods for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Users can delete own moods" on public.moods;
create policy "Users can delete own moods"
  on public.moods for delete
  using (user_id = auth.uid());

-- Policies for public.movie_moods
-- Ensures parent movie and mood belong to current user
drop policy if exists "Users can select own movie_moods" on public.movie_moods;
create policy "Users can select own movie_moods"
  on public.movie_moods for select
  using (
    exists (
      select 1 from public.movies m
      where m.id = movie_moods.movie_id
        and m.user_id = auth.uid()
    )
  );

drop policy if exists "Users can insert own movie_moods" on public.movie_moods;
create policy "Users can insert own movie_moods"
  on public.movie_moods for insert
  with check (
    exists (
      select 1 from public.movies m
      where m.id = movie_moods.movie_id
        and m.user_id = auth.uid()
    )
    and
    exists (
      select 1 from public.moods md
      where md.id = movie_moods.mood_id
        and md.user_id = auth.uid()
    )
  );

drop policy if exists "Users can delete own movie_moods" on public.movie_moods;
create policy "Users can delete own movie_moods"
  on public.movie_moods for delete
  using (
    exists (
      select 1 from public.movies m
      where m.id = movie_moods.movie_id
        and m.user_id = auth.uid()
    )
  );

-- Policies for public.watch_logs
drop policy if exists "Users can select own watch_logs" on public.watch_logs;
create policy "Users can select own watch_logs"
  on public.watch_logs for select
  using (
    user_id = auth.uid()
    and exists (
      select 1 from public.movies m
      where m.id = watch_logs.movie_id
        and m.user_id = auth.uid()
    )
  );

drop policy if exists "Users can insert own watch_logs" on public.watch_logs;
create policy "Users can insert own watch_logs"
  on public.watch_logs for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.movies m
      where m.id = watch_logs.movie_id
        and m.user_id = auth.uid()
    )
  );

drop policy if exists "Users can update own watch_logs" on public.watch_logs;
create policy "Users can update own watch_logs"
  on public.watch_logs for update
  using (
    user_id = auth.uid()
    and exists (
      select 1 from public.movies m
      where m.id = watch_logs.movie_id
        and m.user_id = auth.uid()
    )
  )
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.movies m
      where m.id = watch_logs.movie_id
        and m.user_id = auth.uid()
    )
  );

drop policy if exists "Users can delete own watch_logs" on public.watch_logs;
create policy "Users can delete own watch_logs"
  on public.watch_logs for delete
  using (
    user_id = auth.uid()
    and exists (
      select 1 from public.movies m
      where m.id = watch_logs.movie_id
        and m.user_id = auth.uid()
    )
  );
