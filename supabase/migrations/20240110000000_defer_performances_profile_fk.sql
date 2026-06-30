-- Migration: make performances_user_id_profiles_fkey deferrable
--
-- handle_new_user() (see 20240105000000_profile_email_recovery.sql) re-links a
-- migrated web user's child tables to the new auth UUID within a single transaction,
-- updating public.performances BEFORE public.profiles. The FK added in
-- 20240104000000_fix_performances_profile_fk.sql is non-deferrable, so the performances
-- update is checked at end-of-statement — when NEW.id is not yet present in
-- profiles.user_id — and fails with 23503, surfacing as "500: Database error saving
-- new user" / unexpected_failure on POST /otp. Web users could not log in on mobile.
--
-- Making the FK DEFERRABLE INITIALLY DEFERRED defers the check to COMMIT, by which point
-- both performances.user_id and profiles.user_id point to NEW.id. The constraint name and
-- columns are unchanged, so the PostgREST embed profiles!performances_user_id_profiles_fkey(...)
-- used in all performance queries keeps resolving.

ALTER TABLE public.performances
  DROP CONSTRAINT performances_user_id_profiles_fkey;

ALTER TABLE public.performances
  ADD CONSTRAINT performances_user_id_profiles_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(user_id)
  DEFERRABLE INITIALLY DEFERRED;
