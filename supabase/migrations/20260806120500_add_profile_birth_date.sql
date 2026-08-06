-- Mise en conformité Apple Guideline 5 (Legal) : vérification d'âge réelle.
-- Le champ `age_verified` existait déjà mais n'était jamais renseigné par le
-- code applicatif. On ajoute une date de naissance auto-déclarée pour pouvoir
-- réellement calculer et vérifier l'âge (18+) avant l'accès à l'app.

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS birth_date DATE;

COMMENT ON COLUMN public.profiles.birth_date IS 'Date de naissance auto-déclarée à l''inscription, utilisée pour la vérification d''âge (18+) requise par Apple Guideline 5.';
COMMENT ON COLUMN public.profiles.age_verified IS 'Vrai une fois que l''utilisateur a déclaré une date de naissance correspondant à 18 ans ou plus (voir app/(auth)/age-gate.tsx).';
