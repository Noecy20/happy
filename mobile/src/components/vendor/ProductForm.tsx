/**
 * Création / modification d'un article de la boutique (table `products`).
 * - Photo, nom, prix, description.
 * - Catégorie : choisir une catégorie existante OU en créer une nouvelle dans le même formulaire
 *   (insertion dans product_categories, sans doublon grâce à l'index unique vendor_id + lower(name)).
 * - Variantes : groupes « nom + valeurs séparées par des virgules » → [{ name, values[] }].
 * - Stock : suivi oui/non ; quantité initiale à la création (ensuite elle passe par l'Inventaire).
 * - Emballage cadeau possible + son prix (0 = offert).
 */
import { Plus, X } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import ImageField from '@/components/ImageField';
import { Button, ErrorText, Field, Label, Pills, Toggle } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { colors } from '@/lib/theme';
import type { Category, Product } from '@/lib/types';

const NEW = '__new';

export default function ProductForm({ vendorId, product, categories, onSaved }: {
  vendorId: string; product?: Product; categories: Category[]; onSaved: () => void;
}) {
  const [f, setF] = useState({
    name: product?.name || '', price: product?.price ? String(product.price) : '', description: product?.description || '',
    image_url: product?.image_url || '', category_id: product?.category_id || '', new_category: '',
    track: product ? product.stock != null : true, stock: product?.stock != null ? String(product.stock) : '1',
    wrap: product?.wrap_available || false, wrap_price: product?.wrap_price ? String(product.wrap_price) : '',
  });
  const [options, setOptions] = useState<{ name: string; values: string }[]>(
    (product?.options || []).map((o) => ({ name: o.name, values: o.values.join(', ') })),
  );
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const set = (k: keyof typeof f) => (v: any) => setF((x) => ({ ...x, [k]: v }));
  const digits = (k: keyof typeof f) => (v: string) => set(k)(v.replace(/\D/g, ''));

  const save = async () => {
    setErr('');
    if (!f.name.trim() || !f.price) return setErr('Le nom et le prix sont obligatoires.');
    setSaving(true);

    // 1. Catégorie : existante, nouvelle, ou aucune
    let category_id: string | null = f.category_id && f.category_id !== NEW ? f.category_id : null;
    if (f.category_id === NEW && f.new_category.trim()) {
      const name = f.new_category.trim();
      const existing = categories.find((c) => c.name.toLowerCase() === name.toLowerCase());
      if (existing) category_id = existing.id;
      else {
        const { data, error } = await supabase.from('product_categories').insert({ vendor_id: vendorId, name }).select('id').single();
        if (error) { setSaving(false); return setErr(error.message); }
        category_id = data.id;
      }
    }

    // 2. Article
    const payload: Record<string, any> = {
      name: f.name.trim(), price: Number(f.price), description: f.description.trim() || null, image_url: f.image_url || null,
      category_id, wrap_available: f.wrap, wrap_price: f.wrap && f.wrap_price ? Number(f.wrap_price) : null,
      options: options.filter((o) => o.name.trim() && o.values.trim())
        .map((o) => ({ name: o.name.trim(), values: o.values.split(',').map((v) => v.trim()).filter(Boolean) })),
    };
    // À la création, le stock initial est saisi ici ; ensuite il passe par l'inventaire (vendor_set_stock)
    if (!product) payload.stock = f.track ? Math.max(0, Number(f.stock) || 0) : null;
    else if (!f.track && product.stock != null) payload.stock = null;
    else if (f.track && product.stock == null) payload.stock = Math.max(0, Number(f.stock) || 0);

    const { error } = product
      ? await supabase.from('products').update(payload).eq('id', product.id)
      : await supabase.from('products').insert({ ...payload, vendor_id: vendorId });
    setSaving(false);
    if (error) return setErr(error.message);
    onSaved();
  };

  return (
    <View>
      <ImageField value={f.image_url} onChange={set('image_url')} label="Photo de l’article" prefix="article" />
      <Field label="Nom de l’article" value={f.name} onChangeText={set('name')} />
      <Field label="Prix (FCFA)" keyboardType="number-pad" value={f.price} onChangeText={digits('price')} />

      <Label>Catégorie</Label>
      <Pills className="mb-3" value={f.category_id} onChange={set('category_id')}
        options={[{ key: '', label: 'Sans catégorie' }, ...categories.map((c) => ({ key: c.id, label: c.name })), { key: NEW, label: 'Nouvelle catégorie' }]} />
      {f.category_id === NEW && <Field label="Nom de la catégorie" placeholder="Robes, Parfums homme…" value={f.new_category} onChangeText={set('new_category')} />}
      <Field label="Description" multiline placeholder="Matière, délai de fabrication…" value={f.description} onChangeText={set('description')} />

      {/* Variantes */}
      <View className="mb-4 rounded-3xl border border-ink/[0.08] p-4">
        <Text className="font-bold2 text-[14px] text-ink">Variantes disponibles</Text>
        <Text className="mb-3 mt-1 font-body text-[12px] text-ink/55">Ex. : Taille → S, M, L · Couleur → Rouge, Noir. Le client choisit au moment de commander.</Text>
        {options.map((o, i) => (
          <View key={i} className="mb-2 flex-row items-center gap-2">
            <TextInput placeholder="Taille" value={o.name} placeholderTextColor="rgba(30,20,40,0.35)"
              onChangeText={(t) => setOptions(options.map((x, j) => (j === i ? { ...x, name: t } : x)))}
              className="min-h-[46px] w-24 rounded-2xl border border-ink/10 bg-white px-3 font-body text-[14px] text-ink" />
            <TextInput placeholder="S, M, L, XL" value={o.values} placeholderTextColor="rgba(30,20,40,0.35)"
              onChangeText={(t) => setOptions(options.map((x, j) => (j === i ? { ...x, values: t } : x)))}
              className="min-h-[46px] flex-1 rounded-2xl border border-ink/10 bg-white px-3 font-body text-[14px] text-ink" />
            <Pressable accessibilityLabel="Retirer la variante" onPress={() => setOptions(options.filter((_, j) => j !== i))}
              className="h-11 w-11 items-center justify-center rounded-full border border-ink/10 bg-white"><X size={15} color={colors.ink} /></Pressable>
          </View>
        ))}
        <Button small variant="ghost" icon={Plus} title="Ajouter une variante" className="mt-1 self-start" onPress={() => setOptions([...options, { name: '', values: '' }])} />
      </View>

      {/* Stock */}
      <Toggle value={f.track} onChange={set('track')} label="Suivre le stock" hint="La quantité baisse à chaque commande validée." />
      {f.track && (!product || product.stock == null) && <Field label="Quantité disponible" keyboardType="number-pad" value={f.stock} onChangeText={digits('stock')} />}
      {f.track && product && product.stock != null && <Text className="-mt-2 mb-4 font-body text-[12px] text-ink/55">{product.stock} en stock. Pour le modifier, utilisez le bouton Inventaire.</Text>}

      {/* Emballage */}
      <Toggle value={f.wrap} onChange={set('wrap')} label="Je peux l’emballer en cadeau" />
      {f.wrap && <Field label="Prix de l’emballage (0 = offert)" keyboardType="number-pad" value={f.wrap_price} onChangeText={digits('wrap_price')} />}

      <ErrorText text={err} />
      <Button variant="candy" loading={saving} title="Enregistrer l’article" onPress={save} />
    </View>
  );
}
