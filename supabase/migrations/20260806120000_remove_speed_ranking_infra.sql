-- Mise en conformité Apple Guideline 5 (Legal) : retrait de l'infrastructure de
-- classement/notifications basée sur la vitesse de consommation.
--
-- La campagne push "ranking" (notify-engagement) poussait quotidiennement les
-- utilisateurs à "défendre leur place" ou "passer 1er" dans un classement trié
-- par temps de consommation le plus rapide (time_ms). Le code de la campagne a
-- été retiré de l'edge function ; on désactive ici le cron qui la déclenchait.

SELECT cron.unschedule('engagement-ranking');

-- time_ms / chug_start_ms / chug_end_ms sont conservées sur `performances` pour
-- l'historique, mais ne doivent plus être utilisées pour trier, classer ou
-- récompenser (voir hooks/useClassement.tsx, submit-performance,
-- award-monthly-medals : basés sur la participation, plus sur la vitesse).
COMMENT ON COLUMN public.performances.time_ms IS
  'Durée mesurée de la vidéo, conservée à titre historique uniquement. Ne plus utiliser pour classer/récompenser (Apple Guideline 5).';
COMMENT ON COLUMN public.performances.chug_start_ms IS
  'Horodatage interne historique. Ne plus utiliser pour classer/récompenser (Apple Guideline 5).';
COMMENT ON COLUMN public.performances.chug_end_ms IS
  'Horodatage interne historique. Ne plus utiliser pour classer/récompenser (Apple Guideline 5).';
