/**
 * Accès à PostgreSQL.
 *
 * Principe clé : chaque requête de l'application est exécutée « au nom » de l'utilisateur.
 *   BEGIN;
 *   SET LOCAL ROLE authenticated;               -- ou anon pour un visiteur sans compte
 *   SELECT set_config('app.user_id', '<uuid>', true);
 *   ...requête...
 *   COMMIT;
 * La fonction SQL auth.uid() lit app.user_id : les règles RLS de la base
 * (un célébrant ne lit jamais claims/orders, etc.) s'appliquent donc exactement comme sous Supabase.
 */
const { Pool, types } = require('pg');

// Dates SQL (type date) renvoyées telles quelles « 2026-12-20 » : pas de décalage de fuseau horaire.
types.setTypeParser(1082, (v) => v);
// Montants (numeric) renvoyés en nombres (45000) plutôt qu'en texte.
types.setTypeParser(1700, (v) => (v === null ? null : Number(v)));

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

/** Exécute `fn(client)` dans une transaction, avec le rôle et l'identité de l'utilisateur. */
async function asUser(userId, fn) {
  const client = await pool.connect();
  try {
    await client.query('begin');
    await client.query(userId ? 'set local role authenticated' : 'set local role anon');
    await client.query("select set_config('app.user_id', $1, true)", [userId || '']);
    const result = await fn(client);
    await client.query('commit');
    return result;
  } catch (e) {
    await client.query('rollback').catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

/** Requête directe avec les droits du serveur (inscription, connexion, tâches planifiées, admin). */
const sys = (text, params) => pool.query(text, params);

module.exports = { pool, asUser, sys };
