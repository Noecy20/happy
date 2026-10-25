/**
 * Onglet « Ma liste » : les cadeaux du célébrant.
 * - Ajouter (article de boutique avec variantes, ou cadeau libre), modifier, retirer.
 * - Un cadeau réservé apparaît emballé et n'est plus modifiable ; le célébrant ne voit jamais qui l'a pris.
 * - Après l'anniversaire (révélation), on n'ajoute plus de cadeau.
 */
import { Pencil, Plus, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import GiftForm from '@/components/celebrant/GiftForm';
import { Button, Loading, Screen, Sheet, Title, Txt } from '@/components/ui';
import WrappedCard from '@/components/WrappedCard';
import { supabase } from '@/lib/supabase';
import { colors } from '@/lib/theme';
import type { GiftItem } from '@/lib/types';
import { useCelebrant } from '@/providers/CelebrantProvider';
import { useFx } from '@/providers/FxProvider';

export default function MyList() {
  const c = useCelebrant();
  const fx = useFx();
  const [modal, setModal] = useState<{ open: boolean; gift?: GiftItem }>({ open: false });
  const [refreshing, setRefreshing] = useState(false);
  if (c.loading) return <Loading />;
  const accent = c.event?.theme_color || colors.candy;

  if (!c.event)
    return (
      <Screen>
        <Title className="mt-4">Ma liste</Title>
        <Txt className="mt-2 text-ink/65">Créez d’abord votre anniversaire dans l’onglet « Anniversaire ».</Txt>
      </Screen>
    );

  const remove = (g: GiftItem) =>
    Alert.alert('Retirer ce cadeau ?', `« ${g.name} » sera retiré de la liste.`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Retirer', style: 'destructive', onPress: async () => {
        const { error } = await supabase.from('gifts').delete().eq('id', g.id);
        if (error) fx.toast('Suppression impossible.', 'err'); else { fx.toast('Cadeau retiré'); c.reloadGifts(); }
      } },
    ]);

  return (
    <Screen onRefresh={async () => { setRefreshing(true); await c.reloadGifts(); setRefreshing(false); }} refreshing={refreshing}>
      <View className="mb-5 mt-4 flex-row items-end justify-between">
        <Title>Ma liste</Title>
        {!c.revealed && <Button small icon={Plus} title="Ajouter" onPress={() => setModal({ open: true })} />}
      </View>

      {c.gifts.length === 0 ? (
        <Pressable onPress={() => setModal({ open: true })} className="items-center rounded-3xl border-2 border-dashed border-ink/15 p-12">
          <Plus size={36} color="rgba(30,20,40,0.35)" />
          <Text className="mt-3 font-semi text-[15px] text-ink">Ajoutez votre premier cadeau</Text>
          <Text className="mt-1 text-center font-body text-[13px] text-ink/55">Un article d’une boutique Happy, ou n’importe quel cadeau.</Text>
        </Pressable>
      ) : c.gifts.map((g) => (
        <WrappedCard key={g.id} gift={g} accent={accent}
          footer={!g.claimed ? (
            <View className="flex-row gap-2">
              <Button small variant="ghost" icon={Pencil} title="Modifier" className="flex-1" onPress={() => setModal({ open: true, gift: g })} />
              <Button small variant="ghost" icon={Trash2} title="Retirer" onPress={() => remove(g)} />
            </View>
          ) : null} />
      ))}

      <Sheet open={modal.open} onClose={() => setModal({ open: false })} title={modal.gift ? 'Modifier le cadeau' : 'Ajouter un cadeau'}>
        <GiftForm key={modal.gift?.id || 'new'} eventId={c.event.id} vendors={c.vendors} gift={modal.gift} position={c.gifts.length}
          onSaved={() => { setModal({ open: false }); c.reloadGifts(); fx.toast(modal.gift ? 'Cadeau modifié' : 'Cadeau ajouté'); }} />
      </Sheet>
    </Screen>
  );
}
