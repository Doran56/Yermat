-- Décision produit du 6 août 2026 : le temps (time_ms) est réaffiché de façon
-- discrète (composant TimeTag, texte simple) sur les cartes/fiches de Yermat,
-- et devient un critère de tri disponible dans l'onglet Recherche (ex-onglet
-- Classement, désormais un outil de parcours/filtres et non un classement
-- compétitif : plus de podium, de médailles ni de notifications liées).
--
-- Ce choix a été fait en connaissance de cause : il réintroduit un signal de
-- vitesse de consommation visible et triable par tous, ce qui expose à un
-- nouveau rejet Apple Guideline 5 pour le même motif que le rejet initial
-- (voir migration 20260806120000_remove_speed_ranking_infra.sql). Le
-- commentaire précédent sur cette colonne ("ne plus utiliser pour classer")
-- est donc corrigé pour refléter l'état réel du produit.

COMMENT ON COLUMN public.performances.time_ms IS
  'Durée mesurée de la vidéo. Affichée discrètement (TimeTag) et triable dans l''onglet Recherche depuis le 06/08/2026 — décision produit assumant le risque de re-rejet Apple Guideline 5 (voir docs/app-store-listing.md).';
