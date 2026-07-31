ALTER TABLE public.performances
  ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
