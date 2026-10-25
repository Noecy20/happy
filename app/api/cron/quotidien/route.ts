import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendPush } from '@/lib/webpush';

export const dynamic = 'force-dynamic';

/**
 * Tâche quotidienne (7h, heure d'Abidjan) :
 *  - rappels d'anniversaire J-7, J-1 et jour J : célébrant + invités abonnés
 *  - révélation le lendemain
 *  - rappels de livraison (veille et jour J) : boutique + acheteur abonné
 *  - rappel d'expiration d'accès à J-3
 * Chaque notification insérée part aussi en push via le webhook Supabase.
 */
const iso = (d: Date) => d.toISOString().slice(0, 10);
const plus = (n: number) => iso(new Date(Date.now() + n * 86400000));

export async function GET(req: Request) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`)
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const db = createAdminClient();
  const site = process.env.NEXT_PUBLIC_SITE_URL || '';
  const report = { rappels: 0, revelations: 0, livraisons: 0, expirations: 0 };

  // 1. Rappels d'anniversaire
  for (const [days, label] of [[7, 'dans une semaine'], [1, 'demain'], [0, 'aujourd’hui']] as const) {
    const { data: evs } = await db.from('events').select('id,owner_id,celebrant_name,share_token,party_place,party_time,has_party')
      .eq('birthday_date', plus(days)).eq('published', true);
    for (const e of evs || []) {
      await db.from('notifications').insert({
        user_id: e.owner_id, kind: 'birthday',
        title: days === 0 ? `Joyeux anniversaire ${e.celebrant_name}` : `Votre anniversaire, c’est ${label}`,
        body: days === 0 ? 'Belle journée ! Demain, découvrez qui vous a offert quoi.' : 'Pensez à partager votre liste avec vos proches.',
      });
      await sendPush({ event_id: e.id }, {
        title: days === 0 ? `C’est l’anniversaire de ${e.celebrant_name} !` : `L’anniversaire de ${e.celebrant_name}, c’est ${label}`,
        body: e.has_party && e.party_place ? `Fête : ${e.party_place}${e.party_time ? ' · ' + e.party_time : ''}` : 'Un cadeau à choisir ? La liste vous attend.',
        url: `${site}/e/${e.share_token}`, tag: `bday-${e.id}`,
      });
      report.rappels++;
    }
  }

  // 2. Révélation
  const { data: reveals } = await db.from('events').select('id,owner_id').lte('birthday_date', plus(-1)).eq('reveal_message_sent', false).eq('published', true);
  for (const e of reveals || []) {
    await db.from('notifications').insert({ user_id: e.owner_id, kind: 'reveal', title: 'La surprise est levée', body: 'Découvrez qui vous a offert quoi dans votre espace.' });
    await db.from('events').update({ reveal_message_sent: true }).eq('id', e.id);
    report.revelations++;
  }

  // 3. Livraisons de demain et d'aujourd'hui
  for (const [days, label] of [[1, 'demain'], [0, 'aujourd’hui']] as const) {
    const { data: orders } = await db.from('orders').select('id,tracking_code,item_name,quantity,delivery_address,vendor_id,buyer_name,vendors(owner_id)')
      .eq('delivery_date', plus(days)).not('status', 'in', '(livree,annulee)');
    for (const o of orders || []) {
      const owner = (o as any).vendors?.owner_id;
      if (owner) await db.from('notifications').insert({
        user_id: owner, kind: 'order', title: `Livraison ${label} : ${o.tracking_code}`,
        body: `${o.item_name} x${o.quantity} pour ${o.buyer_name}${o.delivery_address ? ' · ' + o.delivery_address : ''}`,
      });
      await sendPush({ order_id: o.id }, { title: `Livraison prévue ${label}`, body: o.item_name, url: `${site}/suivi/${o.tracking_code}`, tag: `liv-${o.id}` });
      report.livraisons++;
    }
  }

  // 4. Expiration d'accès dans 3 jours
  const { data: expiring } = await db.from('profiles').select('id').eq('role', 'celebrant')
    .gt('access_expires_at', new Date(Date.now() + 2 * 86400000).toISOString()).lte('access_expires_at', new Date(Date.now() + 3 * 86400000).toISOString());
  for (const p of expiring || []) {
    await db.from('notifications').insert({ user_id: p.id, kind: 'access', title: 'Votre accès expire dans 3 jours', body: 'Demandez une prolongation pour garder votre lien actif.' });
    report.expirations++;
  }

  return NextResponse.json({ ok: true, date: plus(0), ...report });
}
