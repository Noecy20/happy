/**
 * Tâche quotidienne (7h, heure d'Abidjan), reprise de app/api/cron/quotidien du site :
 *  - rappels d'anniversaire J-7, J-1 et jour J au célébrant,
 *  - « La surprise est levée » le lendemain,
 *  - rappel d'expiration d'accès à J-3.
 * Les notifications sont insérées dans la table `notifications` ; l'application les affiche.
 */
const cron = require('node-cron');
const { sys } = require('./db');

const iso = (d) => d.toISOString().slice(0, 10);
const plus = (n) => iso(new Date(Date.now() + n * 86400000));

async function runDaily() {
  const report = { rappels: 0, revelations: 0, expirations: 0 };
  const notify = (user, kind, title, body) =>
    sys('insert into public.notifications(user_id, kind, title, body) values ($1, $2, $3, $4)', [user, kind, title, body]);

  // 1. Rappels d'anniversaire
  for (const [days, label] of [[7, 'dans une semaine'], [1, 'demain'], [0, 'aujourd’hui']]) {
    const { rows } = await sys('select id, owner_id, celebrant_name from public.events where birthday_date = $1 and published', [plus(days)]);
    for (const e of rows) {
      await notify(e.owner_id, 'birthday',
        days === 0 ? `Joyeux anniversaire ${e.celebrant_name}` : `Votre anniversaire, c’est ${label}`,
        days === 0 ? 'Belle journée ! Demain, découvrez qui vous a offert quoi.' : 'Pensez à partager votre liste avec vos proches.');
      report.rappels++;
    }
  }
  // 2. Révélation
  const { rows: rev } = await sys('select id, owner_id from public.events where birthday_date <= $1 and not reveal_message_sent and published', [plus(-1)]);
  for (const e of rev) {
    await notify(e.owner_id, 'reveal', 'La surprise est levée', 'Découvrez qui vous a offert quoi dans votre espace.');
    await sys('update public.events set reveal_message_sent = true where id = $1', [e.id]);
    report.revelations++;
  }
  // 3. Expiration d'accès dans 3 jours
  const { rows: exp } = await sys(
    "select id from public.profiles where role = 'celebrant' and access_expires_at > now() + interval '2 days' and access_expires_at <= now() + interval '3 days'");
  for (const p of exp) {
    await notify(p.id, 'expiry', 'Votre accès expire dans 3 jours', 'Demandez une prolongation pour garder votre lien actif.');
    report.expirations++;
  }
  return { date: plus(0), ...report };
}

function startCron() {
  cron.schedule('0 7 * * *', () => runDaily().then((r) => console.log('Tâche quotidienne :', r)).catch(console.error),
    { timezone: 'Africa/Abidjan' });
}

module.exports = { runDaily, startCron };
