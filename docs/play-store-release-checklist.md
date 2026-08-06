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

Positionnement réel : app sociale autour de sorties en bars, avec des vidéos impliquant de
l'alcool entre adultes. Même déclaration que côté App Store (voir `docs/app-store-listing.md`)
— pas de double discours entre les deux stores.
- Violence : Non
- Contenu sexuel : Non
- Langage grossier : Non (sauf si UGC — cocher "contenu généré par les utilisateurs non modéré" si pas de modération stricte en place)
- Substances contrôlées (alcool/drogue/tabac) : **Oui** (alcool, contexte social entre adultes)
- Interactions utilisateur : Oui (partage de contenu, commentaires) → cocher "Partage de position" si carte publique, "Contenu généré par les utilisateurs"

⚠️ Vérifier s'il y a une modération des vidéos avant publication (répond à "Contenu utilisateur non filtré ?"). Modération UGC déjà en place (signalement/blocage, panel admin de certification) — décrire cette modération dans le questionnaire.

## Cible et contenu (Target audience)
- Public cible : **18 ans et plus** — cohérent avec la vérification d'âge réelle à l'inscription (date de naissance demandée, accès refusé sous 18 ans) et avec le rating 17+ visé côté App Store.
- Aucune déclaration "Familles" : l'app n'est pas destinée aux mineurs et bloque leur inscription.

## Fiche store (store listing)

**Titre** : Yermat

**Description courte** (80 car. max) :
> Le Strava des bars : filme tes soirées entre potes et partage-les. 18+.

**Description longue** (brouillon, à valider/adapter — identique dans l'esprit à la fiche App Store) :
> Yermat, c'est le Strava des bars : l'app qui transforme tes soirées entre potes en vidéos et en classements.
>
> 🎥 Filme tes moments en vidéo directement dans l'app et partage-les avec ta communauté
> 🏆 Grimpe dans le classement des plus actifs et suis tes progrès
> 🗺️ Retrouve les bars autour de toi sur la carte
> 👥 Suis tes amis, réagis à leurs vidéos ("Gouttes") et reste motivé ensemble
>
> Yermat est réservée aux personnes de 18 ans et plus. L'abus d'alcool est dangereux pour la santé, à consommer avec modération.

**Catégorie suggérée** : Social.

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
