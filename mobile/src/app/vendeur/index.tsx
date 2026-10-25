/**
 * Onglet « Commandes » de la boutique.
 * - Paiement des frais si la boutique n'est pas encore validée.
 * - Statistiques : à traiter, paiements en attente, anniversaires, articles en ligne.
 * - Commandes REGROUPÉES par anniversaire (« Anniversaire de <prénom> », date), puis « Commandes directes ».
 * - Chaque commande : article, variantes, quantité, total (emballage compris), acheteur (appel, WhatsApp, email),
 *   date et lieu de livraison, destinataire, badges Cadeau / Surprise / Emballage, message carte,
 *   note visible par l'acheteur, statut, payé.
 * - Mise à jour : RPC vendor_update_order (le stock baisse à la validation et remonte à l'annulation, en SQL),
 *   puis POST <site>/api/push/order pour prévenir l'acheteur.
 */
import { Image } from 'expo-image';
import { CalendarDays, Cake, Check, EyeOff, Gift, Mail, MapPin, MessageCircle, MessageSquareText, Phone, Ribbon, Search, ShoppingBag, Store } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Linking, Pressable, Text, TextInput, View } from 'react-native';
import { Badge, Button, Card, Empty, InfoRow, Loading, Pills, Screen, Stat, Title } from '@/components/ui';
import PendingPayment from '@/components/vendor/PendingPayment';
import ShopHeader from '@/components/vendor/ShopHeader';
import { notifyOrder } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { colors } from '@/lib/theme';
import type { VendorOrder } from '@/lib/types';
import { ORDER_STEPS, formatDate, formatPrice, statusLabel, waLink } from '@/lib/utils';
import { useFx } from '@/providers/FxProvider';
import { useVendor } from '@/providers/VendorProvider';

const FILTERS = [{ key: 'actives', label: 'À traiter' }, { key: 'livree', label: 'Livrées' }, { key: 'annulee', label: 'Annulées' }, { key: 'toutes', label: 'Toutes' }];

export default function VendorOrders() {
  const v = useVendor();
  const fx = useFx();
  const [filter, setFilter] = useState('actives');
  const [q, setQ] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  /** Met à jour une commande (optimiste), puis prévient l'acheteur par push. */
  const update = async (o: VendorOrder, patch: Partial<VendorOrder>) => {
    const next = { ...o, ...patch };
    v.setOrders((all) => all.map((x) => (x.id === o.id ? next : x)));
    const { error } = await supabase.rpc('vendor_update_order', { p_order: o.id, p_status: next.status, p_paid: next.paid, p_note: next.vendor_note || null });
    if (error) { fx.toast(error.message, 'err'); v.reload(); return; }
    fx.toast('Commande mise à jour');
    notifyOrder(o.tracking_code);
    if (patch.status) v.reload(); // le stock a pu changer
  };

  // Regroupement par anniversaire, les commandes directes en dernier
  const groups = useMemo(() => {
    const list = v.orders
      .filter((o) => (filter === 'toutes' ? true : filter === 'actives' ? !['livree', 'annulee'].includes(o.status) : o.status === filter))
      .filter((o) => !q || [o.tracking_code, o.buyer_name, o.item_name, o.celebrant_name].join(' ').toLowerCase().includes(q.toLowerCase()));
    const map = new Map<string, { key: string; title: string; sub: string; orders: VendorOrder[] }>();
    for (const o of list) {
      const key = o.event_id || 'direct';
      if (!map.has(key)) map.set(key, {
        key,
        title: o.event_id ? `Anniversaire de ${o.celebrant_name}` : 'Commandes directes',
        sub: o.event_id && o.birthday_date ? formatDate(o.birthday_date, { weekday: 'long', day: 'numeric', month: 'long' }) : 'Passées depuis la section Boutiques',
        orders: [],
      });
      map.get(key)!.orders.push(o);
    }
    return [...map.values()].sort((a, b) => (a.key === 'direct' ? 1 : b.key === 'direct' ? -1 : 0));
  }, [v.orders, filter, q]);

  if (v.loading) return <Loading />;
  if (!v.vendor)
    return <Screen><View className="mt-16"><Empty icon={Store} text="Ce compte n’a pas de boutique. Créez un compte « Ma boutique » pour vendre sur Happy." /></View></Screen>;

  const active = v.orders.filter((o) => !['livree', 'annulee'].includes(o.status)).length;
  const unpaid = v.orders.filter((o) => !o.paid && o.status !== 'annulee').length;
  const birthdays = new Set(v.orders.filter((o) => o.event_id).map((o) => o.event_id)).size;

  return (
    <Screen onRefresh={async () => { setRefreshing(true); await v.reload(); setRefreshing(false); }} refreshing={refreshing}>
      <ShopHeader vendor={v.vendor} />
      {v.vendor.status !== 'validee'
        ? <PendingPayment vendor={v.vendor} onSent={() => { fx.toast('Paiement envoyé à l’administrateur'); v.reload(); }} />
        : !v.vendor.active && <Text className="mt-4 rounded-2xl bg-lilac p-3 font-semi text-[13px] text-candy">Votre boutique est désactivée par l’administrateur : elle n’apparaît plus dans la section Boutiques.</Text>}

      <View className="mt-5 flex-row flex-wrap gap-3">
        <Stat value={active} label="À traiter" highlight={active > 0} />
        <Stat value={unpaid} label="Paiements en attente" />
        <Stat value={birthdays} label="Anniversaires" />
        <Stat value={v.products.filter((p) => p.active).length} label="Articles en ligne" />
      </View>

      <Title className="mb-3 mt-8 text-[30px]">Commandes</Title>
      <Pills className="mb-3" value={filter} onChange={setFilter} options={FILTERS} />
      <View className="mb-5 min-h-[48px] flex-row items-center rounded-2xl border border-ink/10 bg-white px-3">
        <Search size={16} color={colors.muted} />
        <TextInput value={q} onChangeText={setQ} placeholder="Code, client, article…" placeholderTextColor="rgba(30,20,40,0.35)"
          className="ml-2 flex-1 py-3 font-body text-[15px] text-ink" accessibilityLabel="Rechercher une commande" />
      </View>

      {groups.length === 0 && <Empty icon={ShoppingBag} text="Aucune commande dans cette vue." />}
      {groups.map((g) => (
        <View key={g.key} className="mb-8">
          <View className="mb-3 flex-row items-center">
            <View className="h-10 w-10 items-center justify-center rounded-2xl bg-lilac">
              {g.key === 'direct' ? <ShoppingBag size={18} color={colors.candy} /> : <Cake size={18} color={colors.candy} />}
            </View>
            <View className="ml-3 flex-1">
              <Text className="font-display text-[24px] leading-[26px] text-ink">{g.title}</Text>
              <Text className="font-body text-[13px] capitalize text-ink/55">{g.sub} · {g.orders.length} commande{g.orders.length > 1 ? 's' : ''}</Text>
            </View>
          </View>
          {g.orders.map((o) => <OrderCard key={o.id} o={o} onUpdate={update} />)}
        </View>
      ))}
    </Screen>
  );
}

/** Carte d'une commande avec toutes les actions de la boutique. */
function OrderCard({ o, onUpdate }: { o: VendorOrder; onUpdate: (o: VendorOrder, p: Partial<VendorOrder>) => void }) {
  const [note, setNote] = useState(o.vendor_note || '');
  const total = (Number(o.unit_price) || 0) * o.quantity + (o.gift_wrap ? Number(o.wrap_price) || 0 : 0);
  const opts = Object.entries(o.options || {});
  return (
    <Card className="mb-3 p-4">
      <View className="flex-row">
        <View className="h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-lilac">
          {o.item_image ? <Image source={{ uri: o.item_image }} style={{ width: '100%', height: '100%' }} /> : <Gift size={26} color={colors.candy} />}
        </View>
        <View className="ml-3 flex-1">
          <View className="flex-row flex-wrap items-center gap-2">
            <Badge label={o.tracking_code} />
            <Text className="font-body text-[11px] text-ink/45">reçue le {new Date(o.created_at).toLocaleDateString('fr-FR')}</Text>
          </View>
          <Text className="mt-1 font-display text-[22px] leading-[24px] text-ink">{o.item_name}{o.quantity > 1 ? ` × ${o.quantity}` : ''}</Text>
          <Text className="font-bold2 text-[13px] text-ink/60">{formatPrice(total)}</Text>
        </View>
      </View>

      {/* Acheteur */}
      <Text className="mt-3 font-bold2 text-[14px] text-ink">{o.buyer_name}</Text>
      <View className="mt-2 flex-row flex-wrap gap-2">
        <Button small variant="ghost" icon={Phone} title="Appeler" onPress={() => Linking.openURL(`tel:${o.buyer_phone}`)} />
        <Button small variant="ghost" icon={MessageCircle} title="WhatsApp" onPress={() => Linking.openURL(waLink(o.buyer_phone))} />
        {!!o.buyer_email && <Button small variant="ghost" icon={Mail} title="Email" onPress={() => Linking.openURL(`mailto:${o.buyer_email}`)} />}
      </View>

      {/* Livraison */}
      <View className="mt-3">
        <InfoRow icon={CalendarDays} text={o.delivery_date ? `Livrer le ${formatDate(o.delivery_date)}` : 'Date de livraison non précisée'} />
        <InfoRow icon={MapPin} text={o.delivery_address || 'Retrait en boutique'} />
        {!!o.recipient_name && <InfoRow icon={Gift} text={`Pour ${o.recipient_name}`} />}
      </View>

      <View className="mt-1 flex-row flex-wrap gap-1.5">
        {o.is_gift && <Badge tone="candy" icon={Gift} label="Cadeau" />}
        {o.is_surprise && <Badge tone="plum" icon={EyeOff} label="Surprise : ne pas révéler l’acheteur" />}
        {o.gift_wrap && <Badge tone="gold" icon={Ribbon} label={`Emballage cadeau${o.wrap_price ? ` (${formatPrice(o.wrap_price)})` : ''}`} />}
        {opts.map(([k, val]) => <Badge key={k} label={`${k} : ${val}`} />)}
      </View>
      {!!o.gift_message && (
        <View className="mt-3 flex-row rounded-2xl bg-lilac/50 p-3">
          <MessageSquareText size={16} color={colors.candy} />
          <Text className="ml-2 flex-1 font-body text-[13px] text-ink">« {o.gift_message} »</Text>
        </View>
      )}

      {/* Note visible par l'acheteur : enregistrée quand on quitte le champ */}
      <TextInput value={note} onChangeText={setNote} onEndEditing={() => note !== (o.vendor_note || '') && onUpdate(o, { vendor_note: note })}
        placeholder="Note visible par l’acheteur (ex. : livraison jeudi 15h)" placeholderTextColor="rgba(30,20,40,0.35)"
        className="mt-3 min-h-[46px] rounded-2xl border border-ink/10 bg-white px-4 font-body text-[14px] text-ink" />

      {/* Statut et paiement */}
      <Text className="mb-2 mt-4 font-semi text-[12px] text-ink/60">Statut : {statusLabel(o.status)}</Text>
      <Pills value={o.status} onChange={(s) => s !== o.status && onUpdate(o, { status: s })}
        options={[...ORDER_STEPS.map((s) => ({ key: s.key as string, label: s.label })), { key: 'annulee', label: 'Annulée' }]} />
      <Pressable onPress={() => onUpdate(o, { paid: !o.paid })} accessibilityRole="switch" accessibilityState={{ checked: o.paid }}
        className={`mt-3 min-h-[46px] flex-row items-center justify-center rounded-full ${o.paid ? 'bg-mint/15' : 'border border-ink/10 bg-white'}`}>
        {o.paid && <Check size={15} color={colors.mint} />}
        <Text className={`ml-1 font-bold2 text-[14px] ${o.paid ? 'text-mint' : 'text-ink'}`}>{o.paid ? 'Payé' : 'Marquer comme payé'}</Text>
      </Pressable>
    </Card>
  );
}
