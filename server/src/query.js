/**
 * Accès générique aux tables, sur le modèle de supabase-js :
 *   POST /api/db  { table, action, select, filters, order, limit, values, single }
 * - action : select | insert | update | delete
 * - filters : [[colonne, opérateur, valeur]] avec eq, neq, gt, gte, lt, lte, in, is
 * Sécurité :
 * - tables autorisées en liste blanche, noms de colonnes vérifiés (pas d'injection SQL),
 *   valeurs toujours passées en paramètres ($1, $2…) ;
 * - surtout, la requête s'exécute avec le rôle de l'utilisateur : les règles RLS décident ce qu'il voit.
 */
const TABLES = new Set([
  'profiles', 'notifications', 'contact_messages', 'access_requests', 'events', 'gifts', 'rsvps', 'settings',
  // tables de la partie boutique (bientôt disponible dans l'app, déjà présentes en base)
  'vendors', 'products', 'product_categories', 'inventory_movements',
]);
const OPS = { eq: '=', neq: '<>', gt: '>', gte: '>=', lt: '<', lte: '<=' };
const IDENT = /^[a-z_][a-z0-9_]*$/;

const ident = (s) => {
  if (!IDENT.test(String(s))) throw new Error(`Nom invalide : ${s}`);
  return `"${s}"`;
};
// Objets et tableaux → JSON (colonnes jsonb : options, raw_user_meta_data…)
const val = (v) => (v !== null && typeof v === 'object' && !(v instanceof Date) ? JSON.stringify(v) : v);

function build(q) {
  if (!TABLES.has(q.table)) throw new Error(`Table non autorisée : ${q.table}`);
  const table = `public.${ident(q.table)}`;
  const params = [];
  const p = (v) => { params.push(val(v)); return `$${params.length}`; };

  const cols = !q.select || q.select === '*' ? '*' : String(q.select).split(',').map((c) => ident(c.trim())).join(', ');

  const where = (q.filters || []).map(([col, op, v]) => {
    const c = ident(col);
    if (op === 'in') return `${c} = any(${p(Array.isArray(v) ? v : [v])})`;
    if (op === 'is') return v === null ? `${c} is null` : `${c} is not null`;
    if (!OPS[op]) throw new Error(`Opérateur invalide : ${op}`);
    return `${c} ${OPS[op]} ${p(v)}`;
  });
  const whereSql = where.length ? ` where ${where.join(' and ')}` : '';

  let sql;
  switch (q.action || 'select') {
    case 'select': {
      sql = `select ${cols} from ${table}${whereSql}`;
      if (q.order) sql += ` order by ${ident(q.order[0])} ${q.order[1] === 'desc' ? 'desc' : 'asc'}`;
      if (q.limit) sql += ` limit ${Math.min(500, Math.max(1, parseInt(q.limit, 10) || 50))}`;
      break;
    }
    case 'insert': {
      const rows = Array.isArray(q.values) ? q.values : [q.values];
      const keys = Object.keys(rows[0] || {});
      if (!keys.length) throw new Error('Rien à insérer.');
      const tuples = rows.map((r) => `(${keys.map((k) => p(r[k] === undefined ? null : r[k])).join(', ')})`);
      sql = `insert into ${table} (${keys.map(ident).join(', ')}) values ${tuples.join(', ')}`;
      // returning: false → comme « return=minimal » de Supabase (utile quand on n'a pas le droit de relire la ligne,
      // ex. un visiteur qui envoie un message de contact)
      if (q.returning !== false) sql += ` returning ${cols}`;
      break;
    }
    case 'update': {
      const keys = Object.keys(q.values || {});
      if (!keys.length) throw new Error('Rien à modifier.');
      if (!where.length) throw new Error('Modification sans filtre refusée.');
      sql = `update ${table} set ${keys.map((k) => `${ident(k)} = ${p(q.values[k])}`).join(', ')}${whereSql} returning ${cols}`;
      break;
    }
    case 'delete': {
      if (!where.length) throw new Error('Suppression sans filtre refusée.');
      sql = `delete from ${table}${whereSql} returning ${cols}`;
      break;
    }
    default: throw new Error('Action inconnue.');
  }
  return { sql, params };
}

/** Appel d'une fonction SQL (RPC) avec arguments nommés : select public.fn(p_x => $1, …) */
function buildRpc(fn, args = {}) {
  if (!IDENT.test(fn)) throw new Error('Fonction invalide.');
  const params = [];
  const list = Object.entries(args).map(([k, v]) => { params.push(val(v)); return `${ident(k)} => $${params.length}`; });
  return { sql: `select public.${ident(fn)}(${list.join(', ')}) as result`, params };
}

module.exports = { build, buildRpc };
