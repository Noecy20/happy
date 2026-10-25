/**
 * Suivi d'une commande à partir de son code (RPC publique get_order_tracking).
 * Étapes : Reçue → Acceptée → En préparation → Prête → Livrée (ou Annulée), historique,
 * contact boutique, statut de paiement. Rafraîchi toutes les 20 secondes.
 * Utilisé en plein écran (/suivi/[code]) et dans une feuille sur la page de l'ami.
 */
import { router } from 'expo-router';
import { Check, MapPin, Phone, Ribbon, Store, XCircle } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { supabase } from '@/lib/supabase';
import { colors } from '@/lib/theme';
import { ORDER_STEPS, formatDate, formatPrice, statusLabel, waLink } from '@/lib/utils';
import PushButton from './PushButton';
import { Badge, InfoRow, Loading } from './ui';

export default function OrderTracking({ code, compact = false, onNavigate }: { code: string; compact?: boolean; onNavigate?: () => void }) {
  const [o, setO] = useState<any>(undefined);

  useEffect(() => {
    const load = () => supabase.rpc('get_order_tracking', { p_code: code }).then(({ data }) => setO(data ?? null));
    load();
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, [code]);

  if (o === undefined) return <Loading />;
  if (!o) return <Text className="py-10 text-center font-body text-ink/60">Code introuvable. Vérifiez les 8 caractères de votre code de suivi.</Text>;

  const cancelled = o.status === 'annulee';
  const current = ORDER_STEPS.findIndex((s) => s.key === o.status);
  const opts = Object.entries(o.options || {}) as [string, string][];
  const total = (Number(o.item.price) || 0) * (o.quantity || 1) + (o.gift_wrap ? Number(o.wrap_price) || 0 : 0);

  return (
    <View>
      {!compact && (
        <>
          <Text className="font-semi text-[13px] text-ink/55">Commande {o.tracking_code}</Text>
          <Text className="mt-1 font-display text-[36px] leading-[38px] text-ink">
            {o.celebrant_name ? `Pour l’anniversaire de ${o.celebrant_name}` : 'Suivi de votre commande'}
          </Text>
        </>
      )}
      <Text className="mt-2 font-body text-[14px] text-ink/60">
        {compact ? `Commande ${o.tracking_code} · ` : ''}
        {o.delivery_date ? `Livraison prévue le ${formatDate(o.delivery_date)}` : 'Date de livraison à convenir'}
        {o.delivery_address ? ` à ${o.delivery_address}` : ' · retrait en boutique'}
      </Text>

      {/* Article */}
      <View className="mt-5 flex-row items-center rounded-2xl border border-ink/[0.07] bg-white p-3">
        <View className="h-16 w-16 overflow-hidden rounded-xl bg-lilac">
          {o.item.image_url && <Image source={{ uri: o.item.image_url }} style={{ width: '100%', height: '100%' }} contentFit="cover" />}
        </View>
        <View className="ml-3 flex-1">
          <Text className="font-display text-[22px] leading-[24px] text-ink">{o.item.name}{o.quantity > 1 ? ` × ${o.quantity}` : ''}</Text>
          <Text className="font-body text-[13px] text-ink/60">{formatPrice(total)}{opts.length ? ' · ' + opts.map(([k, v]) => `${k} : ${v}`).join(', ') : ''}</Text>
          {o.gift_wrap && <View className="mt-1"><Badge tone="gold" icon={Ribbon} label="Emballage cadeau" /></View>}
        </View>
        <Badge tone={o.paid ? 'mint' : 'gold'} label={o.paid ? 'Payé' : 'À régler'} />
      </View>

      {/* Étapes */}
      {cancelled ? (
        <View className="mt-5 flex-row items-center rounded-2xl bg-candy p-4">
          <XCircle size={20} color="#fff" />
          <Text className="ml-2 font-bold2 text-white">Commande annulée par la boutique</Text>
        </View>
      ) : (
        <View className="mt-6 flex-row">
          {ORDER_STEPS.map((s, i) => {
            const done = i <= current;
            return (
              <View key={s.key} className="flex-1 items-center">
                <View className="w-full flex-row items-center">
                  <View className="h-1 flex-1" style={{ backgroundColor: i === 0 ? 'transparent' : i <= current ? colors.mint : colors.faint }} />
                  <View className="h-9 w-9 items-center justify-center rounded-full"
                    style={done ? { backgroundColor: colors.mint } : { borderWidth: 1, borderColor: 'rgba(30,20,40,0.15)', backgroundColor: '#fff' }}>
                    {done ? <Check size={16} color="#fff" /> : <Text className="font-bold2 text-[12px] text-ink/50">{i + 1}</Text>}
                  </View>
                  <View className="h-1 flex-1" style={{ backgroundColor: i === ORDER_STEPS.length - 1 ? 'transparent' : i < current ? colors.mint : colors.faint }} />
                </View>
                <Text className={`mt-2 text-center font-semi text-[10px] ${done ? 'text-ink' : 'text-ink/45'}`}>{s.label}</Text>
              </View>
            );
          })}
        </View>
      )}

      {/* Boutique */}
      <View className="mt-6 rounded-2xl bg-lilac/40 p-5">
        <Text className="mb-3 font-display text-[24px] text-ink">Boutique</Text>
        {o.vendor ? (
          <>
            <Pressable onPress={() => { onNavigate?.(); router.push(`/boutiques/${o.vendor.id}`); }} className="mb-2 flex-row items-center">
              <Store size={16} color={colors.candy} />
              <Text className="ml-2 font-semi text-[14px] text-ink underline">{o.vendor.name}</Text>
            </Pressable>
            {o.vendor.phone && <InfoRow icon={Phone} text={o.vendor.phone} onPress={() => Linking.openURL(waLink(o.vendor.phone))} />}
            {o.vendor.address && <InfoRow icon={MapPin} text={o.vendor.address} />}
          </>
        ) : <Text className="font-body text-[14px] text-ink">{o.external_contact || 'Contact du vendeur non renseigné.'}</Text>}
        <Text className="mt-3 font-body text-[13px] text-ink/65">{o.payment_note}</Text>
        {o.vendor_note && <Text className="mt-2 font-body text-[14px] text-ink"><Text className="font-bold2">Note de la boutique : </Text>{o.vendor_note}</Text>}
      </View>

      {/* Historique */}
      <View className="mt-4 rounded-2xl bg-lilac/40 p-5">
        <Text className="mb-3 font-display text-[24px] text-ink">Historique</Text>
        {o.history.slice().reverse().map((h: any, i: number) => (
          <View key={i} className="mb-3 border-l-2 border-candy/40 pl-3">
            <Text className="font-bold2 text-[14px] text-ink">{statusLabel(h.status)}</Text>
            {h.note && <Text className="font-body text-[13px] text-ink/65">{h.note}</Text>}
            <Text className="font-body text-[11px] text-ink/40">{new Date(h.at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</Text>
          </View>
        ))}
      </View>

      <PushButton scope={{ orderCode: o.tracking_code }} label="Être prévenu de l’avancement" className="mt-5" />
    </View>
  );
}
