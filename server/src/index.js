/**
 * Serveur API Happy — remplace Supabase pour la version locale (PostgreSQL sur votre machine).
 *
 * Routes :
 *   GET    /api/health                 état du serveur et de la base
 *   POST   /api/auth/signup            inscription (téléphone ou email)
 *   POST   /api/auth/login             connexion
 *   GET    /api/auth/me                profil de l'utilisateur connecté
 *   POST   /api/db                     lecture / écriture de tables (règles RLS appliquées)
 *   POST   /api/rpc/:fn                appel d'une fonction SQL (get_public_event, claim_gift, rsvp…)
 *   POST   /api/upload                 envoi d'une image (dossier uploads/<uid>/)
 *   DELETE /api/admin/users/:id        admin : suppression d'un compte
 *   POST   /api/admin/cron             admin : lancer la tâche quotidienne maintenant (démo)
 *   GET    /uploads/...                images envoyées
 */
require('dotenv').config({ quiet: true });
const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { asUser, sys } = require('./db');
const { sign, readUser, requireUser, requireAdmin, createUser, login } = require('./auth');
const { build, buildRpc } = require('./query');
const { runDaily, startCron } = require('./cron');

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(readUser);

const UPLOADS = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(UPLOADS, { recursive: true });
app.use('/uploads', express.static(UPLOADS, { maxAge: '7d' }));

/** Enveloppe : renvoie {error} lisible (messages SQL en français : « Votre accès doit être activé… »). */
const handle = (fn) => async (req, res) => {
  try { res.json(await fn(req, res)); }
  catch (e) { res.status(400).json({ error: e.message || 'Erreur.' }); }
};

app.get('/api/health', handle(async () => {
  const { rows } = await sys('select now() as now');
  return { ok: true, db: rows[0].now };
}));

/* ---------------- Comptes ---------------- */
app.post('/api/auth/signup', handle(async (req) => {
  const { email, password, data } = req.body || {};
  const user = await createUser(email, password, data || {});
  return { token: sign(user), user };
}));

app.post('/api/auth/login', handle(async (req) => {
  const user = await login(req.body?.email, req.body?.password);
  return { token: sign(user), user };
}));

app.get('/api/auth/me', requireUser, handle(async (req) =>
  asUser(req.userId, async (c) => (await c.query('select * from public.profiles where id = auth.uid()')).rows[0] || null)));

/* ---------------- Données ---------------- */
app.post('/api/db', handle(async (req) => {
  const { sql, params } = build(req.body || {});
  const rows = await asUser(req.userId, async (c) => (await c.query(sql, params)).rows);
  return req.body.single ? rows[0] ?? null : rows;
}));

app.post('/api/rpc/:fn', handle(async (req) => {
  const { sql, params } = buildRpc(req.params.fn, req.body || {});
  return asUser(req.userId, async (c) => (await c.query(sql, params)).rows[0]?.result ?? null);
}));

/* ---------------- Images ---------------- */
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, _f, cb) => {
      const dir = path.join(UPLOADS, req.userId); // chaque utilisateur a son dossier (comme le bucket « gifts/<uid>/ »)
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (req, f, cb) => {
      const ext = (path.extname(f.originalname) || '.jpg').toLowerCase().replace(/[^.a-z]/g, '');
      const prefix = String(req.query.prefix || 'photo').replace(/[^a-z_-]/gi, '');
      cb(null, `${prefix}-${Date.now()}${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_r, f, cb) => cb(null, /^image\//.test(f.mimetype) || /\.(jpe?g|png|webp|heic)$/i.test(f.originalname)),
});
app.post('/api/upload', requireUser, (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'Image trop lourde : 5 Mo maximum.' : err.message });
    if (!req.file) return res.status(400).json({ error: 'Aucune image reçue.' });
    // URL relative : l'app ajoute l'adresse du serveur (10.0.2.2 sur l'émulateur, IP du PC sur un téléphone)
    res.json({ url: `/uploads/${req.userId}/${req.file.filename}` });
  });
});

/* ---------------- Admin ---------------- */
app.delete('/api/admin/users/:id', requireAdmin, handle(async (req) => {
  if (req.params.id === req.userId) throw new Error('Vous ne pouvez pas supprimer votre propre compte.');
  // Cascade : profil, anniversaire, cadeaux, demandes, notifications
  await sys('delete from auth.users where id = $1', [req.params.id]);
  fs.rmSync(path.join(UPLOADS, req.params.id), { recursive: true, force: true });
  return { ok: true };
}));

app.post('/api/admin/cron', requireAdmin, handle(() => runDaily()));

/* ---------------- Démarrage ---------------- */
const PORT = Number(process.env.PORT) || 4000;
app.listen(PORT, '0.0.0.0', async () => {
  try {
    await sys('select 1 from auth.users limit 1');
    console.log(`Happy API prête sur http://localhost:${PORT}  (émulateur Android : http://10.0.2.2:${PORT})`);
  } catch (e) {
    console.error('Base de données injoignable ou non installée :', e.message);
    console.error('Vérifiez DATABASE_URL dans .env et exécutez db/happy-local.sql.');
  }
  startCron();
});
