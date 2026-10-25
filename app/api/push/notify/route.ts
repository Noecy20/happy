import { NextResponse } from 'next/server';
import { sendPush } from '@/lib/webpush';

/**
 * Appelé par le webhook Supabase à chaque nouvelle notification (table notifications, INSERT).
 * Envoie la même notification en push sur les appareils de l'utilisateur.
 */
export async function POST(req: Request) {
  if (req.headers.get('x-webhook-secret') !== process.env.CRON_SECRET) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const n = body.record || body;
  if (!n?.user_id) return NextResponse.json({ ok: false });
  const url = n.kind === 'order' ? '/vendeur' : n.kind === 'vendor' ? '/vendeur' : '/dashboard';
  const sent = await sendPush({ user_id: n.user_id }, { title: n.title, body: n.body || '', url, tag: n.kind });
  return NextResponse.json({ ok: true, sent });
}
