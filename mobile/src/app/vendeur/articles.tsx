/**
 * Onglet « Articles » : catalogue de la boutique.
 * Ajouter, modifier, inventaire (stock réel + historique), masquer/afficher, supprimer.
 * Les articles d'une boutique en attente sont enregistrés mais visibles seulement après validation.
 */
import { Image } from 'expo-image';
import { Boxes, Eye, EyeOff, Package, Pencil, Plus, Ribbon, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { GiftPlaceholder } from '@/components/Illustrations';
import { Badge, Button, Empty, Loading, Screen, Sheet, Title } from '@/components/ui';
import ProductForm from '@/components/vendor/ProductForm';
import StockForm from '@/components/vendor/StockForm';
import { supabase } from '@/lib/supabase';
import { shadow } from '@/lib/theme';
import type { Product } from '@/lib/types';
import { formatPrice } from '@/lib/utils';
import { useFx } from '@/providers/FxProvider';
import { useVendor } from '@/providers/VendorProvider';

export default function Articles() {
  const v = useVendor();
  const fx = useFx();
  const [modal, setModal] = useState<{ open: boolean; p?: Product }>({ open: false });
  const [stock, setStock] = useState<Product | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  if (v.loading) return <Loading />;
  if (!v.vendor) return null;

  const remove = (p: Product) => Alert.alert('Supprimer cet article ?', `« ${p.name} » sera supprimé.`, [
    { text: 'Annuler', style: 'cancel' },
    { text: 'Supprimer', style: 'destructive', onPress: async () => {
      const { error } = await supabase.from('products').delete().eq('id', p.id);
      if (error) fx.toast(error.message, 'err'); else { fx.toast('Article supprimé'); v.reload(); }
    } },
  ]);

  return (
    <Screen onRefresh={async () => { setRefreshing(true); await v.reload(); setRefreshing(false); }} refreshing={refreshing}>
      <View className="mb-5 mt-4 flex-row items-end justify-between">
        <Title>Mes articles</Title>
        <Button small variant="candy" icon={Plus} title="Ajouter" onPress={() => setModal({ open: true })} />
      </View>
      {v.products.length === 0 && <Empty icon={Package} text="Ajoutez vos articles : les célébrants pourront les mettre dans leur liste, et tout le monde pourra les commander." />}
      {v.products.map((p) => (
        <View key={p.id} className="mb-5 overflow-hidden rounded-[24px] border border-ink/[0.07] bg-white" style={[shadow.sm, { opacity: p.active ? 1 : 0.6 }]}>
          <View className="aspect-[4/3] bg-lilac">
            {p.image_url ? <Image source={{ uri: p.image_url }} style={{ width: '100%', height: '100%' }} contentFit="cover" /> : <GiftPlaceholder seed={p.id} />}
          </View>
          <View className="p-5">
            {!!p.category_id && <Text className="font-bold2 text-[12px] text-candy">{v.categories.find((c) => c.id === p.category_id)?.name}</Text>}
            <Text className="font-display text-[24px] leading-[26px] text-ink">{p.name}</Text>
            <Text className="mt-1 font-bold2 text-[14px] text-ink">{formatPrice(p.price)}</Text>
            <View className="mt-2 flex-row flex-wrap gap-1.5">
              <Badge tone={p.stock == null ? 'muted' : p.stock > 0 ? 'mint' : 'candy'} label={p.stock == null ? 'Stock non suivi' : p.stock > 0 ? `${p.stock} en stock` : 'Rupture'} />
              {p.wrap_available && <Badge tone="gold" icon={Ribbon} label={`Emballage ${p.wrap_price ? formatPrice(p.wrap_price) : 'offert'}`} />}
              {(p.options || []).map((o) => <Badge key={o.name} label={`${o.name} : ${o.values.join(', ')}`} />)}
              {!p.active && <Badge tone="muted" icon={EyeOff} label="Masqué" />}
            </View>
            {!!p.description && <Text className="mt-2 font-body text-[13px] text-ink/60" numberOfLines={2}>{p.description}</Text>}
            <View className="mt-4 flex-row flex-wrap gap-2">
              <Button small variant="ghost" icon={Pencil} title="Modifier" onPress={() => setModal({ open: true, p })} />
              <Button small variant="ghost" icon={Boxes} title="Inventaire" onPress={() => setStock(p)} />
              <Button small variant="ghost" icon={p.active ? EyeOff : Eye} title={p.active ? 'Masquer' : 'Afficher'}
                onPress={async () => { await supabase.from('products').update({ active: !p.active }).eq('id', p.id); v.reload(); }} />
              <Button small variant="danger" icon={Trash2} title="Supprimer" onPress={() => remove(p)} />
            </View>
          </View>
        </View>
      ))}

      <Sheet open={modal.open} onClose={() => setModal({ open: false })} title={modal.p ? 'Modifier l’article' : 'Nouvel article'}>
        <ProductForm key={modal.p?.id || 'new'} vendorId={v.vendor.id} product={modal.p} categories={v.categories}
          onSaved={() => { setModal({ open: false }); fx.toast('Article enregistré'); v.reload(); }} />
      </Sheet>
      <Sheet open={!!stock} onClose={() => setStock(null)} title="Inventaire">
        {stock && <StockForm product={stock} onSaved={() => { setStock(null); fx.toast('Stock mis à jour'); v.reload(); }} />}
      </Sheet>
    </Screen>
  );
}
