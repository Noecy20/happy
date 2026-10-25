/**
 * Ajout / modification d'un cadeau de la liste (table `gifts`).
 * Deux sources :
 * 1. « Article d'une boutique » : choix de la boutique → de l'article (stock affiché) → des variantes (taille, couleur…).
 *    Le cadeau reprend nom, prix, photo, vendor_id, product_id et les variantes choisies (`options`).
 * 2. « Autre cadeau » (libre) : photo, nom, prix, détails, contact du vendeur, lien.
 * Un cadeau déjà réservé n'est plus modifiable (le bouton n'est pas proposé).
 */
import { Image } from 'expo-image';
import { Gift, Store } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import ImageField from '@/components/ImageField';
import { Button, ErrorText, Field, Label, Pills, Segmented, cn } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { colors } from '@/lib/theme';
import type { GiftItem, Product, Vendor } from '@/lib/types';
import { formatPrice } from '@/lib/utils';

export default function GiftForm({ eventId, vendors, gift, position, onSaved }: {
  eventId: string; vendors: Vendor[]; gift?: GiftItem; position: number; onSaved: () => void;
}) {
  const [source, setSource] = useState<'boutique' | 'libre'>(gift ? (gift.product_id ? 'boutique' : 'libre') : vendors.length ? 'boutique' : 'libre');
  const [vendorId, setVendorId] = useState<string>(gift?.vendor_id || '');
  const [products, setProducts] = useState<Product[]>([]);
  const [productId, setProductId] = useState<string>(gift?.product_id || '');
  const [choice, setChoice] = useState<Record<string, string>>(gift?.options || {});
  const [f, setF] = useState({
    name: gift?.name || '', description: gift?.description || '', price: gift?.price ? String(gift.price) : '',
    external_contact: gift?.external_contact || '', product_link: gift?.product_link || '', image_url: gift?.image_url || '',
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const set = (k: keyof typeof f) => (v: string) => setF((x) => ({ ...x, [k]: v }));

  // Articles actifs de la boutique choisie
  useEffect(() => {
    if (!vendorId) { setProducts([]); return; }
    supabase.from('products').select('id,vendor_id,name,description,price,image_url,stock,options,active,wrap_available,wrap_price')
      .eq('vendor_id', vendorId).eq('active', true).order('name')
      .then(({ data }) => setProducts((data as Product[]) || []));
  }, [vendorId]);

  const product = products.find((x) => x.id === productId);
  const variants = (product?.options || []).filter((o) => o.values?.length);

  const save = async () => {
    setErr('');
    let payload: Record<string, any>;
    if (source === 'boutique') {
      if (!product) return setErr('Choisissez un article.');
      const missing = variants.find((o) => !choice[o.name]);
      if (missing) return setErr(`Choisissez : ${missing.name}`);
      payload = {
        name: product.name, price: product.price ?? null, image_url: product.image_url ?? null,
        vendor_id: product.vendor_id, product_id: product.id, options: choice,
        description: f.description.trim() || product.description || null, external_contact: null, product_link: null,
      };
    } else {
      if (!f.name.trim()) return setErr('Donnez un nom au cadeau.');
      payload = {
        name: f.name.trim(), description: f.description.trim() || null, price: f.price ? Number(f.price) : null,
        vendor_id: null, product_id: null, options: {}, external_contact: f.external_contact.trim() || null,
        product_link: f.product_link.trim() || null, image_url: f.image_url || null,
      };
    }
    setSaving(true);
    const { error } = gift
      ? await supabase.from('gifts').update(payload).eq('id', gift.id)
      : await supabase.from('gifts').insert({ ...payload, event_id: eventId, position });
    setSaving(false);
    if (error) return setErr(error.message);
    onSaved();
  };

  return (
    <View>
      <Segmented value={source} onChange={setSource} options={[
        { key: 'boutique', label: 'Article d’une boutique', icon: Store },
        { key: 'libre', label: 'Autre cadeau', icon: Gift },
      ]} />

      {source === 'boutique' ? (
        <>
          {vendors.length === 0 ? (
            <Text className="mb-4 rounded-2xl bg-lilac/50 p-4 font-body text-[14px] text-ink">Aucune boutique n’est encore en ligne. Ajoutez un « Autre cadeau ».</Text>
          ) : (
            <>
              <Label>Boutique</Label>
              <Pills className="mb-4" value={vendorId} onChange={(v) => { setVendorId(v); setProductId(''); setChoice({}); }}
                options={vendors.map((v) => ({ key: v.id, label: v.name }))} />
            </>
          )}
          {!!vendorId && (products.length === 0
            ? <Text className="mb-4 font-body text-[14px] text-ink/55">Cette boutique n’a pas encore d’article.</Text>
            : (
              <View className="mb-4 gap-2">
                <Label>Article</Label>
                {products.map((p) => {
                  const on = productId === p.id;
                  return (
                    <Pressable key={p.id} onPress={() => { setProductId(p.id); setChoice({}); }} accessibilityState={{ selected: on }}
                      className={cn('flex-row items-center rounded-2xl border p-2.5', on ? 'border-candy bg-candy/5' : 'border-ink/10 bg-white')}>
                      <View className="h-14 w-14 items-center justify-center overflow-hidden rounded-xl bg-lilac">
                        {p.image_url ? <Image source={{ uri: p.image_url }} style={{ width: '100%', height: '100%' }} /> : <Gift size={22} color={colors.candy} />}
                      </View>
                      <View className="ml-3 flex-1">
                        <Text className="font-bold2 text-[14px] text-ink" numberOfLines={1}>{p.name}</Text>
                        <Text className="font-body text-[13px] text-ink/60">{formatPrice(p.price)}</Text>
                        {p.stock != null && <Text className={`font-bold2 text-[12px] ${p.stock > 0 ? 'text-mint' : 'text-candy'}`}>{p.stock > 0 ? `${p.stock} en stock` : 'Rupture de stock'}</Text>}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            ))}
          {variants.map((o) => (
            <View key={o.name} className="mb-4">
              <Label>{o.name}</Label>
              <Pills value={choice[o.name]} onChange={(v) => setChoice({ ...choice, [o.name]: v })} options={o.values.map((v) => ({ key: v, label: v }))} />
            </View>
          ))}
          <Field label="Précisions (facultatif)" value={f.description} onChangeText={set('description')} />
        </>
      ) : (
        <>
          <ImageField value={f.image_url} onChange={set('image_url')} prefix="cadeau" />
          <Field label="Nom du cadeau" value={f.name} onChangeText={set('name')} />
          <Field label="Prix (FCFA)" keyboardType="number-pad" value={f.price} onChangeText={(v) => set('price')(v.replace(/\D/g, ''))} />
          <Field label="Détails" multiline value={f.description} onChangeText={set('description')} />
          <Field label="Où l’acheter (contact du vendeur)" placeholder="Nom, téléphone, adresse" value={f.external_contact} onChangeText={set('external_contact')} />
          <Field label="Lien du produit (facultatif)" placeholder="https://…" keyboardType="url" autoCapitalize="none" value={f.product_link} onChangeText={set('product_link')} />
        </>
      )}

      <ErrorText text={err} />
      <Button variant="candy" loading={saving} title={gift ? 'Enregistrer' : 'Ajouter à ma liste'} onPress={save} />
    </View>
  );
}
