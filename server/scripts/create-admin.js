/**
 * Crée (ou promeut) un compte administrateur.
 *   node scripts/create-admin.js 0700000000 motdepasse "Nom de l'admin"
 * Sans email, l'identifiant est le téléphone (comme dans l'app).
 */
require('dotenv').config({ quiet: true });
const { sys, pool } = require('../src/db');
const { createUser } = require('../src/auth');

(async () => {
  const [phone, password, name = 'Administrateur'] = process.argv.slice(2);
  if (!phone || !password) { console.log('Usage : node scripts/create-admin.js <telephone> <motdepasse> ["Nom"]'); process.exit(1); }
  const email = `${phone.replace(/\D/g, '')}@tel.happy.app`;
  const { rows } = await sys('select id from auth.users where email = $1', [email]);
  const id = rows[0]?.id || (await createUser(email, password, { full_name: name, phone })).id;
  await sys("update public.profiles set role = 'admin' where id = $1", [id]);
  console.log(`Admin prêt : téléphone ${phone}`);
  await pool.end();
})().catch((e) => { console.error(e.message); process.exit(1); });
