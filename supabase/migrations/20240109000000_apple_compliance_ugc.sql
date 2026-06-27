-- Conformité Apple Guideline 1.2 (UGC) : signalement de contenu + blocage d'utilisateurs.

-- ─── Signalements de contenu ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.content_reports (
  id               UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_type     TEXT NOT NULL CHECK (content_type IN ('performance', 'comment')),
  content_id       UUID NOT NULL,
  reported_user_id UUID,
  reason           TEXT NOT NULL CHECK (reason IN ('offensive', 'sexual', 'violence', 'spam', 'other')),
  details          TEXT CHECK (char_length(details) <= 500),
  status           TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'actioned', 'dismissed')),
  created_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (reporter_id, content_type, content_id)
);

ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS content_reports_status_idx ON public.content_reports (status);
CREATE INDEX IF NOT EXISTS content_reports_content_idx ON public.content_reports (content_type, content_id);

CREATE POLICY "Users can create their own reports" ON public.content_reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Reporter or admin can view reports" ON public.content_reports
  FOR SELECT USING (auth.uid() = reporter_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update reports" ON public.content_reports
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- ─── Blocage d'utilisateurs ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_blocks (
  id         UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  blocker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);

ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS user_blocks_blocker_idx ON public.user_blocks (blocker_id);
CREATE INDEX IF NOT EXISTS user_blocks_blocked_idx ON public.user_blocks (blocked_id);

CREATE POLICY "Users can view their own blocks" ON public.user_blocks
  FOR SELECT USING (auth.uid() = blocker_id);

CREATE POLICY "Users can create their own blocks" ON public.user_blocks
  FOR INSERT WITH CHECK (auth.uid() = blocker_id);

CREATE POLICY "Users can delete their own blocks" ON public.user_blocks
  FOR DELETE USING (auth.uid() = blocker_id);
