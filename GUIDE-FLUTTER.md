# Happy : version Flutter + PostgreSQL local

Guide d'installation, d'explication et de présentation.

---

## 1. En une phrase

> Happy est une plateforme abidjanaise de listes de cadeaux d'anniversaire **avec effet surprise** : la personne fêtée crée sa liste et son invitation, ses proches réservent un cadeau et répondent à l'invitation, et elle ne découvre **qui a offert quoi** que le lendemain de son anniversaire.

Dans cette version :

- **application mobile en Flutter** (Android) ;
- **base PostgreSQL installée sur votre machine** (plus besoin de Supabase) ;
- **petit serveur API Node.js** entre l'application et la base ;
- **partie e-commerce** (boutiques, commandes, stock) affichée comme **« Bientôt disponible »**. Les tables existent déjà dans la base, elle sera activée dans une prochaine version.

---

## 2. Architecture (à dessiner au tableau)

```
┌────────────────────────┐    HTTP + JSON     ┌─────────────────────────┐     SQL      ┌──────────────────────────┐
│  Application Flutter   │ ─────────────────► │   Serveur API Node.js   │ ───────────► │  PostgreSQL (base happy) │
│  (émulateur Android)   │  Authorization:    │   server/  (port 4000)  │  SET LOCAL   │  tables + fonctions SQL  │
│  lib/                  │  Bearer <jeton>    │  comptes (bcrypt + JWT) │  ROLE …      │  + règles RLS            │
│                        │ ◄───────────────── │  photos (uploads/)      │              │  + déclencheurs          │
└────────────────────────┘                    │  rappels quotidiens 7h  │              └──────────────────────────┘
                                              └─────────────────────────┘
```

**Pourquoi un serveur entre l'app et la base ?**
Une application installée sur un téléphone ne doit **jamais** contenir le mot de passe de la base de données : n'importe qui pourrait l'extraire. Le serveur garde ce mot de passe, vérifie qui est connecté (jeton JWT), puis exécute la requête **au nom de l'utilisateur**.

**Le point technique à mettre en avant (la sécurité est dans la base) :**
pour chaque requête, le serveur ouvre une transaction et indique à PostgreSQL qui la fait :

```sql
BEGIN;
SET LOCAL ROLE authenticated;                          -- ou anon pour un ami sans compte
SELECT set_config('app.user_id', '<id de l’utilisateur>', true);
-- … la requête de l'application …
COMMIT;
```

La fonction SQL `auth.uid()` lit `app.user_id`. Toutes les **règles RLS** (Row Level Security) écrites pour le projet s'appliquent donc telles quelles :

- un célébrant ne peut **jamais** lire les tables `claims` et `orders` : c'est ce qui garantit l'anonymat des offreurs ;
- la publication est refusée sans accès payé et validé (déclencheur `prepare_event`) ;
- un utilisateur ne peut pas se donner le rôle admin (déclencheur `guard_profile`) ;
- le « lien liste seule » ne renvoie jamais les infos de la fête (fonction `get_public_event`).

Même si quelqu'un modifiait l'application, la base refuserait.

---

## 3. Installation sur votre PC (Windows)

Prérequis, déjà présents sur votre machine : **PostgreSQL 17/18**, **Node.js**, **Flutter** (`C:\src\flutter`), **Android Studio** (pour l'émulateur) et **VS Code** avec l'extension Flutter.

### Étape A. La base et le serveur (une seule fois)

Ouvrir un terminal dans `happy-v5\server` (dans VS Code : clic droit sur le dossier `server`, puis « Open in Integrated Terminal »).

```bash
npm install
npm run setup -- VOTRE_MOT_DE_PASSE_POSTGRES
npm run admin -- 0700000000 admin123 "Noémie"
```

1. `npm install` installe les bibliothèques du serveur.
2. `npm run setup` fait trois choses :
   - il crée le fichier `.env` (connexion à la base et secret aléatoire pour les jetons) ;
   - il crée la base `happy` ;
   - il installe toutes les tables, fonctions et règles (`db/happy-local.sql`).

   Le mot de passe demandé est celui choisi à l'installation de PostgreSQL.
3. `npm run admin` crée votre compte administrateur. Vous vous connecterez avec ce téléphone et ce mot de passe.

### Étape B. Lancer le serveur (à chaque séance)

```bash
npm start
```

Il doit afficher `Happy API prête sur http://localhost:4000`. **Laissez ce terminal ouvert.**

Vérification facultative : dans un **second** terminal, `npm test` lance 21 vérifications de bout en bout (inscription par téléphone, refus de publication sans accès, invitation, anonymat, suppression d'un compte…).

### Étape C. L'application Flutter (une seule fois)

Dans `happy-v5\mobile_flutter`, **double-cliquer sur `setup_android.bat`**. Ce script :

1. génère le dossier `android/` (`flutter create`, sans toucher au code de `lib/`) ;
2. autorise l'application à appeler le serveur local en HTTP (`usesCleartextTraffic`) ;
3. télécharge les dépendances (`flutter pub get`).

Puis, dans VS Code (ouvrir le dossier `mobile_flutter`) :

```bash
flutter analyze      # doit afficher « No issues found! »
```

### Étape D. Lancer l'application (à chaque séance)

1. Démarrer l'émulateur. Dans VS Code : en bas à droite, choisir l'appareil, puis « Start Pixel… ». Ou depuis Android Studio : Device Manager, ▶.
2. Dans VS Code : **F5**, ou `flutter run` dans le terminal.

L'émulateur Android joint votre PC grâce à l'adresse spéciale **`10.0.2.2`** : l'application appelle donc `http://10.0.2.2:4000`.

**Sur un vrai téléphone** (même Wi-Fi que le PC) :

```bash
flutter run --dart-define=API_URL=http://192.168.X.X:4000
```

`192.168.X.X` est l'adresse IP du PC : taper `ipconfig` dans un terminal et lire « Adresse IPv4 ». Autoriser Node.js dans le pare-feu Windows si Windows le demande.

---

## 4. Organisation du code

```
happy-v5/
├── server/                      SERVEUR API (Node.js + Express)
│   ├── db/happy-local.sql       base complète : tables, fonctions, déclencheurs, règles RLS
│   ├── db/0-reinitialiser-local.sql   pour repartir de zéro (efface tout)
│   ├── src/index.js             les routes de l'API (liste en tête de fichier)
│   ├── src/db.js                connexion PostgreSQL + exécution « au nom de l'utilisateur »
│   ├── src/auth.js              comptes : bcrypt (mot de passe), JWT (jeton), rôle admin
│   ├── src/query.js             accès aux tables (liste blanche, paramètres $1…) et aux fonctions SQL
│   ├── src/cron.js              rappels quotidiens à 7h (J-7, J-1, jour J, révélation, expiration)
│   ├── scripts/setup.js         installation en une commande
│   ├── scripts/create-admin.js  création d'un administrateur
│   └── scripts/smoke-test.js    21 vérifications automatiques
│
└── mobile_flutter/              APPLICATION FLUTTER
    ├── pubspec.yaml             dépendances
    ├── setup_android.bat/.ps1   préparation Android (une fois)
    └── lib/
        ├── main.dart            démarrage, français, aiguillage selon le rôle
        ├── core/
        │   ├── config.dart      adresse du serveur (10.0.2.2:4000 par défaut)
        │   ├── api.dart         appels au serveur (connexion, tables, fonctions SQL, photos)
        │   ├── session.dart     utilisateur connecté et son rôle
        │   ├── memory.dart      mémoire du téléphone pour les amis sans compte
        │   ├── theme.dart       couleurs et polices Happy
        │   └── utils.dart       FCFA, dates en français, prochain anniversaire, couleurs
        ├── widgets/             briques d'interface
        │   ├── ui.dart          boutons pilule, champs, cartes, pastilles, feuilles modales
        │   ├── cake.dart        gâteau animé (une bougie par année, flammes qui vacillent)
        │   ├── wrapped_card.dart   carte cadeau qui « s'emballe » (papier satiné + ruban)
        │   ├── invitation.dart  enveloppe qui s'ouvre sur la carte d'invitation
        │   ├── flip_card.dart   carte qui se retourne à la révélation
        │   ├── countdown.dart   compte à rebours
        │   ├── illustrations.dart  pile de cadeaux, logo, confettis
        │   ├── coming_soon.dart    bandeaux « Bientôt disponible » (e-commerce)
        │   └── …                couleurs, dates, photos, partage, notifications
        └── screens/
            ├── home_screen.dart     accueil visiteur + démo + ouvrir un lien reçu
            ├── auth_screens.dart    connexion / inscription (téléphone, email facultatif)
            ├── event_page.dart      page de l'ami : invitation, réponse, réservation
            ├── celebrant/           espace célébrant (5 onglets)
            └── admin/               espace admin (4 onglets)
```

Chaque fichier commence par un commentaire en français qui explique son rôle.

---

## 5. Comment ça marche, rôle par rôle

### Inscription et connexion

- **Email facultatif.** Sans email, l'identifiant technique est `<chiffres du téléphone>@tel.happy.app`. Il n'est jamais affiché, et le déclencheur SQL `handle_new_user` met `profiles.email` à null.
- Le mot de passe est **haché avec bcrypt**, jamais stocké en clair. La connexion renvoie un **jeton JWT** (30 jours) gardé sur le téléphone.
- L'application ouvre automatiquement le bon espace selon le rôle : célébrant, admin, ou boutique (« bientôt disponible »).
- Si l'admin supprime un compte, la session de ce compte est refusée et l'application revient à l'accueil.

### Célébrant (5 onglets)

1. **Anniversaire** : création (prénom + date de naissance complète). L'app affiche aussitôt « Prochain anniversaire : samedi 20 décembre 2026 · 24 ans » ; la base le recalcule (`next_birthday`).
2. **Personnaliser** : titre, message, couleur de thème (palette + couleur libre) qui habille tout l'espace et la page des amis, dress code « Tout en … » pré-rempli, fête (date, heure, lieu, infos).
3. **Accès payant** : durée (7 à 90 jours) ou dates, prix = max(minimum, jours × prix/jour) lu dans les réglages, paiement Wave / Orange / MTN / Moov, référence + capture.
4. **Publier** : refusé par la base tant que l'admin n'a pas validé. Après publication, prénom et date sont verrouillés.
5. **Deux liens** : lien **invités** (avec invitation) et lien **liste seule**. Boutons copier, WhatsApp, partager, aperçu.
6. **Suivi** : « X / Y cadeaux pris en charge », barre de progression, gâteau animé, compte à rebours.
7. **Ma liste** : cadeaux libres (photo, prix, contact du vendeur, lien). Les articles de boutique sont « bientôt disponibles ».
8. **Invités** : personnes attendues, oui, peut-être, non, et la liste des réponses.
9. **Révélation** : le lendemain de l'anniversaire, des cartes emballées se retournent au toucher et montrent le nom et le mot de l'ami.

### Ami (sans compte)

- Ouvre le lien (sur l'accueil : « Vous avez reçu un lien ? », ou bouton « Aperçu » du célébrant).
- En-tête sombre aux couleurs du thème, gâteau, compte à rebours.
- **Enveloppe** qui s'ouvre, puis « Serez-vous là ? » (oui / peut-être / non, nombre de personnes).
- **Réserver un cadeau** : nom, téléphone, petit mot révélé après l'anniversaire. Le cadeau s'emballe sous ses yeux et pour tous les autres amis (actualisation toutes les 15 s). Il reçoit un code de réservation.

### Admin (4 onglets)

- **Utilisateurs** : filtres (en attente, actifs, expirés, jamais activés), bouton **Accorder** en un geste, fiche détaillée (paiement, référence, capture), accorder une durée, historique, couper l'accès, supprimer le compte.
- **Boutiques** : bientôt disponible.
- **Messages** du formulaire « Nous contacter ».
- **Réglages** : prix par jour, prix minimum, numéros Wave / Orange / MTN / Moov, instructions.

### Notifications

Les notifications sont créées **par la base** (déclencheurs SQL) : cadeau réservé (anonyme), nouvelle réponse, accès accordé, nouvelle demande pour l'admin… L'application les relève toutes les 15 secondes : pastille sur l'onglet, message à l'écran, et rechargement des données concernées. Le serveur ajoute chaque matin à 7h les rappels J-7, J-1, jour J, la révélation et l'alerte d'expiration.

---

## 6. Scénario de démonstration (environ 8 minutes)

**Avant de commencer :**
- serveur lancé (`npm start`) ;
- émulateur et application lancés ;
- admin créé ;
- dans **Admin > Réglages**, un numéro Wave renseigné.

1. **Accueil** : toucher « Je m'en charge » sur la démo, le cadeau s'emballe. Montrer le bandeau « Les boutiques Happy, bientôt disponible ».
2. **Inscription** « Mon anniversaire » **avec un téléphone, sans email**. Montrer que l'onglet « Ma boutique » affiche « Bientôt disponible ».
3. **Créer l'anniversaire** : la date de naissance calcule l'âge. Choisir une couleur : le gâteau change de couleur. Activer « J'organise une fête » avec un lieu.
4. **Ma liste** : ajouter un cadeau avec photo et prix.
5. **Demander l'accès** : 30 jours, Wave, référence. Le bouton Publier reste bloqué (« Demande en cours »).
6. **Se déconnecter** (onglet Profil), se connecter en **admin**, onglet Utilisateurs, « En attente », puis **Accorder**.
7. Se reconnecter en célébrant, tirer pour rafraîchir, **Publier** : les deux liens apparaissent.
8. Toucher **Aperçu** du lien invités (on voit la page de l'ami) :
   - ouvrir l'enveloppe ;
   - répondre « Oui, 3 personnes » ;
   - réserver le cadeau avec un petit mot.
9. Ouvrir l'aperçu du **lien liste seule** : aucune information sur la fête.
10. Revenir à l'espace célébrant : « 1 / 1 pris en charge », onglet Invités « 3 personnes attendues », notification « Un cadeau vient d'être pris en charge »… **mais aucun nom d'ami**.
11. Expliquer la révélation : le lendemain de l'anniversaire, la carte se retourne et montre le nom et le mot.
    - Pour la montrer en démo, on peut passer la date de naissance d'un compte de test à hier dans pgAdmin, avant publication.
12. **Admin** : modifier un tarif dans Réglages, supprimer un compte de test.

Astuce : `npm test` dans le terminal du serveur rejoue tout ce scénario automatiquement en 2 secondes. C'est une bonne preuve si une manipulation échoue devant le jury.

---

## 7. Questions probables et réponses

- **« Pourquoi pas une connexion directe de Flutter à PostgreSQL ? »** Le mot de passe de la base serait dans l'application et donc récupérable. Le serveur le garde, et la base applique les règles de sécurité au nom de chaque utilisateur.
- **« Et si quelqu'un modifie l'app pour voir qui a offert quoi ? »** Impossible. Le célébrant n'a aucun droit de lecture sur `claims` (règle RLS), et la seule fonction qui renvoie les noms, `get_my_gifts()`, ne le fait qu'après la date, en SQL.
- **« Comment le serveur évite les injections SQL ? »** Les tables autorisées sont en liste blanche, les noms de colonnes sont vérifiés, et toutes les valeurs passent en paramètres (`$1`, `$2`…), jamais collées dans le texte SQL.
- **« Comment sont stockés les mots de passe ? »** Hachés avec bcrypt (10 tours). Même l'administrateur de la base ne peut pas les lire.
- **« Que se passe-t-il si deux amis réservent le même cadeau en même temps ? »** La table `claims` a une contrainte d'unicité sur le cadeau : le second reçoit « Quelqu'un vient de prendre ce cadeau. Choisissez-en un autre. »
- **« Pourquoi la partie boutiques n'est pas là ? »** Choix de priorité : la version actuelle couvre le cœur du produit (liste, invitation, surprise, paiement de l'accès, administration). Les tables boutiques, articles, commandes et stock sont déjà en base avec leurs règles. Il reste à brancher les écrans.
- **« Les notifications arrivent-elles application fermée ? »** Pas encore : elles sont relevées toutes les 15 s quand l'application est ouverte. L'étape suivante est Firebase Cloud Messaging (gratuit).

---

## 8. Dépannage

| Problème | Solution |
|---|---|
| `npm run setup` : « password authentication failed » | Mauvais mot de passe PostgreSQL (celui de l'installation). |
| `npm run setup` : « ECONNREFUSED » | PostgreSQL n'est pas démarré : touche Windows, « Services », `postgresql-x64-17` (ou 18), Démarrer. |
| L'app affiche « Connexion au serveur impossible » | Le serveur n'est pas lancé (`npm start`). Sur un vrai téléphone : utiliser `--dart-define=API_URL=http://IP_DU_PC:4000` et autoriser Node.js dans le pare-feu. |
| « Cleartext HTTP traffic not permitted » | Relancer `setup_android.bat`, ou ajouter `android:usesCleartextTraffic="true"` dans la balise `<application>` de `android/app/src/main/AndroidManifest.xml`. |
| Les polices ne s'affichent pas | L'émulateur n'a pas Internet (les polices Google sont téléchargées au premier lancement). L'app fonctionne quand même. |
| `flutter analyze` signale une erreur | Lire le fichier et la ligne indiqués ; la plupart du temps un `flutter pub get` suffit. |
| Repartir d'une base vide | `psql -U postgres -d happy -f db/0-reinitialiser-local.sql`, puis `npm run setup -- MOT_DE_PASSE`. |
| Port 4000 déjà utilisé | Changer `PORT` dans `server/.env` et lancer l'app avec `--dart-define=API_URL=http://10.0.2.2:NOUVEAU_PORT`. |

---

## 9. Prochaines étapes

1. **E-commerce** : écrans boutiques, vitrine, commande directe, espace boutique (commandes, articles, stock), validation des boutiques par l'admin. La base est prête : fonctions `place_order`, `vendor_update_order`, `vendor_set_stock`, `admin_validate_vendor`.
2. **Notifications push** application fermée : Firebase Cloud Messaging.
3. **Liens profonds** : ouvrir directement l'app quand un ami touche un lien `…/e/<jeton>`.
4. **Site web** : le site Next.js utilise encore Supabase. Il pourra appeler le même serveur API.
