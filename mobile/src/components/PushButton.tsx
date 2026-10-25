/**
 * Bouton « Activer les notifications » / « Me rappeler l'anniversaire » / « Être prévenu de l'avancement ».
 * La permission est demandée uniquement quand l'utilisateur touche ce bouton (jamais au lancement).
 */
import { BellPlus, BellRing } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { pushDone } from '@/lib/memory';
import { enablePush, scopeKey, type PushScope } from '@/lib/push';
import { useFx } from '@/providers/FxProvider';
import { Button } from './ui';

export default function PushButton({ scope = {}, label = 'Activer les notifications', variant = 'ghost', small = true, className }: {
  scope?: PushScope; label?: string; variant?: 'ghost' | 'glass' | 'light'; small?: boolean; className?: string;
}) {
  const fx = useFx();
  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const key = scopeKey(scope);
  useEffect(() => { pushDone(key).then(setOn); }, [key]);

  return (
    <Button
      small={small} variant={variant} className={className} loading={busy} disabled={on}
      icon={on ? BellRing : BellPlus} title={on ? 'Notifications activées' : label}
      onPress={async () => {
        setBusy(true);
        try { await enablePush(scope); setOn(true); fx.toast('Notifications activées'); }
        catch (e: any) { fx.toast(e.message, 'err'); }
        setBusy(false);
      }}
    />
  );
}
