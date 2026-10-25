/**
 * Installation en une commande (à lancer une fois) :
 *   npm run setup -- MOT_DE_PASSE_POSTGRES
 *   (options : npm run setup -- MOT_DE_PASSE [utilisateur=postgres] [hôte=localhost] [port=5432])
 *
 * 1. Crée le fichier .env (connexion à PostgreSQL + secret aléatoire pour les jetons).
 * 2. Crée la base « happy » si elle n'existe pas.
 * 3. Installe les tables, fonctions et règles de sécurité (db/happy-local.sql) si ce n'est pas déjà fait.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Client } = require('pg');

(async () => {
  const [password, user = 'postgres', host = 'localhost', port = '5432'] = process.argv.slice(2);
  if (!password) {
    console.log('Usage : npm run setup -- MOT_DE_PASSE_POSTGRES [utilisateur] [hôte] [port]');
    process.exit(1);
  }
  const enc = encodeURIComponent;
  const base = `postgres://${enc(user)}:${enc(password)}@${host}:${port}`;

  // 1. .env
  const envPath = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) {
    fs.writeFileSync(envPath, [
      '# Généré par scripts/setup.js',
      `DATABASE_URL=${base}/happy`,
      'PORT=4000',
      `JWT_SECRET=${crypto.randomBytes(32).toString('hex')}`,
      'SITE_URL=http://localhost:3000',
      '',
    ].join('\n'));
    console.log('.env créé');
  } else console.log('.env déjà présent (non modifié)');

  // 2. Base « happy »
  const admin = new Client({ connectionString: `${base}/postgres` });
  await admin.connect();
  const { rowCount } = await admin.query("select 1 from pg_database where datname = 'happy'");
  if (!rowCount) {
    await admin.query('create database happy');
    console.log('Base « happy » créée');
  } else console.log('Base « happy » déjà présente');
  await admin.end();

  // 3. Schéma
  const db = new Client({ connectionString: `${base}/happy` });
  await db.connect();
  const { rows } = await db.query("select to_regclass('public.events') as t");
  if (rows[0].t) {
    console.log('Tables déjà installées (pour repartir de zéro : db/0-reinitialiser-local.sql puis relancer).');
  } else {
    await db.query(fs.readFileSync(path.join(__dirname, '..', 'db', 'happy-local.sql'), 'utf8'));
    console.log('Tables, fonctions et règles de sécurité installées');
  }
  await db.end();
  console.log('\nTerminé. Créez votre admin : npm run admin -- 0700000000 motdepasse "Votre nom"');
  console.log('Puis lancez le serveur : npm start');
})().catch((e) => {
  console.error('Erreur :', e.message);
  if (/password authentication/i.test(e.message)) console.error('→ Mot de passe PostgreSQL incorrect (celui choisi à l’installation de PostgreSQL).');
  if (/ECONNREFUSED/.test(e.message)) console.error('→ PostgreSQL ne semble pas démarré (Services Windows : postgresql-x64-17 ou 18).');
  process.exit(1);
});
