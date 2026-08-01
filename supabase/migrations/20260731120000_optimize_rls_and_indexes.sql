-- Perf advisor: wrap auth.<fn>() calls in RLS policies with (select ...) so
-- Postgres evaluates them once per query instead of once per row, and add
-- indexes for foreign keys that were missing a covering index.
-- Purely mechanical rewrites — same access-control semantics, cheaper to run.

ALTER POLICY "Authenticated users can follow bars" ON public.bar_follows
  WITH CHECK (((select auth.role()) = 'authenticated'::text) AND ((select auth.uid()) = user_id));

ALTER POLICY "Users can unfollow bars" ON public.bar_follows
  USING ((select auth.uid()) = user_id);

ALTER POLICY "Admins can manage bar rewards" ON public.bar_rewards
  USING (has_role((select auth.uid()), 'admin'::app_role));

ALTER POLICY "Users can update own notifications" ON public.notifications
  USING ((select auth.uid()) = user_id);

ALTER POLICY "Users can view own notifications" ON public.notifications
  USING ((select auth.uid()) = user_id);

ALTER POLICY "Authenticated users can comment" ON public.performance_comments
  WITH CHECK (((select auth.role()) = 'authenticated'::text) AND ((select auth.uid()) = user_id));

ALTER POLICY "Users can delete own comments" ON public.performance_comments
  USING ((select auth.uid()) = user_id);

ALTER POLICY "Authenticated users can yermat" ON public.performance_yermats
  WITH CHECK (((select auth.role()) = 'authenticated'::text) AND ((select auth.uid()) = user_id));

ALTER POLICY "Users can un-yermat" ON public.performance_yermats
  USING ((select auth.uid()) = user_id);

ALTER POLICY "Admins can update any performance" ON public.performances
  USING (has_role((select auth.uid()), 'admin'::app_role));

ALTER POLICY "Admins can view all performances" ON public.performances
  USING (has_role((select auth.uid()), 'admin'::app_role));

ALTER POLICY "Users can insert their own performances" ON public.performances
  WITH CHECK ((select auth.uid()) = user_id);

ALTER POLICY "Users can update their own performances" ON public.performances
  USING ((select auth.uid()) = user_id);

ALTER POLICY "Users can view their own performances" ON public.performances
  USING ((select auth.uid()) = user_id);

ALTER POLICY "Authenticated users can view profiles" ON public.profiles
  USING ((select auth.role()) = 'authenticated'::text);

ALTER POLICY "Users can insert their own profile" ON public.profiles
  WITH CHECK ((select auth.uid()) = user_id);

ALTER POLICY "Users can update their own profile" ON public.profiles
  USING ((select auth.uid()) = user_id);

ALTER POLICY "Users can manage own push subscriptions" ON public.push_subscriptions
  USING ((select auth.uid()) = user_id);

ALTER POLICY "Users can insert own tiktok consents" ON public.tiktok_consents
  WITH CHECK ((select auth.uid()) = user_id);

ALTER POLICY "Users can view own tiktok consents" ON public.tiktok_consents
  USING ((select auth.uid()) = user_id);

ALTER POLICY "Users can follow" ON public.user_follows
  WITH CHECK ((select auth.uid()) = follower_id);

ALTER POLICY "Users can unfollow" ON public.user_follows
  USING ((select auth.uid()) = follower_id);

ALTER POLICY "Admins can view roles" ON public.user_roles
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = (select auth.uid()) AND ur.role = 'admin'::app_role
  ));

CREATE INDEX IF NOT EXISTS idx_bar_rewards_bar_id ON public.bar_rewards(bar_id);
CREATE INDEX IF NOT EXISTS idx_performances_challenge_type_id ON public.performances(challenge_type_id);
CREATE INDEX IF NOT EXISTS idx_tiktok_consents_performance_id ON public.tiktok_consents(performance_id);
