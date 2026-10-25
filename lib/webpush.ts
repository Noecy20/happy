import webpush from 'web-push';
import { createAdminClient } from '@/lib/supabase/admin';

let ready = false;
function init() {
  if (ready) return true;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY, priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:contact@happy.app', pub, priv);
  ready = true;
  return true;
}

export type PushMessage = { title: string; body?: string; url?: string; tag?: string };

/** Envoie un push à tous les abonnements correspondant au filtre ; supprime les abonnements expirés. */
export async function sendPush(filter: { user_id?: string; event_id?: string; order_id?: string }, msg: PushMessage) {
  if (!init()) return 0;
  const db = createAdminClient();
  let q = db.from('push_subscriptions').select('id,endpoint,p256dh,auth');
  if (filter.user_id) q = q.eq('user_id', filter.user_id);
  if (filter.event_id) q = q.eq('event_id', filter.event_id);
  if (filter.order_id) q = q.eq('order_id', filter.order_id);
  const { data } = await q;
  let sent = 0;
  for (const s of data || []) {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(msg));
      sent++;
    } catch (e: any) {
      if (e?.statusCode === 404 || e?.statusCode === 410) await db.from('push_subscriptions').delete().eq('id', s.id);
    }
  }
  return sent;
}
