'use client';
import { useEffect, useState } from 'react';
import { BellRing, BellPlus } from 'lucide-react';
import { enablePush, pushSupported } from '@/lib/push';

/** Bouton « Activer les notifications » (gratuit, fonctionne application fermée). */
export default function PushButton({ eventToken, orderCode, label = 'Activer les notifications', className = 'btn-ghost py-2 text-sm', onDone }: {
  eventToken?: string; orderCode?: string; label?: string; className?: string; onDone?: (msg: string, ok: boolean) => void;
}) {
  const key = `happy-push-${eventToken || orderCode || 'user'}`;
  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [supported, setSupported] = useState(true);
  useEffect(() => { setSupported(pushSupported()); setOn(localStorage.getItem(key) === '1' && Notification?.permission === 'granted'); }, [key]);
  if (!supported) return null;
  return (
    <button type="button" disabled={busy || on} className={className}
      onClick={async () => {
        setBusy(true);
        try { await enablePush({ eventToken, orderCode }); localStorage.setItem(key, '1'); setOn(true); onDone?.('Notifications activées', true); }
        catch (e: any) { onDone?.(e.message, false); }
        setBusy(false);
      }}>
      {on ? <><BellRing size={16} />Notifications activées</> : <><BellPlus size={16} />{busy ? 'Activation…' : label}</>}
    </button>
  );
}
