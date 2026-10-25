/**
 * Vitrine publique d'une boutique (ouverte aussi par le lien https://<site>/boutiques/<id>).
 * - En-tête : couverture (ou fond décoratif), logo, catégorie, adresse, WhatsApp.
 * - Filtres par catégories créées par la boutique (product_categories).
 * - Articles : badges de stock (« Plus que 2 », « Rupture »), emballage et son prix, variantes.
 * - Commande directe (RPC place_order) : quantité limitée au stock, variantes obligatoires,
 *   option cadeau / surprise / message carte, emballage, total recalculé, puis code de suivi.
 */
import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { Copy, Gift, MapPin, Minus, PartyPopper, Phone, Plus, Ribbon, ShoppingBag } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import DateField from '@/components/DateField';
import { Decor, GiftPlaceholder, seedOf } from '@/components/Illustrations';
import TopBar from '@/components/TopBar';
import { Badge, Button, ErrorText, Field, Label, Loading, Pills, Screen, Sheet, Title, Toggle, Txt, Empty } from '@/components/ui';
import { saveMyOrder } from '@/lib/memory';
import { supabase } from '@/lib/supabase';
import { colors, shadow } from '@/lib/theme';
import type { Category, Product, Vendor } from '@/lib/types';
import { formatPrice, todayIso, waLink } from '@/lib/utils';
import { useFx } from '@/providers/FxProvider';

export default function Shop() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const fx = useFx();
  const [vendor, setVendor] = useState<Vendor | null | undefined>(undefined);
  const [products, setProducts] = useState<Product[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [cat, setCat] = useState('');
  const [selected, setSelected] = useState<Product | null>(null);
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      supabase.from('vendors').select('id,name,category,description,address,phone,logo_url,cover_url').eq('id', id).maybeSingle(),
      supabase.from('products').select('id,vendor_id,name,description,price,image_url,category_id,options,stock,wrap_available,wrap_price,active')
        .eq('vendor_id', id).eq('active', true).order('created_at', { ascending: false }),
      supabase.from('product_categories').select('id,name').eq('vendor_id', id).order('name'),
    ]).then(([v, p, c]) => {
      setVendor(v.data as Vendor | null);
      setProducts((p.data as Product[]) || []);
      // On n'affiche que les catégories réellement utilisées
      const used = new Set((p.data || []).map((x: any) => x.category_id));
      setCats(((c.data as Category[]) || []).filter((x) => used.has(x.id)));
    });
  }, [id]);

  if (vendor === undefined) return <Screen><TopBar /><Loading /></Screen>;
  if (!vendor)
    return (
      <Screen>
        <TopBar />
        <Title className="mt-10 text-center">Boutique introuvable</Title>
        <Button title="Voir les boutiques" className="mt-6" onPress={() => router.replace('/boutiques')} />
      </Screen>
    );

  return (
    <Screen>
      <TopBar title={vendor.name} />

      {/* En-tête de la vitrine */}
      <View className="overflow-hidden rounded-[32px] bg-plum p-6">
        {vendor.cover_url
          ? <><Image source={{ uri: vendor.cover_url }} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} contentFit="cover" /><View className="absolute inset-0 bg-plum/70" /></>
          : <Decor seed={seedOf(vendor.id)} opacity={0.4} />}
        <View className="h-20 w-20 items-center justify-center overflow-hidden rounded-3xl border-4 border-white/20 bg-white/15">
          {vendor.logo_url ? <Image source={{ uri: vendor.logo_url }} style={{ width: '100%', height: '100%' }} accessibilityLabel={`Logo ${vendor.name}`} />
            : <Text className="font-display text-[40px] text-white">{vendor.name[0]?.toUpperCase()}</Text>}
        </View>
        {!!vendor.category && <Text className="mt-4 font-semi text-[13px] text-white/60">{vendor.category}</Text>}
        <Text className="font-display text-[38px] leading-[40px] text-white">{vendor.name}</Text>
        {!!vendor.description && <Text className="mt-2 font-body text-[14px] leading-[21px] text-white/75">{vendor.description}</Text>}
        <View className="mt-3 gap-1">
          {!!vendor.address && <View className="flex-row items-center"><MapPin size={14} color="rgba(255,255,255,0.7)" /><Text className="ml-1.5 font-body text-[13px] text-white/70">{vendor.address}</Text></View>}
          {!!vendor.phone && (
            <Pressable onPress={() => Linking.openURL(waLink(vendor.phone!))} className="min-h-[32px] flex-row items-center">
              <Phone size={14} color="rgba(255,255,255,0.7)" /><Text className="ml-1.5 font-body text-[13px] text-white/70 underline">{vendor.phone}</Text>
            </Pressable>
          )}
        </View>
      </View>

      {cats.length > 0 && (
        <Pills className="mt-6" value={cat} onChange={setCat} options={[{ key: '', label: 'Tout' }, ...cats.map((c) => ({ key: c.id, label: c.name }))]} />
      )}

      <View className="mt-6">
        {products.length === 0 && <Empty icon={ShoppingBag} text="Cette boutique n’a pas encore d’article en ligne." />}
        {products.filter((p) => !cat || p.category_id === cat).map((p) => (
          <View key={p.id} className="mb-5 overflow-hidden rounded-[24px] border border-ink/[0.07] bg-white" style={shadow.sm}>
            <View className="aspect-[4/3] bg-lilac">
              {p.image_url ? <Image source={{ uri: p.image_url }} style={{ width: '100%', height: '100%' }} contentFit="cover" accessibilityLabel={p.name} /> : <GiftPlaceholder seed={p.id} />}
            </View>
            <View className="p-5">
              <Text className="font-display text-[24px] leading-[26px] text-ink">{p.name}</Text>
              <Text className="mt-1 font-bold2 text-[14px] text-ink">{formatPrice(p.price)}</Text>
              {!!p.description && <Text className="mt-2 font-body text-[14px] leading-[20px] text-ink/60">{p.description}</Text>}
              <View className="mt-3 flex-row flex-wrap gap-1.5">
                {p.stock != null && <Badge tone={p.stock > 0 ? 'mint' : 'candy'} label={p.stock > 0 ? (p.stock <= 3 ? `Plus que ${p.stock}` : 'En stock') : 'Rupture de stock'} />}
                {p.wrap_available && <Badge tone="gold" icon={Ribbon} label={`Emballage cadeau ${p.wrap_price ? '+' + formatPrice(p.wrap_price) : 'offert'}`} />}
                {(p.options || []).map((o) => <Badge key={o.name} label={`${o.name} : ${o.values.join(', ')}`} />)}
              </View>
              <Button variant="candy" icon={ShoppingBag} className="mt-4" disabled={p.stock === 0}
                title={p.stock === 0 ? 'Indisponible' : 'Commander'} onPress={() => setSelected(p)} />
            </View>
          </View>
        ))}
      </View>

      <Sheet open={!!selected} onClose={() => setSelected(null)} title="Passer commande">
        {selected && (
          <OrderForm product={selected} onError={(m) => fx.toast(m, 'err')}
            onDone={async (code) => { await saveMyOrder(code); setSelected(null); setDone(code); fx.confetti(); }} />
        )}
      </Sheet>

      <Sheet open={!!done} onClose={() => setDone(null)}>
        {done && (
          <View className="items-center">
            <PartyPopper size={42} color={colors.candy} />
            <Title className="mt-3 text-center">Commande envoyée</Title>
            <Txt className="mt-2 text-center text-ink/65">{vendor.name} a reçu votre commande et vous contactera pour le paiement et la livraison.</Txt>
            <View className="mt-6 w-full items-center rounded-2xl bg-lilac/50 p-4">
              <Txt className="font-semi text-ink/55">Votre code de suivi</Txt>
              <Text className="mt-1 font-black2 text-[30px] tracking-[6px] text-ink">{done}</Text>
              <Button small variant="ghost" icon={Copy} title="Copier" className="mt-2"
                onPress={async () => { await Clipboard.setStringAsync(done); fx.toast('Code copié'); }} />
            </View>
            <Button title="Suivre ma commande" className="mt-6 w-full" onPress={() => { const c = done; setDone(null); router.push(`/suivi/${c}`); }} />
          </View>
        )}
      </Sheet>
    </Screen>
  );
}

/** Formulaire de commande directe (appel RPC place_order). */
function OrderForm({ product, onDone, onError }: { product: Product; onDone: (code: string) => void; onError: (m: string) => void }) {
  const [qty, setQty] = useState(1);
  const [choice, setChoice] = useState<Record<string, string>>({});
  const [f, setF] = useState({ name: '', phone: '', email: '', date: '', address: '', recipient: '', message: '' });
  const [gift, setGift] = useState(false);
  const [surprise, setSurprise] = useState(false);
  const [wrap, setWrap] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const set = (k: keyof typeof f) => (v: string) => setF((x) => ({ ...x, [k]: v }));
  const maxQty = Math.min(product.stock ?? 99, 99);
  const total = (Number(product.price) || 0) * qty + (wrap ? Number(product.wrap_price) || 0 : 0);
  const variants = (product.options || []).filter((o) => o.values?.length);

  const submit = async () => {
    setErr('');
    const missing = variants.find((o) => !choice[o.name]);
    if (missing) return setErr(`Choisissez : ${missing.name}`);
    if (!f.name.trim() || !f.phone.trim()) return setErr('Le nom et le téléphone sont obligatoires.');
    setLoading(true);
    const { data, error } = await supabase.rpc('place_order', {
      p_product: product.id, p_quantity: qty, p_name: f.name, p_phone: f.phone, p_email: f.email || null,
      p_delivery_date: f.date || null, p_address: f.address || null, p_recipient: gift ? f.recipient || null : null,
      p_is_gift: gift, p_surprise: gift && surprise, p_wrap: wrap, p_gift_message: gift ? f.message || null : null, p_options: choice,
    });
    setLoading(false);
    if (error) return onError(error.message);
    onDone(data.tracking_code);
  };

  return (
    <View>
      {/* Article + quantité */}
      <View className="mb-4 flex-row items-center rounded-2xl bg-lilac/50 p-3">
        <View className="h-16 w-16 overflow-hidden rounded-xl bg-white">
          {product.image_url ? <Image source={{ uri: product.image_url }} style={{ width: '100%', height: '100%' }} /> : <View className="flex-1 items-center justify-center"><Gift size={22} color={colors.candy} /></View>}
        </View>
        <View className="ml-3 flex-1">
          <Text className="font-bold2 text-[14px] text-ink">{product.name}</Text>
          <Text className="font-body text-[13px] text-ink/60">{formatPrice(total)}{product.stock != null ? ` · ${product.stock} dispo` : ''}</Text>
        </View>
        <View className="flex-row items-center rounded-full bg-white p-1">
          <Pressable accessibilityLabel="Moins" onPress={() => setQty(Math.max(1, qty - 1))} className="h-10 w-10 items-center justify-center rounded-full"><Minus size={14} color={colors.ink} /></Pressable>
          <Text className="w-6 text-center font-bold2 text-ink">{qty}</Text>
          <Pressable accessibilityLabel="Plus" onPress={() => setQty(Math.min(maxQty, qty + 1))} className="h-10 w-10 items-center justify-center rounded-full"><Plus size={14} color={colors.ink} /></Pressable>
        </View>
      </View>

      {/* Variantes obligatoires */}
      {variants.map((o) => (
        <View key={o.name} className="mb-4">
          <Label>{o.name}</Label>
          <Pills value={choice[o.name]} onChange={(v) => setChoice({ ...choice, [o.name]: v })} options={o.values.map((v) => ({ key: v, label: v }))} />
        </View>
      ))}

      <Field label="Votre nom" value={f.name} onChangeText={set('name')} autoComplete="name" />
      <Field label="Téléphone / WhatsApp" value={f.phone} onChangeText={set('phone')} keyboardType="phone-pad" autoComplete="tel" />
      <Field label="Email (facultatif)" value={f.email} onChangeText={set('email')} keyboardType="email-address" autoCapitalize="none" />
      <Field label="Lieu de livraison" placeholder="Vide = retrait en boutique" value={f.address} onChangeText={set('address')} />
      <DateField label="Livrer le" value={f.date} onChange={set('date')} min={todayIso()} clearable placeholder="À convenir" />

      <Toggle value={gift} onChange={setGift} label="C’est un cadeau" hint="Pour quelqu’un d’autre que vous" icon={Gift} />
      {gift && (
        <View className="mb-4 rounded-2xl bg-lilac/40 p-4">
          <Field label="Pour qui ?" placeholder="Prénom du destinataire" value={f.recipient} onChangeText={set('recipient')} />
          <Toggle value={surprise} onChange={setSurprise} label="C’est une surprise" hint="La boutique ne révèlera pas qui l’offre" />
          <Field label="Message sur la carte (facultatif)" multiline value={f.message} onChangeText={set('message')} className="mb-0" />
        </View>
      )}
      {product.wrap_available && (
        <Toggle value={wrap} onChange={setWrap} icon={Ribbon} label="Emballage cadeau"
          hint={product.wrap_price ? `La boutique emballe l’article · +${formatPrice(product.wrap_price)}` : 'La boutique emballe l’article · offert'} />
      )}

      <View className="mb-3 flex-row items-center justify-between rounded-2xl bg-ink p-4">
        <Text className="font-body text-[13px] text-white/70">Total</Text>
        <Text className="font-display text-[28px] text-white">{formatPrice(total)}</Text>
      </View>
      <Txt className="mb-3 text-[12px] text-ink/55">Le paiement se règle directement avec la boutique, qui vous contacte après la commande.</Txt>
      <ErrorText text={err} />
      <Button variant="candy" loading={loading} title="Envoyer la commande" onPress={submit} />
    </View>
  );
}
