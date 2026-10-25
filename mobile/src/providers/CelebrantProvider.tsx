/**
 * Données de l'espace célébrant, partagées entre ses onglets
 * (Mon anniversaire, Ma liste, Invités, Notifications, Profil).
 *
 * Sources (toutes protégées par les règles RLS de Supabase) :
 * - profiles        : date d'expiration de l'accès,
 * - events          : SON anniversaire (owner_id = lui),
 * - get_my_gifts()  : ses cadeaux avec `claimed`, et `friend_name/friend_message`
 *                     UNIQUEMENT à partir du lendemain de l'anniversaire (anonymat garanti en SQL),
 * - vendors         : boutiques actives (pour ajouter un article de boutique),
 * - access_requests : demande en attente ?
 * - rsvps           : réponses à l'invitation.
 * Les notifications temps réel déclenchent un rechargement ciblé (cadeau réservé, accès accordé, réponse).
 */
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { useNotifications } from '@/components/NotificationsList';
import { supabase } from '@/lib/supabase';
import type { EventRow, GiftItem, Notif, Rsvp, Vendor } from '@/lib/types';
import { daysUntil } from '@/lib/utils';
import { useAuth } from './AuthProvider';
import { useFx } from './FxProvider';

type Ctx = {
  loading: boolean;
  event: EventRow | null; setEvent: (e: EventRow) => void;
  gifts: GiftItem[]; revealed: boolean;
  vendors: Vendor[]; pending: boolean; setPending: (b: boolean) => void;
  rsvps: Rsvp[];
  hasAccess: boolean; daysLeft: number;
  reload: () => Promise<void>; reloadGifts: () => Promise<void>;
  notifs: ReturnType<typeof useNotifications>;
};

const CelebrantContext = createContext<Ctx | null>(null);
export const useCelebrant = () => useContext(CelebrantContext)!;

export function CelebrantProvider({ children }: { children: ReactNode }) {
  const { profile, refreshProfile } = useAuth();
  const fx = useFx();
  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<EventRow | null>(null);
  const [gifts, setGifts] = useState<GiftItem[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [pending, setPending] = useState(false);
  const [rsvps, setRsvps] = useState<Rsvp[]>([]);

  const reloadGifts = useCallback(async () => {
    const { data } = await supabase.rpc('get_my_gifts');
    setGifts(data?.gifts || []);
    setRevealed(!!data?.revealed);
  }, []);

  const reload = useCallback(async () => {
    if (!profile) return;
    await refreshProfile();
    const [{ data: ev }, { data: vs }, { data: req }] = await Promise.all([
      supabase.from('events').select('*').eq('owner_id', profile.id).maybeSingle(),
      supabase.from('vendors').select('id,name,address,category').eq('active', true).order('name'),
      supabase.from('access_requests').select('id').eq('user_id', profile.id).eq('status', 'en_attente'),
    ]);
    setEvent(ev as EventRow | null);
    setVendors((vs as Vendor[]) || []);
    setPending(!!req?.length);
    if (ev) {
      const { data: r } = await supabase.from('rsvps').select('*').eq('event_id', ev.id).order('created_at', { ascending: false });
      setRsvps((r as Rsvp[]) || []);
    }
    await reloadGifts();
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  useEffect(() => { reload(); }, [reload]);

  // Notifications en direct : un toast + le rechargement de ce qui a changé
  const notifs = useNotifications(profile?.id, (n: Notif) => {
    fx.toast(n.title);
    if (n.kind === 'claim') reloadGifts();
    if (n.kind === 'access' || n.kind === 'rsvp') reload();
  });

  const expires = profile?.access_expires_at;
  const hasAccess = !!expires && new Date(expires) > new Date();
  const daysLeft = expires ? daysUntil(expires) : 0;

  return (
    <CelebrantContext.Provider value={{
      loading, event, setEvent, gifts, revealed, vendors, pending, setPending, rsvps, hasAccess, daysLeft, reload, reloadGifts, notifs,
    }}>
      {children}
    </CelebrantContext.Provider>
  );
}
