/**
 * Admin · Utilisateurs (célébrants).
 * - Filtres : Tous / En attente / Actifs / Expirés / Jamais activés, et recherche.
 * - Chaque ligne : état d'accès, badge de demande (type, jours, montant), bouton « Accorder » en un geste.
 * - Fiche : contacts, état, anniversaire, demande en cours (montant, moyen, référence, capture),
 *   « Oui, accorder » (durée), historique, couper l'accès, supprimer l'utilisateur.
 * Accorder → RPC admin_handle_request / admin_grant_access ; couper → admin_revoke_access ;
 * supprimer → route web DELETE /api/admin/users/<id> (clé service_role côté serveur uniquement).
 */
import { Image } from 'expo-image';
import { CalendarHeart, Check, ChevronRight, Clock, Mail, Phone, Receipt, Search, Trash2, Ban, X, Users } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Alert, Linking, Pressable, Text, TextInput, View } from 'react-native';
import AdminHeader from '@/components/admin/AdminHeader';
import { Badge, Button, Card, Empty, InfoRow, Label, Loading, Pills, Screen, Sheet, Stat } from '@/components/ui';
import { adminDeleteUser } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { colors } from '@/lib/theme';
import type { AccessRequest, EventRow, Profile } from '@/lib/types';
import { daysUntil, formatDate, formatPrice, waLink } from '@/lib/utils';
import { friendlyError, useAdmin } from '@/providers/AdminProvider';
import { useFx } from '@/providers/FxProvider';

const FILTERS = [
  { key: 'tous', label: 'Tous' }, { key: 'attente', label: 'En attente' }, { key: 'actifs', label: 'Actifs' },
  { key: 'expires', label: 'Expirés' }, { key: 'jamais', label: 'Jamais activés' },
];
const DURATIONS = [7, 15, 30, 60, 90];

/** État de l'accès d'un utilisateur. */
const accessState = (p: Profile) => (!p.access_expires_at ? 'jamais' : new Date(p.access_expires_at) > new Date() ? 'actif' : 'expire');

export default function AdminUsers() {
  const a = useAdmin();
  const fx = useFx();
  const [filter, setFilter] = useState('tous');
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Demande en attente la plus récente de chaque utilisateur
  const pendingOf = useMemo(() => {
    const m: Record<string, AccessRequest> = {};
    a.requests.filter((x) => x.status === 'en_attente').forEach((x) => { if (!m[x.user_id]) m[x.user_id] = x; });
    return m;
  }, [a.requests]);
  const eventOf = useMemo(() => Object.fromEntries(a.events.map((e) => [e.owner_id, e])), [a.events]);

  if (a.loading) return <Loading />;

  const celebrants = a.profiles.filter((p) => p.role === 'celebrant');
  const pendingCount = Object.keys(pendingOf).length;
  const list = celebrants
    .filter((p) => !q || `${p.full_name} ${p.email || ''} ${p.phone || ''}`.toLowerCase().includes(q.toLowerCase()))
    .filter((p) => {
      const st = accessState(p);
      if (filter === 'attente') return !!pendingOf[p.id];
      if (filter === 'actifs') return st === 'actif';
      if (filter === 'expires') return st === 'expire';
      if (filter === 'jamais') return st === 'jamais';
      return true;
    })
    .sort((x, y) => Number(!!pendingOf[y.id]) - Number(!!pendingOf[x.id])); // demandes en premier
  const sel = a.profiles.find((p) => p.id === selected) || null;

  const decide = (reqId: string, approve: boolean) =>
    a.act(() => supabase.rpc('admin_handle_request', { p_request: reqId, p_approve: approve }), approve ? 'Demande accordée' : 'Demande refusée');
  const grant = (userId: string, days: number) =>
    a.act(() => supabase.rpc('admin_grant_access', { p_user: userId, p_days: days }), `Accès accordé pour ${days} jours`);
  const revoke = (userId: string) => Alert.alert('Couper l’accès ?', 'Le lien de partage expirera immédiatement.', [
    { text: 'Annuler', style: 'cancel' },
    { text: 'Couper', style: 'destructive', onPress: () => a.act(() => supabase.rpc('admin_revoke_access', { p_user: userId }), 'Accès coupé') },
  ]);
  const remove = (p: Profile) => Alert.alert('Supprimer définitivement ?', `${p.full_name || 'Cet utilisateur'} : son anniversaire, ses cadeaux et ses demandes seront effacés.`, [
    { text: 'Annuler', style: 'cancel' },
    { text: 'Supprimer', style: 'destructive', onPress: async () => {
      try { await adminDeleteUser(p.id); setSelected(null); fx.toast('Utilisateur supprimé'); a.reload(); }
      catch (e: any) { fx.toast(friendlyError(e.message), 'err'); }
    } },
  ]);

  return (
    <Screen onRefresh={async () => { setRefreshing(true); await a.reload(); setRefreshing(false); }} refreshing={refreshing}>
      <AdminHeader title="Utilisateurs" />
      <View className="mt-5 flex-row flex-wrap gap-3">
        <Stat value={pendingCount} label="Demandes en attente" highlight={pendingCount > 0} />
        <Stat value={celebrants.filter((p) => accessState(p) === 'actif').length} label="Accès actifs" />
      </View>

      <View className="my-4 min-h-[48px] flex-row items-center rounded-2xl border border-ink/10 bg-white px-3">
        <Search size={16} color={colors.muted} />
        <TextInput value={q} onChangeText={setQ} placeholder="Nom, email, téléphone…" placeholderTextColor="rgba(30,20,40,0.35)"
          className="ml-2 flex-1 py-3 font-body text-[15px] text-ink" accessibilityLabel="Rechercher" />
      </View>
      <Pills className="mb-4" value={filter} onChange={setFilter}
        options={FILTERS.map((f) => ({ ...f, label: f.key === 'attente' && pendingCount ? `${f.label} (${pendingCount})` : f.label }))} />

      {list.length === 0 && <Empty icon={Users} text="Aucun utilisateur dans cette vue." />}
      {list.map((p) => {
        const pend = pendingOf[p.id];
        return (
          <Card key={p.id} className="mb-3 p-4">
            <Pressable onPress={() => setSelected(p.id)} className="flex-row items-center" accessibilityRole="button">
              <View className="h-11 w-11 items-center justify-center rounded-full bg-lilac"><Text className="font-display text-[20px] text-candy">{(p.full_name || '?')[0].toUpperCase()}</Text></View>
              <View className="ml-3 flex-1">
                <Text className="font-bold2 text-[15px] text-ink" numberOfLines={1}>{p.full_name || 'Sans nom'}</Text>
                <Text className="font-body text-[13px] text-ink/55" numberOfLines={1}>{[p.phone, p.email].filter(Boolean).join(' · ')}</Text>
                <View className="mt-1.5 flex-row flex-wrap gap-1.5">
                  <StatusPill p={p} />
                  {pend && <Badge tone="candy" label={`${pend.kind === 'acces' ? 'Demande d’accès' : 'Prolongation'} · ${pend.days_requested} j${pend.amount ? ` · ${formatPrice(pend.amount)}` : ''}`} />}
                </View>
              </View>
              <ChevronRight size={18} color="rgba(30,20,40,0.3)" />
            </Pressable>
            {pend && (
              <View className="mt-3 flex-row gap-2">
                <Button small variant="candy" icon={Check} title="Accorder" className="flex-1" onPress={() => decide(pend.id, true)} />
                <Button small variant="ghost" icon={X} title="Refuser" onPress={() => decide(pend.id, false)} />
              </View>
            )}
          </Card>
        );
      })}

      <Sheet open={!!sel} onClose={() => setSelected(null)} title={sel?.full_name || 'Utilisateur'}>
        {sel && (
          <UserDetail p={sel} ev={eventOf[sel.id]} requests={a.requests.filter((x) => x.user_id === sel.id)}
            onGrant={(d) => grant(sel.id, d)} onDecide={decide} onRevoke={() => revoke(sel.id)} onDelete={() => remove(sel)} />
        )}
      </Sheet>
    </Screen>
  );
}

function StatusPill({ p }: { p: Profile }) {
  const st = accessState(p);
  if (st === 'jamais') return <Badge tone="muted" label="Jamais activé" />;
  if (st === 'expire') return <Badge tone="muted" label={`Expiré le ${formatDate(p.access_expires_at!, { day: 'numeric', month: 'short' })}`} />;
  const left = daysUntil(p.access_expires_at!);
  return <Badge tone={left <= 7 ? 'gold' : 'mint'} label={`Actif · ${left} j restants`} />;
}

/** Fiche détaillée d'un utilisateur. */
function UserDetail({ p, ev, requests, onGrant, onDecide, onRevoke, onDelete }: {
  p: Profile; ev?: EventRow; requests: AccessRequest[]; onGrant: (d: number) => void; onDecide: (id: string, a: boolean) => void; onRevoke: () => void; onDelete: () => void;
}) {
  const pending = requests.find((r) => r.status === 'en_attente');
  const [days, setDays] = useState(pending?.days_requested && DURATIONS.includes(pending.days_requested) ? pending.days_requested : 30);
  const active = accessState(p) === 'actif';
  return (
    <View>
      {!!p.phone && <InfoRow icon={Phone} text={p.phone} onPress={() => Linking.openURL(waLink(p.phone!))} />}
      {!!p.email && <InfoRow icon={Mail} text={p.email} onPress={() => Linking.openURL(`mailto:${p.email}`)} />}
      <View className="mb-2 flex-row items-center"><Clock size={16} color={colors.candy} /><View className="ml-2"><StatusPill p={p} /></View></View>
      <Text className="mb-4 font-body text-[13px] text-ink/60">Inscrit le {new Date(p.created_at).toLocaleDateString('fr-FR')}</Text>

      {ev ? (
        <View className="mb-4 flex-row items-center rounded-2xl border border-ink/[0.07] p-3">
          <View className="h-10 w-10 rounded-xl" style={{ backgroundColor: ev.theme_color || colors.candy }} />
          <View className="ml-3 flex-1">
            <Text className="font-bold2 text-[14px] text-ink" numberOfLines={1}>{ev.title || `Anniversaire de ${ev.celebrant_name}`}</Text>
            <View className="flex-row items-center"><CalendarHeart size={13} color={colors.muted} />
              <Text className="ml-1 font-body text-[12px] text-ink/60">{formatDate(ev.birthday_date)} · {ev.published ? 'publiée' : 'brouillon'}{ev.dress_code ? ` · ${ev.dress_code}` : ''}</Text></View>
          </View>
        </View>
      ) : <Text className="mb-4 font-body text-[13px] text-ink/55">Anniversaire pas encore créé.</Text>}

      {pending && (
        <View className="mb-5 rounded-2xl border border-candy/20 bg-candy/5 p-4">
          <Text className="font-bold2 text-[15px] text-ink">{pending.kind === 'acces' ? 'Demande d’accès' : 'Demande de prolongation'} · {pending.days_requested} jours</Text>
          <Text className="font-body text-[13px] text-ink/60">Envoyée le {new Date(pending.created_at).toLocaleDateString('fr-FR')}{pending.end_date ? ` · jusqu’au ${formatDate(pending.end_date)}` : ''}</Text>
          {pending.payment_ref ? (
            <View className="mt-3 rounded-xl bg-white p-3">
              <View className="flex-row items-center"><Receipt size={15} color={colors.candy} />
                <Text className="ml-2 flex-1 font-body text-[13px] text-ink"><Text className="font-bold2">{formatPrice(pending.amount)}</Text> par {pending.payment_method} · réf. <Text className="font-bold2">{pending.payment_ref}</Text></Text></View>
              {!!pending.proof_url && (
                <Pressable onPress={() => Linking.openURL(pending.proof_url!)} className="mt-3 overflow-hidden rounded-xl" accessibilityLabel="Voir la capture du paiement">
                  <Image source={{ uri: pending.proof_url }} style={{ width: '100%', height: 180 }} contentFit="cover" />
                </Pressable>
              )}
            </View>
          ) : <Text className="mt-2 font-semi text-[13px] text-candy">Aucun paiement déclaré.</Text>}
          {!!pending.message && <Text className="mt-2 font-body text-[13px] text-ink">{pending.message}</Text>}
          <View className="mt-4 flex-row gap-2">
            <Button variant="candy" icon={Check} title="Accorder" className="flex-1" onPress={() => onDecide(pending.id, true)} />
            <Button variant="ghost" title="Refuser" onPress={() => onDecide(pending.id, false)} />
          </View>
        </View>
      )}

      <Label>{active ? 'Prolonger l’accès' : 'Accorder un accès'}</Label>
      <Pills className="mb-3" value={days} onChange={setDays} options={DURATIONS.map((d) => ({ key: d, label: `${d} jours` }))} />
      <Button icon={Check} title="Oui, accorder" onPress={() => onGrant(days)} />

      {requests.length > 0 && (
        <View className="mt-6">
          <Label>Historique des demandes</Label>
          {requests.map((r) => (
            <View key={r.id} className="flex-row justify-between border-b border-ink/5 py-2">
              <Text className="font-body text-[13px] text-ink">{r.kind === 'acces' ? 'Accès' : 'Prolongation'} · {r.days_requested} j · {new Date(r.created_at).toLocaleDateString('fr-FR')}</Text>
              <Text className="font-semi text-[13px] text-ink/60">{r.status === 'en_attente' ? 'En attente' : r.status === 'acceptee' ? 'Accordée' : 'Refusée'}</Text>
            </View>
          ))}
        </View>
      )}

      <View className="mt-6 gap-2 border-t border-ink/[0.07] pt-5">
        {active && <Button variant="ghost" icon={Ban} title="Couper l’accès" onPress={onRevoke} />}
        <Button variant="danger" icon={Trash2} title="Supprimer l’utilisateur" onPress={onDelete} />
      </View>
    </View>
  );
}
