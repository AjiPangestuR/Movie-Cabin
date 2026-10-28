-- ==============================================================================
-- MOCAB (Movie Cabin) - Migration: Phase 2 Database Schema & Security (Final)
-- Tables: movies, moods, movie_moods, watch_logs
-- Atomic RPCs, Strict RLS Policies (to authenticated), Check Constraints
-- ==============================================================================

-- Enable UUID extension if not already enabled
create extension if not exists "pgcrypto";

-- ------------------------------------------------------------------------------
-- 1. Helper Function: trigger updated_at
-- Set search_path = '' with schema-qualified function calls
-- ------------------------------------------------------------------------------
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

-- ------------------------------------------------------------------------------
-- 2. Table: movies
-- ------------------------------------------------------------------------------
create table if not exists public.movies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  tmdb_id integer null,
  title text not null check (char_length(trim(title)) >= 1 and char_length(title) <= 200),
  release_year integer null check (release_year is null or (release_year >= 1870 and release_year <= 2100)),
  runtime integer null check (runtime is null or runtime > 0),
  synopsis text null default '' check (synopsis is null or char_length(synopsis) <= 3000),
  source_url text null default null check (
    source_url is null or (
      char_length(source_url) <= 2048
      and source_url ~* '^https?://\S+$'
    )
  ),
  watch_url text null default null check (
    watch_url is null or (
      char_length(watch_url) <= 2048
      and watch_url ~* '^https?://\S+$'
    )
  ),
  status text not null default 'unwatched' check (status in ('unwatched', 'watched')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Trigger updated_at for movies
drop trigger if exists set_movies_updated_at on public.movies;
create trigger set_movies_updated_at
  before update on public.movies
  for each row execute function public.handle_updated_at();

-- Unique partial index 1: (user_id, tmdb_id) when tmdb_id is not null
create unique index if not exists movies_user_tmdb_unique
  on public.movies (user_id, tmdb_id)
  where tmdb_id is not null;

-- Unique partial index 2: (user_id, lower(trim(title)), coalesce(release_year, 0)) when tmdb_id is null
create unique index if not exists movies_user_title_year_unique
  on public.movies (user_id, lower(trim(title)), coalesce(release_year, 0))
  where tmdb_id is null;

-- Query performance indexes
create index if not exists movies_user_status_idx on public.movies (user_id, status);
create index if not exists movies_user_created_at_idx on public.movies (user_id, created_at desc);

-- ------------------------------------------------------------------------------
-- 3. Table: moods
-- ------------------------------------------------------------------------------
create table if not exists public.moods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  name text not null check (char_length(trim(name)) >= 1 and char_length(trim(name)) <= 24),
  slug text not null check (char_length(trim(slug)) >= 1 and char_length(slug) <= 32),
  created_at timestamptz not null default now()
);

-- Unique constraints for moods
create unique index if not exists moods_user_lower_name_unique
  on public.moods (user_id, lower(trim(name)));

create unique index if not exists moods_user_slug_unique
  on public.moods (user_id, slug);

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
  theme text null default '' check (theme is null or char_length(theme) <= 500),
  scene text null default '' check (scene is null or char_length(scene) <= 1000),
  angle text null default '' check (angle is null or char_length(angle) <= 1000),
  notes text null default '' check (notes is null or char_length(notes) <= 5000),
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
-- 6. Helper Function: ensure_default_moods() (Tanpa parameter, pakai auth.uid())
-- ------------------------------------------------------------------------------
create or replace function public.ensure_default_moods()
returns void
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Unauthorized: caller must be authenticated';
  end if;

  -- Only insert if the authenticated user currently has 0 moods
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
-- 7. Atomic RPC: save_movie_with_moods
-- Dedupe p_mood_ids, wajib minimal 1 mood. Rollback otomatis jika gagal.
-- ------------------------------------------------------------------------------
create or replace function public.save_movie_with_moods(
  p_title text,
  p_release_year integer default null,
  p_runtime integer default null,
  p_synopsis text default '',
  p_source_url text default null,
  p_watch_url text default null,
  p_tmdb_id integer default null,
  p_mood_ids uuid[] default array[]::uuid[]
)
returns uuid
language plpgsql
security invoker
set search_path = public, auth, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_movie_id uuid;
  v_clean_title text;
  v_clean_source text;
  v_clean_watch text;
  v_deduped_moods uuid[];
  v_valid_moods_count integer;
begin
  if v_user_id is null then
    raise exception 'Unauthorized: caller must be authenticated';
  end if;

  v_clean_title := trim(p_title);
  if v_clean_title is null or char_length(v_clean_title) < 1 then
    raise exception 'Judul wajib diisi.';
  end if;

  -- Deduplikasi mood IDs
  select coalesce(array_agg(distinct m), array[]::uuid[])
  into v_deduped_moods
  from unnest(p_mood_ids) as m;

  if v_deduped_moods is null or array_length(v_deduped_moods, 1) is null or array_length(v_deduped_moods, 1) < 1 then
    raise exception 'Pilih minimal satu mood.';
  end if;

  -- Verifikasi bahwa seluruh mood_ids yang sudah dideduplikasi milik user yang sedang aktif
  select count(distinct id) into v_valid_moods_count
  from public.moods
  where id = any(v_deduped_moods) and user_id = v_user_id;

  if v_valid_moods_count <> array_length(v_deduped_moods, 1) then
    raise exception 'Satu atau lebih mood tidak valid atau bukan milik akun Anda.';
  end if;

  v_clean_source := nullif(trim(coalesce(p_source_url, '')), '');
  v_clean_watch := nullif(trim(coalesce(p_watch_url, '')), '');

  -- Insert film
  insert into public.movies (
    user_id,
    tmdb_id,
    title,
    release_year,
    runtime,
    synopsis,
    source_url,
    watch_url,
    status
  ) values (
    v_user_id,
    p_tmdb_id,
    v_clean_title,
    p_release_year,
    p_runtime,
    coalesce(p_synopsis, ''),
    v_clean_source,
    v_clean_watch,
    'unwatched'
  ) returning id into v_movie_id;

  -- Insert relasi mood (atomik dalam transaksi yang sama)
  insert into public.movie_moods (movie_id, mood_id)
  select v_movie_id, unnest(v_deduped_moods);

  return v_movie_id;
end;
$$;

-- ------------------------------------------------------------------------------
-- 8. Atomic RPC: update_movie_moods
-- Dedupe p_mood_ids, wajib minimal 1 mood. Rollback otomatis jika gagal.
-- ------------------------------------------------------------------------------
create or replace function public.update_movie_moods(
  p_movie_id uuid,
  p_mood_ids uuid[]
)
returns void
language plpgsql
security invoker
set search_path = public, auth, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_deduped_moods uuid[];
  v_valid_moods_count integer;
begin
  if v_user_id is null then
    raise exception 'Unauthorized: caller must be authenticated';
  end if;

  -- Verifikasi kepemilikan film
  if not exists (select 1 from public.movies where id = p_movie_id and user_id = v_user_id) then
    raise exception 'Film tidak ditemukan atau bukan milik akun Anda.';
  end if;

  -- Deduplikasi mood IDs
  select coalesce(array_agg(distinct m), array[]::uuid[])
  into v_deduped_moods
  from unnest(p_mood_ids) as m;

  if v_deduped_moods is null or array_length(v_deduped_moods, 1) is null or array_length(v_deduped_moods, 1) < 1 then
    raise exception 'Minimal satu mood.';
  end if;

  -- Verifikasi kepemilikan mood
  select count(distinct id) into v_valid_moods_count
  from public.moods
  where id = any(v_deduped_moods) and user_id = v_user_id;

  if v_valid_moods_count <> array_length(v_deduped_moods, 1) then
    raise exception 'Satu atau lebih mood tidak valid atau bukan milik akun Anda.';
  end if;

  -- Hapus relasi lama dan masukkan relasi baru
  delete from public.movie_moods where movie_id = p_movie_id;
  insert into public.movie_moods (movie_id, mood_id)
  select p_movie_id, unnest(v_deduped_moods);
end;
$$;

-- ------------------------------------------------------------------------------
-- 9. Atomic RPC: save_watch_log
-- Cek kepemilikan film, validasi rating/potensi 1..10, upsert log, set status='watched'
-- ------------------------------------------------------------------------------
create or replace function public.save_watch_log(
  p_movie_id uuid,
  p_rating integer,
  p_potential integer,
  p_theme text default '',
  p_scene text default '',
  p_angle text default '',
  p_notes text default ''
)
returns uuid
language plpgsql
security invoker
set search_path = public, auth, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_log_id uuid;
begin
  if v_user_id is null then
    raise exception 'Unauthorized: caller must be authenticated';
  end if;

  -- Cek kepemilikan film
  if not exists (select 1 from public.movies where id = p_movie_id and user_id = v_user_id) then
    raise exception 'Film tidak ditemukan atau bukan milik akun Anda.';
  end if;

  -- Validasi rating & potensi 1..10
  if p_rating is null or p_rating < 1 or p_rating > 10 then
    raise exception 'Rating harus antara 1 dan 10.';
  end if;

  if p_potential is null or p_potential < 1 or p_potential > 10 then
    raise exception 'Potensi konten harus antara 1 dan 10.';
  end if;

  -- Upsert watch_logs (on conflict (movie_id) do update)
  insert into public.watch_logs (
    user_id,
    movie_id,
    movie_rating,
    content_potential,
    theme,
    scene,
    angle,
    notes,
    watched_at
  ) values (
    v_user_id,
    p_movie_id,
    p_rating,
    p_potential,
    coalesce(trim(p_theme), ''),
    coalesce(trim(p_scene), ''),
    coalesce(trim(p_angle), ''),
    coalesce(trim(p_notes), ''),
    now()
  )
  on conflict (movie_id) do update set
    movie_rating = excluded.movie_rating,
    content_potential = excluded.content_potential,
    theme = excluded.theme,
    scene = excluded.scene,
    angle = excluded.angle,
    notes = excluded.notes,
    watched_at = now()
  returning id into v_log_id;

  -- Update status film menjadi 'watched'
  update public.movies
  set status = 'watched'
  where id = p_movie_id and user_id = v_user_id;

  return v_log_id;
end;
$$;

-- ------------------------------------------------------------------------------
-- 10. Row Level Security (RLS) Policies (Strict with TO authenticated)
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
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Users can insert own movies" on public.movies;
create policy "Users can insert own movies"
  on public.movies for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Users can update own movies" on public.movies;
create policy "Users can update own movies"
  on public.movies for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Users can delete own movies" on public.movies;
create policy "Users can delete own movies"
  on public.movies for delete
  to authenticated
  using (user_id = auth.uid());

-- Policies for public.moods
-- Catatan: Policy UPDATE dan DELETE tidak dibuat pada fase ini (masuk backlog)
drop policy if exists "Users can select own moods" on public.moods;
create policy "Users can select own moods"
  on public.moods for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Users can insert own moods" on public.moods;
create policy "Users can insert own moods"
  on public.moods for insert
  to authenticated
  with check (user_id = auth.uid());

-- Policies for public.movie_moods
drop policy if exists "Users can select own movie_moods" on public.movie_moods;
create policy "Users can select own movie_moods"
  on public.movie_moods for select
  to authenticated
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
  to authenticated
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

drop policy if exists "Users can update own movie_moods" on public.movie_moods;
create policy "Users can update own movie_moods"
  on public.movie_moods for update
  to authenticated
  using (
    exists (
      select 1 from public.movies m
      where m.id = movie_moods.movie_id
        and m.user_id = auth.uid()
    )
  )
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
  to authenticated
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
  to authenticated
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
  to authenticated
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
  to authenticated
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
  to authenticated
  using (
    user_id = auth.uid()
    and exists (
      select 1 from public.movies m
      where m.id = watch_logs.movie_id
        and m.user_id = auth.uid()
    )
  );

-- ------------------------------------------------------------------------------
-- 11. Security Hardening: Revoke & Grant Execute on Functions
-- ------------------------------------------------------------------------------
revoke execute on function public.ensure_default_moods() from public, anon;
grant execute on function public.ensure_default_moods() to authenticated;

revoke execute on function public.save_movie_with_moods(text, integer, integer, text, text, text, integer, uuid[]) from public, anon;
grant execute on function public.save_movie_with_moods(text, integer, integer, text, text, text, integer, uuid[]) to authenticated;

revoke execute on function public.update_movie_moods(uuid, uuid[]) from public, anon;
grant execute on function public.update_movie_moods(uuid, uuid[]) to authenticated;

revoke execute on function public.save_watch_log(uuid, integer, integer, text, text, text, text) from public, anon;
grant execute on function public.save_watch_log(uuid, integer, integer, text, text, text, text) to authenticated;
