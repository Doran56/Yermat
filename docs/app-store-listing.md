# Guide de remplissage App Store Connect — Yermat

> Suis les sections dans l'ordre de l'interface App Store Connect (ASC).
> Positionnement : « le Strava des bars » — zéro mention de vitesse de consommation (risque guideline 1.4.3).
> Champs `<À REMPLIR>` = infos que toi seul as.

---

## ⚙️ À PRÉPARER AVANT (les 3 vrais bloquants)
1. **Politique de confidentialité en ligne** — héberger `docs/privacy-policy.html` → obtenir une URL publique.
2. **Compte démo** — une boîte mail dédiée (Gmail/iCloud) pour que le reviewer récupère le code OTP.
3. **Screenshots** — au moins format 6.7" (1290 × 2796).

---

## 1. App Information  (My Apps → Yermat → General → App Information)

| Champ | Valeur |
|---|---|
| **Name** | `Yermat` |
| **Subtitle** | `Défi tes potes au bar` |
| **Category (Primary)** | Social Networking |
| **Category (Secondary)** | Lifestyle *(optionnel)* |
| **Content Rights** | Cocher « contient du contenu tiers » → **Non** (contenu original/utilisateur) |
| **Privacy Policy URL** | `<URL de ta privacy policy hébergée>` |

---

## 2. Age Rating  (App Information → Age Rating → Edit)
Réponds au questionnaire ainsi :
- **Alcohol, Tobacco, or Drug Use or References** → **Frequent/Intense**
- **Contests** → **Infrequent/Mild**
- Tout le reste → **None**
- Unrestricted Web Access → **Non** · Gambling → **Non**

➡️ Résultat attendu : **17+**. (Ne pas sous-déclarer l'alcool = motif de retrait.)

---

## 3. Pricing and Availability
- **Price** : Free (0)
- **Availability** : France (ou tous pays, à ton choix)

---

## 4. App Privacy  (App Privacy → Get Started)
**Collectez-vous des données ?** → **Oui**. Déclare ces types, tous **liés à l'utilisateur**, **AUCUN tracking** :

| Type de donnée (catégorie ASC) | Purpose | Linked | Tracking |
|---|---|---|---|
| **Email Address** (Contact Info) | App Functionality | Oui | Non |
| **Coarse Location** (Location) | App Functionality | Oui | Non |
| **Photos or Videos** (User Content) | App Functionality | Oui | Non |
| **User ID** (Identifiers) | App Functionality | Oui | Non |

À la fin : **« Used for tracking »** → **Non** sur tout (aucun SDK pub/analytics dans le projet).

---

## 5. Version 1.0  (section « iOS App 1.0 » dans la sidebar gauche)

### 5a. Promotional Text (170 car. — modifiable sans review)
```
Le Strava des bars : défie tes potes, filme tes exploits et grimpe au classement de ton bar. À consommer avec modération.
```

### 5b. Description
```
Yermat, c'est le Strava des bars : l'app qui transforme tes soirées entre potes en défis et en classements.

Lance un défi à ta bande, filme tes performances et vois qui domine le classement de ton bar préféré. Une appli sociale pour s'amuser entre amis, pas en solo.

🎯 DÉFIE TES POTES
Crée des défis et invite ta bande à relever le challenge.

🎥 FILME TES EXPLOITS
Capture tes moments en vidéo directement dans l'app et partage-les avec tes amis.

🏆 GRIMPE AU CLASSEMENT
Compare-toi à tes potes et aux habitués de chaque bar. À toi le sommet.

🗺️ TROUVE LES BARS
Repère les bars autour de toi sur la carte et découvre où ça se passe.

👥 SUIS TA BANDE
Abonne-toi à tes amis, réagis à leurs performances, ne rate rien.

Yermat est réservée aux personnes de 18 ans et plus. L'abus d'alcool est dangereux pour la santé. À consommer avec modération.
```

### 5c. Keywords (100 car. max — pas d'espaces après les virgules)
```
défi,potes,bar,amis,classement,soirée,fun,challenge,sortie,vidéo,bande,social
```

### 5d. URLs
- **Support URL** : `<URL ou page support — peut être un mailto ou page Notion>`
- **Marketing URL** *(optionnel)* : laisser vide

### 5e. Screenshots
- **6.7" Display** (obligatoire) : 1290 × 2796 px — 3 à 5 visuels
- Ordre conseillé : **Feed → Classement → Carte → Profil**
- Capture via simulateur iPhone 16 Pro Max (`Cmd+S` dans le simulateur)

### 5f. Build
- Clique « + » à côté de **Build** → sélectionne le build uploadé (apparaît après traitement TestFlight, ~5-15 min).

### 5g. General Information
- **Version** : `1.0`
- **Copyright** : `2026 <Ton nom ou société>`

### 5h. App Review Information  ⚠️ CRITIQUE
- **Sign-in required** → **Oui**
- **Demo account** :
  - User name : `<email de la boîte mail dédiée>`
  - Password : *(laisse vide si login OTP — explique dans les notes)*
- **Notes** :
```
La connexion se fait via un code à usage unique (OTP) envoyé par email, sans mot de passe.
Pour vous connecter :
1. Saisissez l'email de démo ci-dessous dans l'app.
2. Récupérez le code à 6 chiffres dans la boîte mail (identifiants fournis).
3. Saisissez le code dans l'app.

Email de démo : <REMPLIR>
Accès à la boîte mail — identifiant : <REMPLIR> / mot de passe : <REMPLIR>

Note : Yermat est une app sociale de défis entre amis, réservée aux 18+, avec un
message de modération sur la consommation d'alcool affiché dans l'app.
```
- **Contact Information** : `<Prénom> <Nom>`, `<téléphone>`, `<email>`

### 5i. Version Release
- **Automatically release** après approbation (recommandé) — ou manuel si tu veux choisir le moment.

### 5j. Export Compliance (à la soumission)
- « Utilise-t-il du chiffrement ? » → **Oui** (HTTPS standard)
- « Exempté ? » → **Oui** (chiffrement standard/exempté) → pas de doc à fournir.

---

## 6. Submit for Review
Une fois tout rempli + build sélectionné → bouton **« Add for Review »** puis **« Submit »** (en haut à droite). Délai de review : ~24-48h.
