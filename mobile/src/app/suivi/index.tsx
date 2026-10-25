/**
 * « Suivre une commande » : saisie du code à 8 caractères,
 * + raccourcis vers les commandes déjà passées depuis ce téléphone.
 */
import { router } from 'expo-router';
import { ChevronRight, Package } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import TopBar from '@/components/TopBar';
import { Button, Field, Label, Screen, Title, Txt } from '@/components/ui';
import { readMyOrders } from '@/lib/memory';
import { colors } from '@/lib/theme';

export default function SuiviSearch() {
  const [code, setCode] = useState('');
  const [mine, setMine] = useState<string[]>([]);
  useEffect(() => { readMyOrders().then(setMine); }, []);
  const go = (c: string) => c.trim() && router.push(`/suivi/${c.trim().toUpperCase()}`);

  return (
    <Screen>
      <TopBar />
      <Package size={40} color={colors.ink} />
      <Title className="mt-4">Suivre ma commande</Title>
      <Txt className="mb-6 mt-2 text-ink/70">Saisissez le code reçu après avoir réservé un cadeau ou passé une commande.</Txt>
      <Field value={code} onChangeText={setCode} placeholder="EX. 4F2A9C1B" autoCapitalize="characters" maxLength={8}
        accessibilityLabel="Code de suivi" inputClassName="font-bold2 text-[18px] tracking-[4px]" onSubmitEditing={() => go(code)} returnKeyType="search" />
      <Button title="Suivre" onPress={() => go(code)} />
      {mine.length > 0 && (
        <View className="mt-8">
          <Label>Mes commandes sur ce téléphone</Label>
          {mine.map((c) => (
            <Pressable key={c} onPress={() => go(c)} className="mb-2 min-h-[52px] flex-row items-center justify-between rounded-2xl border border-ink/10 bg-white px-4">
              <Text className="font-bold2 tracking-[3px] text-ink">{c}</Text><ChevronRight size={18} color={colors.muted} />
            </Pressable>
          ))}
        </View>
      )}
    </Screen>
  );
}
