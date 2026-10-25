/**
 * Test de bout en bout de l'API (serveur lancé sur PORT) : reprend les critères d'acceptation.
 *   npm start   (dans un terminal)   puis   npm test   (dans un autre)
 * Crée des comptes de test avec des numéros aléatoires.
 */
require('dotenv').config({ quiet: true });
const BASE = `http://localhost:${process.env.PORT || 4000}`;
let ok = 0;
const check = (cond, label) => { if (!cond) throw new Error('ÉCHEC : ' + label); ok++; console.log('  ok  ' + label); };
async function api(path, body, token, method = 'POST') {
  const r = await fetch(BASE + path, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({}));
  return { status: r.status, ...((Array.isArray(j) || typeof j !== 'object' || j === null) ? { data: j } : j.error ? { error: j.error } : { data: j }) };
}
const rnd = () => '07' + Math.floor(10000000 + Math.random() * 89999999);

(async () => {
  const today = new Date(); const birth = `${today.getFullYear() - 24}-12-20`;
  // Admin
  const adminPhone = rnd();
  const { execSync } = require('child_process');
  execSync(`node scripts/create-admin.js ${adminPhone} admin123 Admin`);
  const admin = (await api('/api/auth/login', { email: `${adminPhone}@tel.happy.app`, password: 'admin123' })).data.token;
  check(admin, 'admin connecté');

  // Célébrant sans email
  const phone = rnd();
  const s = await api('/api/auth/signup', { email: `${phone}@tel.happy.app`, password: 'secret1', data: { full_name: 'Awa Koné', phone } });
  const cel = s.data.token; check(cel, 'célébrant inscrit par téléphone');
  const me = (await api('/api/auth/me', null, cel, 'GET')).data;
  check(me.role === 'celebrant' && me.email === null, 'profil célébrant, email non stocké');

  const ev = (await api('/api/db', { table: 'events', action: 'insert', values: { owner_id: me.id, celebrant_name: 'Awa', birth_date: birth, has_party: true, party_place: 'Cocody', theme_color: '#0F8F65' }, single: true }, cel)).data;
  check(ev && ev.birthday_date, 'anniversaire créé, prochain anniversaire calculé : ' + ev.birthday_date);
  await api('/api/db', { table: 'gifts', action: 'insert', values: { event_id: ev.id, name: 'Parfum', price: 38000, options: {} } }, cel);
  const req = await api('/api/db', { table: 'access_requests', action: 'insert', values: { user_id: me.id, kind: 'acces', days_requested: 30, amount: 9000, payment_method: 'Wave', payment_ref: 'TX1' }, single: true }, cel);
  check(req.data?.id, 'demande d’accès 30 jours par Wave');
  const pub1 = await api('/api/db', { table: 'events', action: 'update', values: { published: true }, filters: [['id', 'eq', ev.id]] }, cel);
  check(pub1.error && pub1.error.includes('accès'), 'publication refusée sans accès : ' + pub1.error);

  const dec = await api('/api/rpc/admin_handle_request', { p_request: req.data.id, p_approve: true }, admin);
  check(!dec.error, 'admin accorde la demande');
  const pub2 = await api('/api/db', { table: 'events', action: 'update', values: { published: true }, filters: [['id', 'eq', ev.id]], single: true }, cel);
  check(pub2.data?.published === true, 'publication après validation');

  // Ami avec le lien invités
  const inv = (await api('/api/rpc/get_public_event', { p_token: pub2.data.invite_token })).data;
  check(inv.status === 'ok' && inv.invited && inv.event.party_place === 'Cocody', 'lien invités : invitation visible');
  const r = await api('/api/rpc/rsvp', { p_token: pub2.data.invite_token, p_name: 'Koffi', p_phone: null, p_attending: 'oui', p_guests: 3, p_message: null });
  check(!r.error, 'réponse « Oui, 3 personnes »');
  const claim = await api('/api/rpc/claim_gift', { p_token: pub2.data.invite_token, p_gift_id: inv.gifts[0].id, p_name: 'Koffi', p_phone: '0102030405', p_email: null, p_message: 'Bon anniversaire', p_address: null, p_delivery_date: null, p_wrap: false });
  check(claim.data?.tracking_code, 'cadeau réservé, code ' + claim.data?.tracking_code);
  const again = await api('/api/rpc/claim_gift', { p_token: pub2.data.invite_token, p_gift_id: inv.gifts[0].id, p_name: 'Bob', p_phone: '01' });
  check(again.error, 'double réservation refusée');

  // Lien liste seule
  const list = (await api('/api/rpc/get_public_event', { p_token: pub2.data.share_token })).data;
  check(!list.invited && list.event.party_place == null, 'lien liste seule : aucune info de fête');

  // Anonymat côté célébrant
  const mine = (await api('/api/rpc/get_my_gifts', {}, cel)).data;
  check(mine.gifts[0].claimed && mine.gifts[0].friend_name == null, '1 / 1 pris en charge, nom de l’ami caché');
  const rs = (await api('/api/db', { table: 'rsvps', action: 'select', filters: [['event_id', 'eq', ev.id]] }, cel)).data;
  check(rs.reduce((a, x) => a + (x.attending === 'oui' ? x.guests : 0), 0) === 3, '3 personnes attendues');
  const notifs = (await api('/api/db', { table: 'notifications', action: 'select', filters: [['user_id', 'eq', me.id]] }, cel)).data;
  check(notifs.some((n) => n.kind === 'claim') && notifs.some((n) => n.kind === 'rsvp'), 'notifications cadeau et réponse reçues');
  const leak = await api('/api/db', { table: 'claims', action: 'select' }, cel);
  check(leak.error, 'table claims inaccessible (liste blanche + RLS)');
  const role = await api('/api/db', { table: 'profiles', action: 'update', values: { role: 'admin' }, filters: [['id', 'eq', me.id]], single: true }, cel);
  check(role.data?.role === 'celebrant', 'impossible de se donner le rôle admin');

  // Admin : réglages et suppression
  const st = await api('/api/db', { table: 'settings', action: 'update', values: { wave_number: '0700000000' }, filters: [['id', 'eq', 1]], single: true }, admin);
  check(st.data?.wave_number === '0700000000', 'admin modifie les tarifs / numéros');
  const del = await api('/api/admin/users/' + me.id, null, admin, 'DELETE');
  check(del.data?.ok, 'admin supprime le compte');
  const after = await api('/api/auth/me', null, cel, 'GET');
  check(after.status === 401, 'session du compte supprimé refusée');
  console.log(`\n${ok} vérifications réussies.`);
})().catch((e) => { console.error(e.message); process.exit(1); });
