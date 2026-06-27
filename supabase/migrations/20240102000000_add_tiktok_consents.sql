CREATE TABLE public.tiktok_consents (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  performance_id uuid REFERENCES public.performances(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  posted boolean DEFAULT false,
  posted_at timestamptz,
  error text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.tiktok_consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tiktok consents"
  ON public.tiktok_consents FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tiktok consents"
  ON public.tiktok_consents FOR INSERT
  WITH CHECK (auth.uid() = user_id);
