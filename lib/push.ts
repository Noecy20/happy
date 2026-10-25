'use client';
import { createClient } from '@/lib/supabase/client';

const toKey = (b64: string) => {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
};

export const pushSupported = () =>
  typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window && !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

/** Active les notifications pour l'utilisateur connecté, un anniversaire (lien) ou une commande (code). */
export async function enablePush(scope: { eventToken?: string; orderCode?: string } = {}) {
  if (!pushSupported()) throw new Error('Notifications non disponibles sur ce navigateur. Sur iPhone : ajoutez le site à l’écran d’accueil.');
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') throw new Error('Notifications refusées. Autorisez-les dans les réglages du navigateur.');
  const reg = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;
  const sub = (await reg.pushManager.getSubscription()) ||
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toKey(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!) }));
  const j = sub.toJSON() as any;
  const { error } = await createClient().rpc('save_push_subscription', {
    p_endpoint: j.endpoint, p_p256dh: j.keys.p256dh, p_auth: j.keys.auth,
    p_event_token: scope.eventToken || null, p_order_code: scope.orderCode || null,
  });
  if (error) throw new Error(error.message);
}
