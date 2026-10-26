# Happy

Listes de cadeaux d'anniversaire avec effet surprise, invitations et boutiques partenaires. Next.js 16 + Supabase.

## Installation (base neuve)

1. Supabase > **SQL Editor** :
   - base neuve : `supabase/0-reinitialiser.sql` (vide tout), puis `1-schema.sql`, `2-mise-a-jour-v5.sql`, `3-cadeau-commun-telephone.sql`, `4-livre-dor.sql`, `5-photo-celebrant.sql`, `6-cadeaux-pack.sql`, puis `7-invitation-programme.sql` ;
   - base existante (v4) : `2-mise-a-jour-v5.sql`, `3-cadeau-commun-telephone.sql` à `7-invitation-programme.sql` dans l’ordre (aucune perte de données) ;
   - base déjà en v5 : `3-cadeau-commun-telephone.sql` à `7-invitation-programme.sql`, dans l’ordre.
2. Supabase > **Authentication > Sign In / Providers > Email** : désactivez **Confirm email** (indispensable pour l'inscription par téléphone).
3. `.env.local` : URL du projet (sans `/rest/v1`), clé `anon`, clé `service_role`.
4. `npm install` puis `npm run dev`.

## Devenir administrateur

1. Inscrivez-vous sur `/inscription` (type « Mon anniversaire »).
2. SQL Editor :
   ```sql
   update public.profiles set role = 'admin' where phone = 'VOTRE_TELEPHONE';
   ```
3. Déconnectez-vous, reconnectez-vous : vous arrivez sur `/admin`.

Testez chaque rôle dans une fenêtre de navigation privée différente : un navigateur = une session.

## Rôles

- **Célébrant** : date de naissance (l'âge et le prochain anniversaire sont calculés), couleurs, fête et invitation, liste de cadeaux (articles de boutiques ou libres). Demande d'accès depuis son espace ; l'accès est requis pour publier le lien.
- **Ami** : ouvre le lien, voit l'invitation, le gâteau et le compte à rebours, réserve un cadeau avec date et lieu de livraison, suit sa commande.
- **Boutique** : s'inscrit sans validation, gère ses articles, reçoit les commandes groupées par anniversaire, avec notifications.
- **Visiteur** : section `/boutiques`, commande directe avec options cadeau, surprise, emballage.
- **Admin** : utilisateurs et demandes (accorder en un clic), suppression de comptes, boutiques, messages.

## Paiements

Admin > **Tarifs et paiement** : prix de l'accès (par jour + minimum), frais de boutique, numéros Wave / Orange / MTN / Moov.
Le célébrant et la boutique paient sur ces numéros puis envoient la référence (et une capture) ; l'admin vérifie et valide.

## Notifications push gratuites (même site fermé)

1. Générez vos clés : `npx web-push generate-vapid-keys`, puis dans `.env.local` :
   `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT=mailto:vous@exemple.com`.
2. Chaque utilisateur clique sur « Notifications » (espace), « Me rappeler l'anniversaire » (page de l'ami) ou « Être prévenu de l'avancement » (suivi).
   Sur iPhone : ajouter d'abord le site à l'écran d'accueil (iOS 16.4+).
3. En ligne (Vercel), pour que chaque notification de l'app parte aussi en push :
   Supabase > **Database > Webhooks** > Create : table `notifications`, événement `Insert`, type HTTP POST,
   URL `https://VOTRE-SITE/api/push/notify`, en-tête `x-webhook-secret` = votre `CRON_SECRET`.
4. Rappels automatiques (cron quotidien 7h) : anniversaire J-7, J-1, jour J (célébrant + invités abonnés), livraisons veille et jour J (boutique + acheteur), expiration d'accès.
