/**
 * Inventaire d'un article : la boutique compte ce qu'elle a réellement et saisit le total
 * (RPC vendor_set_stock, qui enregistre aussi un mouvement « inventaire »).
 * Affiche l'historique des derniers mouvements (ventes, annulations, inventaires).
 */
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { Button, ErrorText, Field, Label } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import type { Product } from '@/lib/types';

export default function StockForm({ product, onSaved }: { product: Product; onSaved: () => void }) {
  const [stock, setStock] = useState(product.stock != null ? String(product.stock) : '0');
  const [note, setNote] = useState('');
  const [history, setHistory] = useState<any[]>([]);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    supabase.from('inventory_movements').select('*').eq('product_id', product.id).order('created_at', { ascending: false }).limit(10)
      .then(({ data }) => setHistory(data || []));
  }, [product.id]);

  const save = async () => {
    setBusy(true);
    const { error } = await supabase.rpc('vendor_set_stock', { p_product: product.id, p_stock: Math.max(0, Number(stock) || 0), p_note: note || null });
    setBusy(false);
    if (error) return setErr(error.message);
    onSaved();
  };

  return (
    <View>
      <Text className="mb-4 font-body text-[14px] leading-[20px] text-ink/65">
        <Text className="font-bold2 text-ink">{product.name}</Text> · stock actuel : {product.stock ?? 'non suivi'}. Comptez ce que vous avez réellement et saisissez le total.
      </Text>
      <Field label="Nouveau stock" keyboardType="number-pad" value={stock} onChangeText={(v) => setStock(v.replace(/\D/g, ''))} inputClassName="font-bold2 text-[18px]" />
      <Field label="Note" placeholder="Ex. réassort du 12/10" value={note} onChangeText={setNote} />
      <ErrorText text={err} />
      <Button variant="candy" loading={busy} title="Enregistrer l’inventaire" onPress={save} />
      {history.length > 0 && (
        <View className="mt-6">
          <Label>Derniers mouvements</Label>
          {history.map((h) => (
            <View key={h.id} className="flex-row justify-between border-b border-ink/5 py-2">
              <Text className="flex-1 pr-2 font-body text-[13px] text-ink">
                {h.kind === 'vente' ? 'Vente' : h.kind === 'annulation' ? 'Annulation' : 'Inventaire'}{h.note ? ` · ${h.note}` : ''}
              </Text>
              <Text className="font-semi text-[13px] text-ink">{h.quantity > 0 ? '+' : ''}{h.quantity} → {h.stock_after ?? '—'}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
