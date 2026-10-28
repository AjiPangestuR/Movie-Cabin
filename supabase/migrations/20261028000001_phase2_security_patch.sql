-- ==============================================================================
-- MOCAB (Movie Cabin) - Migration: Phase 2 Security Patch
-- 1. handle_updated_at() -> SECURITY INVOKER
-- 2. Revoke all on all tables in schema public from anon
-- ==============================================================================

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = pg_catalog.now();
  return new;
end;
$$;

-- Revoke all table privileges from anon in schema public
revoke all on all tables in schema public from anon;
