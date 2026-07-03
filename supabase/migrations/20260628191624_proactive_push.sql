-- Proactive push notifications — réengagement, FOMO weekend, urgence compétitive

-- 1. Étendre les types de notifications (réactifs + proactifs)
ALTER TABLE public.notifications
  DROP CONSTRAINT notifications_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'user_performance',
    'bar_performance',
    'comment',
    'yermat',
    'new_follower',
    'rank_beaten',
    'personal_best',
    'medal_earned',
    'winback_friends',
    'weekend_nudge',
    'ranking_urgency',
    'ranking_climbable'
  ));

-- 2. Analytics d'ouverture
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS pushed_at  TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS opened_at  TIMESTAMP WITH TIME ZONE;

-- 3. Suivi d'activité pour la segmentation (winback / weekend)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_profiles_last_active ON public.profiles(last_active_at);
CREATE INDEX IF NOT EXISTS idx_notifications_type_created
  ON public.notifications(user_id, type, created_at);

-- 4. Extensions de planification (convention Supabase: cron + net)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 6. Helper: déclenche une campagne notify-engagement via HTTP (secrets via Vault)
CREATE OR REPLACE FUNCTION public.trigger_engagement_campaign(_campaign TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public, extensions, vault
AS $$
DECLARE
  _url TEXT;
  _key TEXT;
BEGIN
  SELECT decrypted_secret INTO _url FROM vault.decrypted_secrets WHERE name = 'project_url';
  SELECT decrypted_secret INTO _key FROM vault.decrypted_secrets WHERE name = 'service_role_key';
  IF _url IS NULL OR _key IS NULL THEN
    RAISE WARNING 'notify-engagement: vault secrets project_url/service_role_key manquants';
    RETURN;
  END IF;

  PERFORM net.http_post(
    url     := _url || '/functions/v1/notify-engagement',
    headers := jsonb_build_object(
                 'Content-Type',  'application/json',
                 'Authorization', 'Bearer ' || _key
               ),
    body    := jsonb_build_object('campaign', _campaign)
  );
END;
$$;

-- 7. Planification des campagnes (heures UTC — quiet hours Paris gérées dans la function)
SELECT cron.schedule('engagement-winback', '30 17 * * *',
  $$ SELECT public.trigger_engagement_campaign('winback'); $$);

SELECT cron.schedule('engagement-weekend', '30 17 * * 5,6',
  $$ SELECT public.trigger_engagement_campaign('weekend'); $$);

SELECT cron.schedule('engagement-ranking', '0 18 * * *',
  $$ SELECT public.trigger_engagement_campaign('ranking'); $$);

-- Bonus : médailles mensuelles (1er du mois)
SELECT cron.schedule('award-monthly-medals', '30 2 1 * *',
  $$
  SELECT net.http_post(
    url     := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url') || '/functions/v1/award-monthly-medals',
    headers := jsonb_build_object(
                 'Content-Type',  'application/json',
                 'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
               ),
    body    := '{}'::jsonb
  );
  $$);
