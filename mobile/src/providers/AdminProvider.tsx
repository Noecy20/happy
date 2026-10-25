/**
 * Données de l'espace admin (Utilisateurs, Boutiques, Messages, Réglages).
 * Les règles RLS autorisent l'admin à lire profiles, access_requests, contact_messages, vendors, events.
 * Toutes les actions sensibles passent par des RPC qui revérifient is_admin() côté base.
 */
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { useNotifications } from '@/components/NotificationsList';
import { supabase } from '@/lib/supabase';
import type { AccessRequest, EventRow, Profile, Vendor } from '@/lib/types';
import { useAuth } from './AuthProvider';
import { useFx } from './FxProvider';

export type ContactMessage = { id: string; full_name: string; phone?: string | null; email?: string | null; message?: string | null; status: string; created_at: string };

type Ctx = {
  loading: boolean; profiles: Profile[]; requests: AccessRequest[]; messages: ContactMessage[]; vendors: Vendor[]; events: EventRow[];
  reload: () => Promise<void>;
  /** Exécute une action admin, affiche le résultat et recharge. */
  act: (fn: () => PromiseLike<{ error: any }>, ok: string) => Promise<void>;
};
const AdminContext = createContext<Ctx | null>(null);
export const useAdmin = () => useContext(AdminContext)!;

/** Message clair si la session n'est pas celle de l'admin. */
export const friendlyError = (m: string) =>
  m.includes('pas administrateur') ? 'Action refusée : ce téléphone est connecté avec un autre compte. Reconnectez-vous en admin.' : m;

export function AdminProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const fx = useFx();
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);

  const reload = useCallback(async () => {
    const [a, b, c, d, e] = await Promise.all([
      supabase.from('profiles').select('*').neq('role', 'admin').order('created_at', { ascending: false }),
      supabase.from('access_requests').select('*').order('created_at', { ascending: false }),
      supabase.from('contact_messages').select('*').order('created_at', { ascending: false }),
      supabase.from('vendors').select('*').order('name'),
      supabase.from('events').select('*'),
    ]);
    setProfiles((a.data as Profile[]) || []); setRequests((b.data as AccessRequest[]) || []);
    setMessages((c.data as ContactMessage[]) || []); setVendors((d.data as Vendor[]) || []); setEvents((e.data as EventRow[]) || []);
    setLoading(false);
  }, []);
  useEffect(() => { reload(); }, [reload]);

  // Nouvelle demande / nouvelle boutique : on recharge en direct
  useNotifications(profile?.id, (n) => { fx.toast(n.title); reload(); });

  const act = async (fn: () => PromiseLike<{ error: any }>, ok: string) => {
    const { error } = await fn();
    if (error) { fx.toast(friendlyError(error.message), 'err'); return; }
    fx.toast(ok); reload();
  };

  return <AdminContext.Provider value={{ loading, profiles, requests, messages, vendors, events, reload, act }}>{children}</AdminContext.Provider>;
}
