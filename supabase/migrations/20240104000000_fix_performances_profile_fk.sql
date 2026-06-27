-- Migration: add FK performances.user_id → profiles.user_id
-- This allows PostgREST to resolve the join hint used in all performance queries:
--   profiles!performances_user_id_profiles_fkey(...)
-- All 468 existing performances.user_id values already exist in profiles.user_id
-- (verified: 0 orphaned performances before this migration).

ALTER TABLE public.performances
  ADD CONSTRAINT performances_user_id_profiles_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(user_id)
  NOT VALID;

ALTER TABLE public.performances
  VALIDATE CONSTRAINT performances_user_id_profiles_fkey;
