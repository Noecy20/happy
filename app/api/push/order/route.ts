import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendPush } from '@/lib/webpush';
import { statusLabel } from '@/lib/utils';

/** Prévient l'acheteur (abonné au suivi) du nouveau statut de sa commande. */
export async function POST(req: Request) {
  const { code } = await req.json().catch(() => ({}));
  if (!code) return NextResponse.json({ ok: false });
  const db = createAdminClient();
  const { data: o } = await db.from('orders').select('id,item_name,status,tracking_code').eq('tracking_code', String(code).toUpperCase()).maybeSingle();
  if (!o) return NextResponse.json({ ok: false });
  const sent = await sendPush({ order_id: o.id }, {
    title: `Commande ${o.tracking_code} : ${statusLabel(o.status)}`,
    body: o.item_name, url: `/suivi/${o.tracking_code}`, tag: `order-${o.id}`,
  });
  return NextResponse.json({ ok: true, sent });
}
