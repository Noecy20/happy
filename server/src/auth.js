/**
 * Comptes utilisateurs (remplace Supabase Auth).
 * - Mot de passe haché avec bcrypt dans auth.users.
 * - Jeton de connexion JWT (valable 30 jours) envoyé par l'app dans « Authorization: Bearer <jeton> ».
 * - L'inscription insère dans auth.users : le déclencheur SQL handle_new_user crée le profil
 *   (et met profiles.email à null pour les identifiants <téléphone>@tel.happy.app).
 */
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sys } = require('./db');

const secret = () => process.env.JWT_SECRET || 'secret-de-developpement';
const sign = (user) => jwt.sign({ sub: user.id, email: user.email }, secret(), { expiresIn: '30d' });

/** Middleware : lit le jeton s'il existe et place l'identifiant dans req.userId (sinon visiteur). */
async function readUser(req, res, next) {
  const h = req.headers.authorization || '';
  if (!h.toLowerCase().startsWith('bearer ')) return next();
  try {
    const payload = jwt.verify(h.slice(7).trim(), secret());
    // Le compte existe-t-il encore ? (il a pu être supprimé par l'admin)
    const { rowCount } = await sys('select 1 from auth.users where id = $1', [payload.sub]);
    if (!rowCount) return res.status(401).json({ error: 'refresh_token_not_found: compte supprimé.' });
    req.userId = payload.sub;
    next();
  } catch {
    res.status(401).json({ error: 'Session expirée : reconnectez-vous.' });
  }
}

/** Middleware : refuse si l'utilisateur n'est pas connecté. */
const requireUser = (req, res, next) => (req.userId ? next() : res.status(401).json({ error: 'Non connecté.' }));

/** Middleware : refuse si l'utilisateur n'est pas administrateur. */
async function requireAdmin(req, res, next) {
  if (!req.userId) return res.status(401).json({ error: 'Non connecté.' });
  const { rows } = await sys('select role from public.profiles where id = $1', [req.userId]);
  if (rows[0]?.role !== 'admin') return res.status(403).json({ error: 'Accès refusé : ce compte n’est pas administrateur.' });
  next();
}

/** Crée un compte. `data` = métadonnées lues par handle_new_user (full_name, phone, account_type…). */
async function createUser(email, password, data = {}) {
  if (!email || !password) throw new Error('Identifiant et mot de passe obligatoires.');
  if (password.length < 6) throw new Error('Password should be at least 6 characters.');
  const hash = await bcrypt.hash(password, 10);
  try {
    const { rows } = await sys(
      'insert into auth.users(email, encrypted_password, raw_user_meta_data) values (lower($1), $2, $3) returning id, email',
      [email.trim(), hash, JSON.stringify(data)],
    );
    return rows[0];
  } catch (e) {
    if (e.code === '23505') throw new Error('User already registered');
    throw e;
  }
}

async function login(email, password) {
  const { rows } = await sys('select id, email, encrypted_password from auth.users where email = lower($1)', [String(email || '').trim()]);
  const u = rows[0];
  if (!u || !(await bcrypt.compare(String(password || ''), u.encrypted_password))) throw new Error('Invalid login credentials');
  return { id: u.id, email: u.email };
}

module.exports = { sign, readUser, requireUser, requireAdmin, createUser, login };
