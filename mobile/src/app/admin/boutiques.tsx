/**
 * Admin · Boutiques.
 * - Boutiques en attente EN PREMIER, avec le paiement déclaré (moyen, référence, capture).
 * - Valider / Refuser → RPC admin_validate_vendor (met en ligne + notifie la boutique).
 * - Mettre en ligne / masquer une boutique validée, voir sa vitrine, la supprimer (avec son compte).
 * - Ajouter une boutique déjà validée → route web POST /api/admin/vendors (création du compte côté serveur).
 */
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Check, Eye, Plus, Receipt, Search, Store, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Linking, Pressable, Text, TextInput, View } from 'react-native';
import AdminHeader from '@/components/admin/AdminHeader';
import { Badge, Button, Card, Empty, ErrorText, Field, Label, Loading, Pills, Screen, Sheet } from '@/components/ui';
import { adminCreateVendor, adminDeleteUser } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { colors } from '@/lib/theme';
import type { Vendor } from '@/lib/types';
import { VENDOR_CATEGORIES } from '@/lib/utils';
import { friendlyError, useAdmin } from '@/providers/AdminProvider';
import { useFx } from '@/providers/FxProvider';

export default function AdminShops() {
  const a = useAdmin();
  const fx = useFx();
  const [q, setQ] = useState('');
  const [adding, setAdding] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  if (a.loading) return <Loading />;

  const list = a.vendors
    .filter((v) => !q || `${v.name} ${v.email || ''} ${v.phone || ''}`.toLowerCase().includes(q.toLowerCase()))
    .sort((x, y) => Number(y.status === 'en_attente') - Number(x.status === 'en_attente'));

  const validate = (v: Vendor, ok: boolean) =>
    a.act(() => supabase.rpc('admin_validate_vendor', { p_vendor: v.id, p_approve: ok }), ok ? 'Boutique validée' : 'Boutique refusée');
  const remove = (v: Vendor) => Alert.alert('Supprimer la boutique ?', `${v.name} et son compte seront supprimés définitivement.`, [
    { text: 'Annuler', style: 'cancel' },
    { text: 'Supprimer', style: 'destructive', onPress: async () => {
      try { await adminDeleteUser(v.owner_id!); fx.toast('Boutique supprimée'); a.reload(); } catch (e: any) { fx.toast(friendlyError(e.message), 'err'); }
    } },
  ]);

  return (
    <Screen onRefresh={async () => { setRefreshing(true); await a.reload(); setRefreshing(false); }} refreshing={refreshing}>
      <AdminHeader title="Boutiques" />
      <Button variant="candy" icon={Plus} title="Ajouter une boutique" className="mt-5" onPress={() => setAdding(true)} />
      <View className="my-4 min-h-[48px] flex-row items-center rounded-2xl border border-ink/10 bg-white px-3">
        <Search size={16} color={colors.muted} />
        <TextInput value={q} onChangeText={setQ} placeholder="Nom, email, téléphone…" placeholderTextColor="rgba(30,20,40,0.35)"
          className="ml-2 flex-1 py-3 font-body text-[15px] text-ink" accessibilityLabel="Rechercher une boutique" />
      </View>

      {list.length === 0 && <Empty icon={Store} text="Aucune boutique." />}
      {list.map((v) => (
        <Card key={v.id} className="mb-3 p-4">
          <View className="flex-row items-center">
            <View className="h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-lilac">
              {v.logo_url ? <Image source={{ uri: v.logo_url }} style={{ width: '100%', height: '100%' }} /> : <Text className="font-display text-[24px] text-candy">{v.name[0]?.toUpperCase()}</Text>}
            </View>
            <View className="ml-3 flex-1">
              <Text className="font-bold2 text-[15px] text-ink">{v.name}</Text>
              <Text className="font-body text-[12px] text-ink/60" numberOfLines={2}>{[v.category, v.phone, v.email, v.address].filter(Boolean).join(' · ')}</Text>
            </View>
          </View>
          <View className="mt-2 flex-row flex-wrap gap-1.5">
            <Badge tone={v.status === 'en_attente' ? 'candy' : v.status === 'refusee' ? 'muted' : v.active ? 'mint' : 'gold'}
              label={v.status === 'en_attente' ? 'À valider' : v.status === 'refusee' ? 'Refusée' : v.active ? 'En ligne' : 'Masquée'} />
          </View>
          {!!v.payment_ref && (
            <View className="mt-3 rounded-xl bg-lilac/50 p-3">
              <View className="flex-row items-center"><Receipt size={14} color={colors.candy} />
                <Text className="ml-2 flex-1 font-body text-[13px] text-ink">{v.payment_method} · réf. <Text className="font-bold2">{v.payment_ref}</Text></Text></View>
              {!!v.proof_url && (
                <Pressable onPress={() => Linking.openURL(v.proof_url!)} className="mt-2 overflow-hidden rounded-xl" accessibilityLabel="Voir la capture">
                  <Image source={{ uri: v.proof_url }} style={{ width: '100%', height: 150 }} contentFit="cover" />
                </Pressable>
              )}
            </View>
          )}
          <View className="mt-3 flex-row flex-wrap gap-2">
            {v.status === 'en_attente' ? (
              <>
                <Button small variant="candy" icon={Check} title="Valider" onPress={() => validate(v, true)} />
                <Button small variant="ghost" title="Refuser" onPress={() => validate(v, false)} />
              </>
            ) : (
              <Button small variant={v.active ? 'ghost' : 'primary'} title={v.status === 'refusee' ? 'Valider finalement' : v.active ? 'Masquer' : 'Mettre en ligne'}
                onPress={() => v.status === 'refusee' ? validate(v, true)
                  : a.act(() => supabase.from('vendors').update({ active: !v.active }).eq('id', v.id), v.active ? 'Boutique masquée' : 'Boutique en ligne')} />
            )}
            <Button small variant="ghost" icon={Eye} title="Voir" onPress={() => router.push(`/boutiques/${v.id}`)} />
            {!!v.owner_id && <Button small variant="danger" icon={Trash2} title="Supprimer" onPress={() => remove(v)} />}
          </View>
        </Card>
      ))}

      <Sheet open={adding} onClose={() => setAdding(false)} title="Ajouter une boutique">
        <AddVendorForm onDone={() => { setAdding(false); fx.toast('Boutique créée et en ligne'); a.reload(); }} />
      </Sheet>
    </Screen>
  );
}

/** Création d'une boutique par l'admin (compte + vitrine validée, côté serveur). */
function AddVendorForm({ onDone }: { onDone: () => void }) {
  const [f, setF] = useState({ shop_name: '', category: '', phone: '', email: '', address: '', full_name: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const set = (k: keyof typeof f) => (v: string) => setF((x) => ({ ...x, [k]: v }));
  const submit = async () => {
    setErr('');
    if (!f.shop_name.trim() || !f.phone.trim() || f.password.length < 6) return setErr('Nom, téléphone et mot de passe (6 caractères min.) sont obligatoires.');
    setLoading(true);
    try { await adminCreateVendor(f); onDone(); } catch (e: any) { setErr(friendlyError(e.message)); }
    setLoading(false);
  };
  return (
    <View>
      <Text className="mb-4 font-body text-[13px] leading-[19px] text-ink/60">La boutique est créée validée et en ligne. Communiquez-lui son téléphone et son mot de passe pour qu’elle se connecte.</Text>
      <Field label="Nom de la boutique" value={f.shop_name} onChangeText={set('shop_name')} />
      <Label>Catégorie</Label>
      <Pills className="mb-4" value={f.category} onChange={set('category')} options={VENDOR_CATEGORIES.map((c) => ({ key: c, label: c }))} />
      <Field label="Responsable" value={f.full_name} onChangeText={set('full_name')} />
      <Field label="Téléphone (identifiant)" keyboardType="phone-pad" value={f.phone} onChangeText={set('phone')} />
      <Field label="Email (facultatif)" keyboardType="email-address" autoCapitalize="none" value={f.email} onChangeText={set('email')} />
      <Field label="Adresse" value={f.address} onChangeText={set('address')} />
      <Field label="Mot de passe provisoire" autoCapitalize="none" value={f.password} onChangeText={set('password')} autoComplete="new-password" />
      <ErrorText text={err} />
      <Button variant="candy" loading={loading} title="Créer la boutique" onPress={submit} />
    </View>
  );
}
