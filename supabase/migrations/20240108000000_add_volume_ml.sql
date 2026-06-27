-- Hydratation : volume bu (en millilitres) par performance.
-- Permet de calculer la consommation (jour/semaine/mois/année) et la vitesse en L/s.
ALTER TABLE public.performances
  ADD COLUMN IF NOT EXISTS volume_ml INTEGER;
