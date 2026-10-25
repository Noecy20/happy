/**
 * Liste des notifications in-app (table `notifications`), en temps réel :
 * Supabase Realtime pousse chaque nouvelle ligne (filtre user_id), la cloche s'anime,
 * et `onNew` permet à l'écran parent de recharger ses données (ex. un cadeau vient d'être réservé).
 * Une icône par type : claim, access, order, vendor, birthday, reveal, rsvp, expiry.
 */
import { Bell, Cake, Clock, Gift, ShieldCheck, ShoppingBag, Sparkles, Store, Users } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { supabase } from '@/lib/supabase';
import { colors, shadow } from '@/lib/theme';
import type { Notif } from '@/lib/types';
import { Button, Empty } from './ui';

export const NOTIF_ICONS: Record<string, any> = {
  claim: Gift, access: ShieldCheck, order: ShoppingBag, vendor: Store,
  birthday: Cake, reveal: Sparkles, rsvp: Users, expiry: Clock,
};

/** Hook : notifications de l'utilisateur + abonnement temps réel + compteur de non lues. */
export function useNotifications(userId?: string, onNew?: (n: Notif) => void) {
  const [items, setItems] = useState<Notif[]>([]);
  const load = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50);
    setItems((data as Notif[]) || []);
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    load();
    const ch = supabase
      .channel('notif-' + userId)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, (p) => {
        const n = p.new as Notif;
        setItems((x) => [n, ...x]);
        onNew?.(n);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const markAllRead = async () => {
    if (!userId) return;
    await supabase.from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false);
    setItems((x) => x.map((i) => ({ ...i, read: true })));
  };

  return { items, unread: items.filter((i) => !i.read).length, reload: load, markAllRead };
}

/** Affichage de la liste (écran « Notifications » de chaque espace). */
export function NotificationsList({ items, unread, onMarkRead }: { items: Notif[]; unread: number; onMarkRead: () => void }) {
  return (
    <View>
      {unread > 0 && <Button small variant="ghost" title={`Tout marquer comme lu (${unread})`} className="mb-4 self-start" onPress={onMarkRead} />}
      {items.length === 0 && <Empty icon={Bell} text="Aucune notification pour l’instant." />}
      {items.map((n) => {
        const I = NOTIF_ICONS[n.kind || ''] || Bell;
        return (
          <View key={n.id} className={`mb-2 flex-row rounded-2xl p-3 ${n.read ? 'bg-white' : 'bg-lilac/60'}`}>
            <View className="mr-3 h-10 w-10 items-center justify-center rounded-xl bg-white" style={shadow.sm}><I size={17} color={colors.candy} /></View>
            <View className="flex-1">
              <Text className="font-bold2 text-[14px] text-ink">{n.title}</Text>
              {!!n.body && <Text className="mt-0.5 font-body text-[13px] leading-[18px] text-ink/65">{n.body}</Text>}
              <Text className="mt-1 font-body text-[11px] text-ink/40">{new Date(n.created_at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}
