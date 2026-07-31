# Checklist release Google Play — Yermat

Généré pour accompagner la mise en production sur Play Console (app.yermat).
À copier-coller dans les formulaires Play Console — vérifie/adapte avant d'envoyer.

## Politique de confidentialité
URL : https://doran56.github.io/yermat-mobile/privacy-policy.html

## Sécurité des données (Data safety form)

Basé sur `docs/privacy-policy.html`. Pour chaque type de données ci-dessous, Play Console demande :
collectée ? partagée avec des tiers ? à quelle fin ? optionnelle ou obligatoire ? chiffrée en transit ? supprimable ?

| Type de donnée | Collectée | Partagée | Finalité | Obligatoire | Chiffrée en transit | Supprimable par l'utilisateur |
|---|---|---|---|---|---|---|
| Adresse e-mail | Oui | Non | Fonctionnalité de l'app (auth OTP) | Oui | Oui | Oui (suppression de compte) |
| Photos/vidéos (contenu utilisateur) | Oui | Non | Fonctionnalité de l'app (partage social) | Oui | Oui | Oui |
| Position approximative/précise | Oui | Non | Fonctionnalité de l'app (carte des points d'eau) | Non (permission) | Oui | Oui |
| Identifiant utilisateur | Oui | Non | Fonctionnalité de l'app, prévention des abus | Oui | Oui | Oui |
| Jeton de notification push | Oui | Non | Fonctionnalité de l'app (notifications) | Non | Oui | Oui |

Réponses aux questions générales :
- **Vos données sont-elles chiffrées en transit ?** Oui (HTTPS/TLS via Supabase).
- **Proposez-vous un moyen de demander la suppression des données ?** Oui — suppression de compte, traité sous 30 jours (voir politique de confidentialité section 6).
- **Ces données sont-elles partagées avec des tiers ?** Non, à l'exception des sous-traitants techniques nécessaires au service (hébergement Supabase, service de notifications push, fournisseur de cartes) — pas de partage à des fins publicitaires ou marketing.
- **Publicité dans l'app ?** Non.

## Classification du contenu (questionnaire)

Positionnement : app d'hydratation / bien-être — pas de contenu à risque (pas d'alcool, pas de violence, pas de contenu à caractère sexuel).
- Violence : Non
- Contenu sexuel : Non
- Langage grossier : Non (sauf si UGC — cocher "contenu généré par les utilisateurs non modéré" si pas de modération stricte en place)
- Substances contrôlées (alcool/drogue/tabac) : Non
- Interactions utilisateur : Oui (partage de contenu, commentaires) → cocher "Partage de position" si carte publique, "Contenu généré par les utilisateurs"

⚠️ Vérifier s'il y a une modération des vidéos avant publication (répond à "Contenu utilisateur non filtré ?").

## Cible et contenu (Target audience)
- Public cible suggéré : 13+ ou 16+ selon la politique interne (plus l'app n'est plus 18+ liée à l'alcool, un ciblage plus large est possible) — à confirmer selon la stratégie produit.
- Si des mineurs peuvent utiliser l'app : compléter la déclaration "Familles" si applicable (probablement non nécessaire ici).

## Fiche store (store listing)

**Titre** : Yermat

**Description courte** (80 car. max) :
> Suis ton hydratation, partage tes sessions et défie tes amis en vidéo.

**Description longue** (brouillon, à valider/adapter) :
> Yermat t'aide à rester hydraté au quotidien, de façon fun et sociale.
>
> 💧 Enregistre tes sessions d'hydratation en vidéo et partage-les avec ta communauté
> 🏆 Grimpe dans le classement et suis tes progrès
> 🗺️ Retrouve les points d'eau autour de toi sur la carte
> 👥 Suis tes amis, réagis à leurs sessions ("Gouttes") et reste motivé ensemble
>
> Rejoins Yermat et fais de l'hydratation un jeu !

**Catégorie suggérée** : Santé et remise en forme (Health & Fitness), ou Social selon le positionnement dominant.

**Assets manquants à préparer** :
- Icône 512x512 (dérivable de `assets/icon.png`, à vérifier resolution)
- Feature graphic 1024x500 (à créer)
- Captures d'écran (min. 2, recommandé 4-8) — à prendre depuis l'app sur device/simulateur

## Test fermé obligatoire (nouveau compte développeur)
- Publier une release en test fermé (le même .aab uploadé en test interne convient)
- Recruter ≥ 12 testeurs (emails Gmail) inscrits sur au moins 14 jours
- Seulement après : le bouton "Demander à publier en production" se débloque

## Prochaine build/submit automatisé
Une fois le premier upload manuel absorbé par Google (fait), les prochaines versions peuvent être soumises via :
```
eas build --platform android --profile production
eas submit --platform android --profile production
```
