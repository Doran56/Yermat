-- Historique : la migration 20240108000000_add_volume_ml.sql (fichier local) n'avait
-- jamais été appliquée à la base distante. Le code (hydratation, useCreatePerformance)
-- référence cette colonne depuis longtemps sans qu'elle existe réellement.
ALTER TABLE public.performances
  ADD COLUMN IF NOT EXISTS volume_ml INTEGER;
