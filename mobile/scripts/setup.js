/**
 * Préparation en une commande (à lancer UNE fois, avant `npm install`) :
 *   node scripts/setup.js
 *
 * 1. Crée `.npmrc` (legacy-peer-deps) : évite un conflit de versions entre react et react-dom pendant l'installation.
 * 2. Crée `.env` à partir du `.env.local` du site web (dossier parent) en ne reprenant que les valeurs PUBLIQUES :
 *    URL Supabase et clé anon. La clé service_role n'est jamais copiée.
 * N'écrase pas un fichier déjà présent.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const npmrc = path.join(root, '.npmrc');
const env = path.join(root, '.env');
const webEnv = path.join(root, '..', '.env.local');

if (!fs.existsSync(npmrc)) {
  fs.writeFileSync(npmrc, 'legacy-peer-deps=true\n');
  console.log('.npmrc créé');
} else console.log('.npmrc déjà présent');

if (fs.existsSync(env)) {
  console.log('.env déjà présent : rien à faire');
} else {
  const vals = {};
  if (fs.existsSync(webEnv)) {
    for (const line of fs.readFileSync(webEnv, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m) vals[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
  const site = vals.NEXT_PUBLIC_SITE_URL && !vals.NEXT_PUBLIC_SITE_URL.includes('localhost') ? vals.NEXT_PUBLIC_SITE_URL : 'http://192.168.X.X:3000';
  fs.writeFileSync(env, [
    '# Valeurs publiques (copiées depuis ../.env.local par scripts/setup.js)',
    `EXPO_PUBLIC_SUPABASE_URL=${vals.NEXT_PUBLIC_SUPABASE_URL || 'https://xxxx.supabase.co'}`,
    `EXPO_PUBLIC_SUPABASE_ANON_KEY=${vals.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJ...'}`,
    '# URL du site web joignable depuis le téléphone (site déployé, ou IP du PC sur le Wi-Fi, jamais localhost)',
    `EXPO_PUBLIC_SITE_URL=${site}`,
    '',
  ].join('\n'));
  console.log(fs.existsSync(webEnv) ? '.env créé à partir de ../.env.local' : '.env créé : renseignez les valeurs (../.env.local introuvable)');
  console.log('Pensez à vérifier EXPO_PUBLIC_SITE_URL dans .env');
}
