'use client';
import { Bell, Gift, ShieldCheck, ShoppingBag, Cake, Sparkles, Clock, Store } from 'lucide-react';

const ICONS: Record<string, any> = { claim: Gift, access: ShieldCheck, order: ShoppingBag, birthday: Cake, reveal: Sparkles, expiry: Clock, vendor: Store };
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type Notif = { id: string; title: string; body?: string; read: boolean; created_at: string; kind?: string };

export default function NotificationBell({ userId, onNew }: { userId: string; onNew?: (n: Notif) => void }) {
  const supabase = createClient();
  const [items, setItems] = useState<Notif[]>([]);
  const [open, setOpen] = useState(false);
  const [ring, setRing] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(30)
      .then(({ data }) => setItems(data || []));
    const ch = supabase
      .channel('notif-' + userId)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, (p) => {
        const n = p.new as Notif;
        setItems((x) => [n, ...x]);
        setRing(true); setTimeout(() => setRing(false), 1200);
        onNew?.(n);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    const close = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const unread = items.filter((i) => !i.read).length;

  const toggle = async () => {
    setOpen((o) => !o);
    if (!open && unread) {
      await supabase.from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false);
      setTimeout(() => setItems((x) => x.map((i) => ({ ...i, read: true }))), 1500);
    }
  };

  return (
    <div className="relative" ref={ref}>
      <motion.button
        onClick={toggle} aria-label={`Notifications (${unread} non lues)`}
        animate={ring ? { rotate: [0, -18, 16, -12, 8, 0] } : {}} transition={{ duration: 0.8 }}
        className="relative grid h-10 w-10 place-items-center rounded-full border border-ink/10 bg-white hover:bg-lilac/60"
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full border-2 border-paper bg-candy px-1 text-[10px] font-bold text-white">{unread}</span>
        )}
      </motion.button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8 }}
            className="panel absolute right-0 z-40 mt-3 max-h-[70vh] w-[min(360px,90vw)] overflow-y-auto p-2"
          >
            {items.length === 0 && <p className="p-4 text-sm text-ink/60">Aucune notification pour l’instant.</p>}
            {items.map((n) => (
              <div key={n.id} className={`flex gap-3 rounded-2xl p-3 ${n.read ? '' : 'bg-lilac/50'}`}>
                {(() => { const I = ICONS[n.kind || ''] || Bell; return <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-candy shadow-popsm"><I size={16} /></span>; })()}
                <div>
                  <p className="text-sm font-bold">{n.title}</p>
                  {n.body && <p className="mt-0.5 text-sm text-ink/65">{n.body}</p>}
                  <p className="mt-1 text-[11px] text-ink/40">{new Date(n.created_at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</p>
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
