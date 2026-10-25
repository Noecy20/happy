# Happy Mobile : guide complet (installation, fonctionnement, présentation)

Application **Android et iOS** de Happy, construite avec **Expo + React Native + TypeScript**.
Elle utilise **exactement le même backend Supabase** que le site web : mêmes tables, mêmes fonctions RPC, mêmes règles de sécurité. Rien n'a été recréé côté base, sauf une petite migration pour les notifications push mobiles.

---

## 1. En une phrase (pour ouvrir la présentation)

> Happy est une plateforme abidjanaise de listes de cadeaux d'anniversaire **avec effet surprise** : la personne fêtée crée sa liste, ses proches réservent et commandent auprès de boutiques partenaires, et elle ne découvre **qui a offert quoi** que le lendemain de son anniversaire. L'application mobile reprend toutes les fonctions du site, dans la poche.

---

## 2. Architecture (à dessiner au tableau)

```
 Téléphone (app Expo)                     Site web Next.js (Vercel)              Supabase
 ┌──────────────────────┐   HTTPS        ┌──────────────────────────┐          ┌────────────────────────┐
 │ Écrans expo-router   │ ─────────────► │ /api/admin/users/[id]    │ ───────► │ Auth (téléphone/email) │
 │ supabase-js (anon)   │   Bearer token │ /api/admin/vendors       │ service  │ Tables + RLS           │
 │ NativeWind / SVG     │                │ /api/push/order|notify   │  role    │ Fonctions RPC          │
 │ expo-notifications   │                │ /api/cron/quotidien      │          │ Storage (bucket gifts) │
 └─────────┬────────────┘                └───────────┬──────────────┘          │ Realtime (notifications)│
           │  RPC + tables (clé anon, RLS)           │ Expo Push                └────────────────────────┘
           └─────────────────────────────────────────┼──────────────────────────────────▲
                                                     ▼
                                          https://exp.host (Expo Push, gratuit)
```

Points clés à dire :

- **L'app parle directement à Supabase** avec la clé publique `anon`. La sécurité ne dépend pas de l'app : elle est garantie par les **règles RLS** et les **fonctions SQL**.
- **Aucune clé secrète** dans l'app (ni `service_role`, ni clé VAPID privée). Les deux seules actions qui en ont besoin (supprimer un compte, créer une boutique) passent par les **routes du site web**, avec le jeton de session de l'admin.
- **L'anonymat est garanti par la base** : le célébrant ne peut jamais lire les tables `claims` ni `orders`. La fonction `get_my_gifts()` ne renvoie le nom de l'ami qu'à partir du **lendemain** de l'anniversaire.

---

## 3. Installation (à faire une seule fois)

### 3.1 Prérequis

- **Node.js 20 ou plus** (`node -v`).
- Sur le téléphone : l'application **Expo Go** (Play Store / App Store), **à jour** (l'app utilise le SDK Expo 57).
- Le téléphone et l'ordinateur sur le **même Wi-Fi**.

### 3.2 Base de données (Supabase > SQL Editor)

Exécuter **une fois** le fichier `supabase/3-push-mobile.sql` (après `1-schema.sql` et `2-mise-a-jour-v5.sql` déjà en place).
Il ajoute la table `expo_push_tokens` et les fonctions `save_expo_push_token` / `forget_expo_push_token`. Il est **rejouable** et ne supprime aucune donnée.

Vérifier aussi : Supabase > Authentication > Providers > Email > **« Confirm email » désactivé** (indispensable pour l'inscription par téléphone).

### 3.3 Variables d'environnement (une commande)

```bash
cd mobile
node scripts/setup.js
```

Ce script crée :
- **`.npmrc`** (`legacy-peer-deps=true`, évite un conflit de versions react / react-dom à l'installation) ;
- **`.env`** à partir du `.env.local` du site : il recopie **uniquement** l'URL Supabase et la clé publique `anon` (jamais la clé `service_role`).

Il reste ensuite à vérifier **`EXPO_PUBLIC_SITE_URL`** dans `mobile/.env` :

| Situation | Valeur |
|---|---|
| Site déployé (recommandé) | `https://votre-site.vercel.app` |
| Site lancé sur votre PC | `http://192.168.X.X:3000` (adresse IP de votre PC sur le Wi-Fi, **pas** `localhost` : sur le téléphone, `localhost` désigne le téléphone lui-même). Lancer alors le site avec `npm run dev -- -H 0.0.0.0`. |

Cette URL sert aux liens de partage, à la suppression de comptes / création de boutiques par l'admin, et aux notifications de commande.

### 3.4 Lancer l'application

```bash
cd mobile
npm install          # installe les dépendances (après node scripts/setup.js, qui a créé .npmrc)
npx expo start       # démarre le serveur de développement
```

Puis scanner le **QR code** affiché :
- **Android** : avec l'application Expo Go ;
- **iPhone** : avec l'appareil photo, qui propose d'ouvrir Expo Go.

Raccourcis utiles dans le terminal : `r` recharger, `j` ouvrir le débogueur, `w` ouvrir une version navigateur (aperçu de secours si le téléphone pose problème pendant la démo).

Si le QR code ne se connecte pas (réseau d'entreprise, pare-feu) : `npx expo start --tunnel`.

### 3.5 Vérifier le code

```bash
npm run typecheck    # = npx tsc --noEmit, doit afficher 0 erreur
```

---

## 4. Organisation du code

```
mobile/
├── app.json              Configuration Expo : nom, icônes, schéma « happy », App Links Android, Universal Links iOS, permissions
├── eas.json              Profils de compilation EAS (development, preview = APK, production)
├── .env / .env.example   Variables publiques EXPO_PUBLIC_* (.env créé par scripts/setup.js)
├── scripts/setup.js      Crée .npmrc et .env (valeurs publiques reprises du site)
├── babel.config.js       Preset Expo + NativeWind
├── metro.config.js       Bundler + compilation de global.css par NativeWind
├── tailwind.config.js    Design system (mêmes couleurs que le web : ink, plum, candy, mango, lilac, paper, mint)
└── src/
    ├── app/              ÉCRANS (expo-router : 1 fichier = 1 écran, l'arborescence = les URL)
    │   ├── _layout.tsx         Racine : polices, providers, ouverture d'un écran au toucher d'une notification
    │   ├── index.tsx           Accueil (visiteur) ou redirection vers l'espace selon le rôle
    │   ├── connexion.tsx       « Email ou téléphone » + mot de passe
    │   ├── inscription.tsx     Sélecteur « Mon anniversaire / Ma boutique »
    │   ├── contact.tsx         Formulaire « Nous contacter »
    │   ├── e/[token].tsx       Page de l'anniversaire pour les amis (lien partagé)
    │   ├── boutiques/          Liste des boutiques + vitrine [id] avec commande directe
    │   ├── suivi/              Saisie d'un code + suivi [code]
    │   ├── espace/             CÉLÉBRANT : Anniversaire, Ma liste, Invités, Notifications, Profil
    │   ├── vendeur/            BOUTIQUE : Commandes, Articles, Ma vitrine, Notifications
    │   └── admin/              ADMIN : Utilisateurs, Boutiques, Messages, Réglages
    ├── components/       Briques d'interface réutilisables
    │   ├── ui.tsx              Boutons, champs, cartes, badges, feuilles modales, écran standard…
    │   ├── Cake.tsx            Gâteau SVG animé, une bougie par année (jusqu'à 36)
    │   ├── WrappedCard.tsx     Carte cadeau qui « s'emballe » (papier satiné + ruban champagne)
    │   ├── WrapPaper.tsx       Le papier cadeau et les rubans
    │   ├── Invitation.tsx      Enveloppe qui s'ouvre sur la carte d'invitation
    │   ├── FlipCard.tsx        Carte qui se retourne à la révélation
    │   ├── Countdown.tsx       Compte à rebours jours / heures / min / sec
    │   ├── OrderTracking.tsx   Suivi de commande (étapes, historique, contact boutique)
    │   ├── Illustrations.tsx   Pile de cadeaux, fonds décoratifs des boutiques, logo
    │   ├── DateField, ColorPicker, ImageField, PaymentPicker, ShareLink, PushButton, NotificationsList…
    │   └── celebrant/ vendor/ admin/   Formulaires propres à chaque rôle
    ├── providers/        État partagé
    │   ├── AuthProvider.tsx       Session, profil, rôle, déconnexion propre
    │   ├── FxProvider.tsx         Toasts et confettis (désactivés si « réduire les animations »)
    │   ├── CelebrantProvider.tsx  Données de l'espace célébrant
    │   ├── VendorProvider.tsx     Données de l'espace boutique
    │   └── AdminProvider.tsx      Données de l'espace admin
    └── lib/              Logique sans interface
        ├── supabase.ts     Client Supabase (session dans AsyncStorage, detectSessionInUrl: false)
        ├── utils.ts        Copie de lib/utils.ts du web : phoneToEmail, formatPrice (FCFA), nextBirthday, readableOn…
        ├── types.ts        Types des tables et des réponses RPC
        ├── api.ts          Appels aux routes du site (Bearer token)
        ├── push.ts         Notifications Expo (permission, jeton, enregistrement)
        ├── upload.ts       Galerie photo → bucket « gifts/<uid>/… »
        ├── memory.ts       Mémoire locale des visiteurs sans compte (codes de suivi, réponse à l'invitation)
        └── theme.ts        Couleurs, polices, ombres
```

Tout le code est **commenté en français** : chaque fichier commence par un bloc qui explique son rôle.

---

## 5. Comment ça marche, rôle par rôle

### 5.1 Inscription et connexion (`inscription.tsx`, `connexion.tsx`)

- **Email facultatif**. Sans email, l'identifiant technique est `<chiffres du téléphone>@tel.happy.app` (`phoneToEmail`). Il n'est jamais affiché : le trigger SQL `handle_new_user` met `profiles.email` à null.
- Les infos du formulaire partent en **métadonnées** de `signUp` ; le trigger crée le profil et, pour une boutique, la ligne `vendors` **en attente**.
- Le **logo** d'une boutique est envoyé juste après l'inscription (il faut être connecté pour écrire dans le bucket).
- Connexion : si la saisie n'est pas un email, elle est convertie avec `phoneToEmail`. Puis redirection selon le rôle : admin → `/admin`, boutique → `/vendeur`, célébrant → `/espace`.
- Compte supprimé par l'admin : `AuthProvider` le détecte (profil absent ou `refresh_token_not_found`) et déconnecte proprement.

### 5.2 Célébrant (`app/espace/`)

1. **Créer l'anniversaire** : prénom + date de naissance complète. Aperçu immédiat « Prochain anniversaire : samedi 20 décembre 2026 · 24 ans » (`nextBirthday`) ; la vraie valeur est calculée en SQL (`next_birthday`).
2. **Personnaliser** : titre, message, **couleur de thème** (palette + couleur libre en hexadécimal, toujours visiblement sélectionnée), dress code pré-rempli « Tout en … ».
3. **Fête** (interrupteur) : date, heure, lieu, infos.
4. **Ma liste** : article de boutique (boutique → article avec stock → variantes) ou cadeau libre (photo, prix, contact, lien). Un cadeau réservé est emballé et n'est plus modifiable.
5. **Accès payant** : durée (7 à 90 jours) ou dates « du … au … », prix = max(minimum, jours × prix/jour) lu dans `settings`, paiement Wave / Orange / MTN / Moov, référence + capture. L'espace se prépare **sans** accès ; seule la **publication** l'exige (trigger `prepare_event`).
6. **Publier** : confirmation (prénom et date verrouillés), confettis.
7. **Deux liens** : *lien invités* (avec invitation et réponse) et *lien liste seule* (sans aucune info de fête). Boutons copier, WhatsApp, partage natif, aperçu.
8. **Suivi** : « X / Y cadeaux pris en charge », barre de progression, gâteau animé, compte à rebours.
9. **Invités** : personnes attendues, oui, peut-être, non, et la liste.
10. **Révélation** : le lendemain, des cartes emballées se retournent au toucher et montrent le nom et le mot de l'ami.

### 5.3 Ami / invité, sans compte (`app/e/[token].tsx`)

- `get_public_event(token)` renvoie l'événement et les cadeaux ; **la base** décide si c'est un lien invités (`invited`) ou non.
- En-tête sombre aux couleurs du thème, gâteau, compte à rebours, boutons « Voir l'invitation », « Choisir un cadeau », « Me rappeler l'anniversaire ».
- **Enveloppe** qui s'ouvre, puis « Serez-vous là ? » (RPC `rsvp`), réponse mémorisée sur le téléphone.
- **Réserver** (RPC `claim_gift`) : nom, téléphone, email facultatif, lieu et date de livraison, emballage si proposé, petit mot. Le cadeau s'emballe pour tout le monde (rafraîchissement toutes les 15 s). Rupture de stock = non réservable.
- **Suivi dans une feuille**, sans quitter la page (`get_order_tracking`).

### 5.4 Boutiques publiques (`app/boutiques/`)

- Liste des boutiques **actives** (validées) avec fond décoratif propre à chacune, filtres et recherche.
- Vitrine : catégories de la boutique, badges « Plus que 2 » / « Rupture », emballage, variantes.
- **Commande directe** (RPC `place_order`) : quantité limitée au stock, variantes obligatoires, option cadeau / surprise / message, emballage, total recalculé, code de suivi.

### 5.5 Espace boutique (`app/vendeur/`)

- Tant que la boutique n'est pas validée : frais, numéros, référence + capture. Elle ne peut **pas** s'auto-valider (trigger `guard_vendor`).
- **Commandes regroupées** « Anniversaire de <prénom> », puis « Commandes directes ». Appel, WhatsApp, email, livraison, badges Cadeau / Surprise / Emballage, message carte, note, statut, payé.
- Changement de statut : RPC `vendor_update_order`. **Le stock baisse à la validation et remonte à l'annulation, en SQL.** Puis l'app appelle `POST <site>/api/push/order` pour prévenir l'acheteur.
- **Articles** : photo, prix, catégorie (ou nouvelle catégorie dans le même formulaire), variantes, stock, emballage, masquer, supprimer. **Inventaire** : stock réel + historique (`vendor_set_stock`, `inventory_movements`).

### 5.6 Admin (`app/admin/`)

- **Utilisateurs** : filtres, badge de demande, **Accorder** en un geste, fiche détaillée (paiement + capture), couper l'accès, supprimer.
- **Boutiques** : en attente d'abord, Valider / Refuser (`admin_validate_vendor`), mettre en ligne / masquer, voir, supprimer, **ajouter une boutique** (créée validée).
- **Messages** du formulaire contact. **Réglages** : tarifs et numéros de paiement.
- Devenir admin : `update public.profiles set role = 'admin' where phone = '...';`

### 5.7 Notifications

- **In-app, en temps réel** : Supabase Realtime sur la table `notifications` (filtre `user_id`). Badge sur l'onglet, toast, rechargement automatique (ex. un cadeau vient d'être réservé).
- **Push mobile** (Expo Push, gratuit) : la permission est demandée **seulement quand l'utilisateur touche un bouton** (« Me rappeler l'anniversaire », « Être prévenu de l'avancement », « Recevoir aussi les notifications sur ce téléphone »).
- Côté serveur, `lib/expopush.ts` envoie vers `https://exp.host/--/api/v2/push/send` et supprime les jetons invalides (`DeviceNotRegistered`). Il est appelé par `sendPush()` : **`/api/push/notify`, `/api/push/order` et le cron quotidien envoient donc automatiquement au web ET au mobile.**

### 5.8 Liens profonds

Les liens partagés restent des **URL web** (`/e/<token>`, `/boutiques/<id>`, `/suivi/<code>`) : un ami sans l'app fait tout dans son navigateur. Si l'app est installée, Android (App Links) et iOS (Universal Links) l'ouvrent directement sur le bon écran, grâce à :
- `app.json` : `intentFilters` (Android) et `associatedDomains` (iOS) ;
- site web : `public/.well-known/assetlinks.json` et `public/.well-known/apple-app-site-association`.

---

## 6. Ce qui a été modifié dans le projet web (sans rien casser)

| Fichier | Modification |
|---|---|
| `supabase/3-push-mobile.sql` | **Nouveau** : table `expo_push_tokens` + RPC `save_expo_push_token`, `forget_expo_push_token` |
| `lib/expopush.ts` | **Nouveau** : envoi vers Expo Push, nettoyage des jetons invalides |
| `lib/webpush.ts` | `sendPush()` envoie aussi vers le mobile (et fonctionne même sans clés VAPID) |
| `lib/supabase/request-user.ts` | **Nouveau** : utilisateur depuis les cookies (web) **ou** `Authorization: Bearer` (mobile) |
| `app/api/admin/users/[id]/route.ts` | Utilise `getRequestUser(req)` |
| `app/api/admin/vendors/route.ts` | Utilise `getRequestUser(req)` |
| `public/.well-known/*` | **Nouveaux** : fichiers des liens universels |
| `next.config.mjs` | En-tête `Content-Type: application/json` pour ces fichiers |
| `README.md` | Mention de la migration 3 et du dossier mobile |

Le site web continue de fonctionner exactement comme avant (les cookies restent lus en premier si aucun jeton n'est envoyé).

---

## 7. Scénario de démonstration (environ 10 minutes)

Préparer avant : un compte **admin**, des numéros de paiement dans Réglages, la migration 3 jouée. Utiliser **deux téléphones** ou se déconnecter entre les rôles (Profil > Se déconnecter).

1. **Accueil** : montrer la démo « Je m'en charge » → le cadeau s'emballe (papier + ruban).
2. **Boutique** : s'inscrire « Ma boutique » sans email → écran « en attente » → envoyer une référence de paiement → ajouter un article avec variante (Taille : S, M, L), stock 5, emballage 1 000 FCFA.
3. **Admin** : onglet Boutiques → la boutique est en tête → **Valider**. Elle apparaît maintenant dans « Voir les boutiques ».
4. **Célébrant** : s'inscrire « Mon anniversaire » **avec un téléphone, sans email** → créer l'anniversaire (montrer « Prochain anniversaire … · 24 ans ») → choisir une couleur (le gâteau change) → activer la fête → Ma liste : ajouter l'article de la boutique avec la taille M → **Demander l'accès** 30 jours, Wave, référence.
5. Essayer de publier : impossible tant que l'accès n'est pas validé (bouton « Demande en cours »).
6. **Admin** : Utilisateurs → filtre « En attente » → **Accorder** (un geste).
7. **Célébrant** : tirer pour rafraîchir → « Publier » → confettis → les **deux liens**.
8. **Ami** : ouvrir le **lien invités** (bouton Aperçu) → enveloppe → « Oui, 3 personnes » → réserver le cadeau avec emballage et date → code de suivi → « Suivre ma commande » dans la feuille.
9. Ouvrir le **lien liste seule** : aucune information de fête.
10. **Célébrant** : « 1 / 1 pris en charge », onglet Invités « 3 personnes attendues », **aucun nom d'ami** visible.
11. **Boutique** : notification « Nouvelle commande », commande rangée sous « Anniversaire de <prénom> » → statut **Acceptée** → Inventaire : le stock passe de 5 à 4 → **Annulée** → il remonte à 5.
12. **Admin** : Réglages → modifier un tarif ; Boutiques → **Ajouter une boutique** ; Utilisateurs → **supprimer** un compte de test.

---

## 8. Questions probables et réponses

- **« Et si quelqu'un modifie l'app pour voir le nom des offreurs ? »** Impossible : le célébrant n'a aucun droit de lecture sur `claims` et `orders` (RLS). La seule porte est `get_my_gifts()`, qui ne renvoie le nom qu'après la date en SQL.
- **« Un célébrant peut-il publier sans payer ? »** Non : le trigger `prepare_event` refuse la publication sans accès actif, quelle que soit l'interface.
- **« Une boutique peut-elle se valider seule ? »** Non : le trigger `guard_vendor` ignore toute modification de `status`/`active` qui ne vient pas d'un admin.
- **« Pourquoi passer par le site pour supprimer un compte ? »** Parce que cela exige la clé `service_role`, qui ne doit jamais être dans une app installée sur des téléphones.
- **« Pourquoi les liens sont des liens web ? »** Pour que les amis sans l'app puissent tout faire. Avec l'app installée, le lien ouvre l'app.
- **« Les notifications coûtent-elles quelque chose ? »** Non : Expo Push et Web Push sont gratuits.
- **« Accessibilité ? »** Zones tactiles de 44 px minimum, libellés d'accessibilité, respect de « réduire les animations » (gâteau, emballage, confettis immobiles), champs qui remontent au-dessus du clavier.

---

## 9. Publier l'application (EAS Build)

```bash
npm install -g eas-cli
eas login
eas init                       # crée le projet Expo et remplit extra.eas.projectId dans app.json
eas build -p android --profile preview   # APK installable directement
eas build -p ios --profile preview       # nécessite un compte Apple Developer
```

Pour les liens universels en production :
1. remplacer `happy.example.com` par votre domaine dans `app.json` ;
2. `eas credentials` → copier l'empreinte **SHA-256** Android dans `public/.well-known/assetlinks.json` ;
3. remplacer `REMPLACER_PAR_TEAM_ID` par votre Team ID Apple dans `apple-app-site-association` ;
4. redéployer le site.

Les variables `EXPO_PUBLIC_*` peuvent être déclarées dans EAS (`eas env:create`) pour les builds.

---

## 10. Limites connues et dépannage

| Problème | Explication / solution |
|---|---|
| Les push ne marchent pas dans Expo Go sur Android | Normal depuis le SDK 53 : Expo Go ne reçoit plus les push distants. Utiliser un *development build* : `eas build --profile development`. Les notifications **in-app en temps réel** fonctionnent, elles, dans Expo Go. |
| « Jeton de notification indisponible » | Lancer `eas init` pour obtenir le `projectId`. |
| Suppression / création de boutique / notification de commande échoue | `EXPO_PUBLIC_SITE_URL` doit pointer vers le site **joignable depuis le téléphone** (pas `localhost`). |
| « Impossible de joindre Supabase » | Vérifier le fichier `.env`, puis relancer `npx expo start -c` (le `-c` vide le cache et relit `.env`). |
| Le QR code ne se connecte pas | Même Wi-Fi, ou `npx expo start --tunnel`. |
| Expo Go indique une version de SDK incompatible | Mettre à jour Expo Go depuis le store. |
| Inscription « Confirmez votre email » | Désactiver « Confirm email » dans Supabase. |
| Écran blanc après une modification | `r` dans le terminal pour recharger, ou `npx expo start -c`. |

---

*Vérifications effectuées : `npx tsc --noEmit` sans erreur, compilation complète des bundles Android et iOS (`expo export`), rendu des écrans publics et des animations (gâteau, enveloppe, emballage, carte qui se retourne) vérifié en aperçu.*
