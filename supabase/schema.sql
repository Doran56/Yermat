-- ============================================================
-- YERMAT — Schéma Supabase complet (nouveau projet)
-- À exécuter dans l'ordre dans le SQL Editor de Supabase
-- ============================================================

-- 1. ENUMS
-- ============================================================
CREATE TYPE public.performance_visibility AS ENUM ('public', 'followers', 'private');
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');


-- 2. FONCTIONS UTILITAIRES
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;


-- 3. PROFILES
-- ============================================================
CREATE TABLE public.profiles (
  id          UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  username    TEXT NOT NULL,
  avatar_url  TEXT,
  age_verified BOOLEAN NOT NULL DEFAULT false,
  gender      TEXT,
  xp          INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view profiles" ON public.profiles
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on auth signup (email OTP compatible)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  base_username TEXT;
  final_username TEXT;
  counter INTEGER := 0;
BEGIN
  -- Derive username from email (before @), sanitized
  base_username := lower(regexp_replace(split_part(NEW.email, '@', 1), '[^a-z0-9_]', '', 'g'));
  IF length(base_username) < 3 THEN
    base_username := 'user' || base_username;
  END IF;
  final_username := base_username;

  -- Handle duplicate usernames
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username) LOOP
    counter := counter + 1;
    final_username := base_username || counter::TEXT;
  END LOOP;

  INSERT INTO public.profiles (user_id, username, avatar_url)
  VALUES (
    NEW.id,
    final_username,
    NEW.raw_user_meta_data ->> 'avatar_url'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- 4. BARS
-- ============================================================
CREATE TABLE public.bars (
  id               UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name             TEXT NOT NULL,
  address          TEXT NOT NULL,
  lat              DOUBLE PRECISION NOT NULL,
  lng              DOUBLE PRECISION NOT NULL,
  city             TEXT NOT NULL,
  google_place_id  TEXT UNIQUE,
  is_active        BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.bars ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active bars" ON public.bars
  FOR SELECT USING (is_active = true);


-- 5. CHALLENGE TYPES
-- ============================================================
CREATE TABLE public.challenge_types (
  id                         UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name                       TEXT NOT NULL,
  description                TEXT,
  tutorial_illustration_url  TEXT,
  is_active                  BOOLEAN NOT NULL DEFAULT true,
  created_at                 TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.challenge_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active challenge types" ON public.challenge_types
  FOR SELECT USING (is_active = true);

-- Seed
INSERT INTO public.challenge_types (name, description) VALUES
  ('Cul sec 25cl', 'Vider un verre de 25cl d''un trait. Le verre part de la table, tu lances, tu bois, tu arrêtes.'),
  ('Cul sec 50cl', 'Vider un verre de 50cl d''un trait. Mêmes règles, verre plus grand !');


-- 6. PERFORMANCES
-- ============================================================
CREATE TABLE public.performances (
  id                UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bar_id            UUID REFERENCES public.bars(id) ON DELETE SET NULL,
  challenge_type_id UUID NOT NULL REFERENCES public.challenge_types(id) ON DELETE CASCADE,
  time_ms           INTEGER NOT NULL,
  volume_ml         INTEGER,
  video_url         TEXT,
  video_status      TEXT NOT NULL DEFAULT 'none',
  status            TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'unverified')),
  visibility        public.performance_visibility NOT NULL DEFAULT 'public',
  video_start_ms    INTEGER NOT NULL DEFAULT 0,
  chug_start_ms     INTEGER,
  chug_end_ms       INTEGER,
  video_end_ms      INTEGER,
  user_lat          DOUBLE PRECISION,
  user_lng          DOUBLE PRECISION,
  created_at        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.performances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view public approved performances" ON public.performances
  FOR SELECT USING (
    status IN ('approved', 'unverified', 'pending')
    AND visibility = 'public'
  );

CREATE POLICY "Users can view their own performances" ON public.performances
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own performances" ON public.performances
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own performances" ON public.performances
  FOR UPDATE USING (auth.uid() = user_id);

-- Indexes for feed performance
CREATE INDEX idx_performances_status ON public.performances(status);
CREATE INDEX idx_performances_user_id ON public.performances(user_id);
CREATE INDEX idx_performances_bar_id ON public.performances(bar_id);
CREATE INDEX idx_performances_created_at ON public.performances(created_at DESC);


-- 7. PERFORMANCE YERMATS (likes)
-- ============================================================
CREATE TABLE public.performance_yermats (
  id             UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  performance_id UUID NOT NULL REFERENCES public.performances(id) ON DELETE CASCADE,
  user_id        UUID NOT NULL,
  created_at     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(performance_id, user_id)
);

ALTER TABLE public.performance_yermats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view yermats" ON public.performance_yermats
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can yermat" ON public.performance_yermats
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = user_id);

CREATE POLICY "Users can un-yermat" ON public.performance_yermats
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_yermats_performance ON public.performance_yermats(performance_id);


-- 8. PERFORMANCE COMMENTS
-- ============================================================
CREATE TABLE public.performance_comments (
  id             UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  performance_id UUID NOT NULL REFERENCES public.performances(id) ON DELETE CASCADE,
  user_id        UUID NOT NULL,
  content        TEXT NOT NULL CHECK (char_length(content) <= 500),
  created_at     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.performance_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view comments" ON public.performance_comments
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can comment" ON public.performance_comments
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = user_id);

CREATE POLICY "Users can delete own comments" ON public.performance_comments
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_comments_performance ON public.performance_comments(performance_id);
CREATE INDEX idx_comments_created ON public.performance_comments(created_at);


-- 9. USER FOLLOWS
-- ============================================================
CREATE TABLE public.user_follows (
  id           UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id)
);

ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view follows" ON public.user_follows
  FOR SELECT USING (true);

CREATE POLICY "Users can follow" ON public.user_follows
  FOR INSERT WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow" ON public.user_follows
  FOR DELETE USING (auth.uid() = follower_id);

CREATE INDEX idx_user_follows_follower ON public.user_follows(follower_id);
CREATE INDEX idx_user_follows_following ON public.user_follows(following_id);


-- 10. BAR FOLLOWS
-- ============================================================
CREATE TABLE public.bar_follows (
  id         UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bar_id     UUID NOT NULL REFERENCES public.bars(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, bar_id)
);

ALTER TABLE public.bar_follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view bar follows" ON public.bar_follows
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can follow bars" ON public.bar_follows
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = user_id);

CREATE POLICY "Users can unfollow bars" ON public.bar_follows
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_bar_follows_user ON public.bar_follows(user_id);
CREATE INDEX idx_bar_follows_bar ON public.bar_follows(bar_id);


-- 11. NOTIFICATIONS
-- ============================================================
CREATE TABLE public.notifications (
  id             UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id        UUID NOT NULL,
  type           TEXT NOT NULL CHECK (type IN ('user_performance', 'bar_performance')),
  performance_id UUID,
  source_user_id UUID,
  source_bar_id  UUID,
  read           BOOLEAN NOT NULL DEFAULT false,
  created_at     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications" ON public.notifications
  FOR INSERT WITH CHECK (true);

CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_read ON public.notifications(read);

-- Trigger: notify followers when a performance is approved & public
CREATE OR REPLACE FUNCTION public.notify_followers_on_performance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'approved' AND NEW.visibility = 'public' AND
     (OLD.status IS NULL OR OLD.status != 'approved') THEN

    -- Notify user followers
    INSERT INTO public.notifications (user_id, type, performance_id, source_user_id)
    SELECT uf.follower_id, 'user_performance', NEW.id, NEW.user_id
    FROM public.user_follows uf
    WHERE uf.following_id = NEW.user_id
      AND uf.follower_id != NEW.user_id;

    -- Notify bar followers (if bar_id set)
    IF NEW.bar_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, performance_id, source_bar_id)
      SELECT bf.user_id, 'bar_performance', NEW.id, NEW.bar_id
      FROM public.bar_follows bf
      WHERE bf.bar_id = NEW.bar_id
        AND bf.user_id != NEW.user_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_performance_notify_followers
  AFTER INSERT OR UPDATE ON public.performances
  FOR EACH ROW EXECUTE FUNCTION public.notify_followers_on_performance();


-- 12. PUSH SUBSCRIPTIONS (Expo Push Tokens)
-- ============================================================
CREATE TABLE public.push_subscriptions (
  id               UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expo_push_token  TEXT NOT NULL,
  platform         TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  created_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, expo_push_token)
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own push subscriptions" ON public.push_subscriptions
  FOR ALL USING (auth.uid() = user_id);

CREATE TRIGGER update_push_subscriptions_updated_at
  BEFORE UPDATE ON public.push_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- 13. USER ROLES (admin system)
-- ============================================================
CREATE TABLE public.user_roles (
  id      UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role    public.app_role NOT NULL,
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view roles" ON public.user_roles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin')
  );

-- Helper function to check role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- Admin RLS policies for performances
CREATE POLICY "Admins can view all performances" ON public.performances
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update any performance" ON public.performances
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));


-- 14. BAR REWARDS
-- ============================================================
CREATE TABLE public.bar_rewards (
  id          UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bar_id      UUID NOT NULL REFERENCES public.bars(id) ON DELETE CASCADE,
  rank        INTEGER NOT NULL,
  title       TEXT NOT NULL,
  description TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.bar_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active bar rewards" ON public.bar_rewards
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage bar rewards" ON public.bar_rewards
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));


-- 15. MONTHLY MEDALS
-- ============================================================
CREATE TABLE public.monthly_medals (
  id               UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          UUID NOT NULL,
  month            DATE NOT NULL,
  rank             INTEGER NOT NULL,
  category         TEXT NOT NULL,
  challenge_type_id UUID,
  bar_id           UUID,
  time_ms          INTEGER NOT NULL,
  created_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, month, category)
);

ALTER TABLE public.monthly_medals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view medals" ON public.monthly_medals
  FOR SELECT USING (true);

-- Validate rank constraint
CREATE OR REPLACE FUNCTION public.validate_medal_rank()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.rank NOT IN (1, 2, 3) THEN
    RAISE EXCEPTION 'Medal rank must be 1, 2, or 3';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER check_medal_rank
  BEFORE INSERT OR UPDATE ON public.monthly_medals
  FOR EACH ROW EXECUTE FUNCTION public.validate_medal_rank();


-- 16. STORAGE BUCKET
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('videos', 'videos', true, 104857600)  -- 100MB limit
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can view videos" ON storage.objects
  FOR SELECT USING (bucket_id = 'videos');

CREATE POLICY "Authenticated users can upload videos" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'videos' AND auth.role() = 'authenticated');

CREATE POLICY "Users can delete their own videos" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'videos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );


-- ============================================================
-- UGC moderation (Apple Guideline 1.2) — voir migration 20240109
-- ============================================================
CREATE TABLE public.content_reports (
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

CREATE POLICY "Users can create their own reports" ON public.content_reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "Reporter or admin can view reports" ON public.content_reports
  FOR SELECT USING (auth.uid() = reporter_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update reports" ON public.content_reports
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.user_blocks (
  id         UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  blocker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);

ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own blocks" ON public.user_blocks
  FOR SELECT USING (auth.uid() = blocker_id);
CREATE POLICY "Users can create their own blocks" ON public.user_blocks
  FOR INSERT WITH CHECK (auth.uid() = blocker_id);
CREATE POLICY "Users can delete their own blocks" ON public.user_blocks
  FOR DELETE USING (auth.uid() = blocker_id);


-- ============================================================
-- DONE — Points de vérification :
-- 1. Auth > Email OTP activé dans Authentication > Providers
-- 2. Edge Functions déployées depuis /supabase/functions/
-- 3. Secrets configurés : GOOGLE_MAPS_API_KEY
-- 4. Copier SUPABASE_URL + SUPABASE_ANON_KEY dans .env.local
-- ============================================================
