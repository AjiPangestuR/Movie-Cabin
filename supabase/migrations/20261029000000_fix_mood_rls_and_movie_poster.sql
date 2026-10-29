-- ==============================================================================
-- MOCAB (Movie Cabin) - Migration: Fix Mood RLS and Movie Poster Persistence
-- 1. Add poster_path column to public.movies
-- 2. Add UPDATE and DELETE RLS policies to public.moods
-- 3. Update atomic RPC save_movie_with_moods to accept p_poster_path
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Schema Enhancement: public.movies.poster_path
-- ------------------------------------------------------------------------------
alter table public.movies
  add column if not exists poster_path text null;

comment on column public.movies.poster_path is
  'TMDB relative poster image path (misal /gEU2QniE6E77NI6lCU6MxlNBvIx.jpg). Digunakan untuk merender poster resmi tanpa fetch HTTP berulang.';

-- ------------------------------------------------------------------------------
-- 2. RLS Policies: public.moods (UPDATE & DELETE)
-- Mengizinkan pengguna authenticated mengubah (rename) dan menghapus mood miliknya.
-- ------------------------------------------------------------------------------
drop policy if exists "Users can update own moods" on public.moods;
create policy "Users can update own moods"
  on public.moods for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Users can delete own moods" on public.moods;
create policy "Users can delete own moods"
  on public.moods for delete
  to authenticated
  using (user_id = auth.uid());

-- ------------------------------------------------------------------------------
-- 3. Atomic RPC: save_movie_with_moods (dengan dukungan p_poster_path)
-- ------------------------------------------------------------------------------

-- Hapus signature lama (8 parameter) untuk mencegah ambiguitas PostgREST
drop function if exists public.save_movie_with_moods(text, integer, integer, text, text, text, integer, uuid[]);

-- Buat fungsi baru dengan 9 parameter termasuk p_poster_path
create or replace function public.save_movie_with_moods(
  p_title text,
  p_release_year integer default null,
  p_runtime integer default null,
  p_synopsis text default '',
  p_source_url text default null,
  p_watch_url text default null,
  p_tmdb_id integer default null,
  p_mood_ids uuid[] default array[]::uuid[],
  p_poster_path text default null
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
  v_clean_poster text;
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
  v_clean_poster := nullif(trim(coalesce(p_poster_path, '')), '');

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
    poster_path,
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
    v_clean_poster,
    'unwatched'
  ) returning id into v_movie_id;

  -- Insert relasi mood (atomik dalam transaksi yang sama)
  insert into public.movie_moods (movie_id, mood_id)
  select v_movie_id, unnest(v_deduped_moods);

  return v_movie_id;
end;
$$;

-- Hak akses RPC
revoke execute on function public.save_movie_with_moods(text, integer, integer, text, text, text, integer, uuid[], text) from public, anon;
grant execute on function public.save_movie_with_moods(text, integer, integer, text, text, text, integer, uuid[], text) to authenticated;
