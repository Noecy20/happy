/**
 * Onglet « Invités » : réponses à l'invitation (table rsvps, lisible uniquement par le célébrant).
 * Totaux : personnes attendues (somme des « oui »), oui, peut-être, non ; puis la liste détaillée.
 */
import { Linking, Pressable, Text, View } from 'react-native';
import { useState } from 'react';
import { PartyPopper, Users } from 'lucide-react-native';
import { Badge, Card, Empty, Loading, Screen, Stat, Title, Txt } from '@/components/ui';
import { colors } from '@/lib/theme';
import { waLink } from '@/lib/utils';
import { useCelebrant } from '@/providers/CelebrantProvider';

export default function Guests() {
  const c = useCelebrant();
  const [refreshing, setRefreshing] = useState(false);
  if (c.loading) return <Loading />;
  const accent = c.event?.theme_color || colors.candy;
  const yes = c.rsvps.filter((r) => r.attending === 'oui');
  const maybe = c.rsvps.filter((r) => r.attending === 'peut-etre');
  const no = c.rsvps.filter((r) => r.attending === 'non');
  const people = yes.reduce((a, r) => a + (r.guests || 1), 0);

  return (
    <Screen onRefresh={async () => { setRefreshing(true); await c.reload(); setRefreshing(false); }} refreshing={refreshing}>
      <Title className="mt-4">Réponses à l’invitation</Title>
      {!c.event?.has_party ? (
        <View className="mt-6"><Empty icon={PartyPopper} text="Activez « J’organise une fête » dans Personnaliser pour envoyer une invitation et recevoir des réponses." /></View>
      ) : (
        <>
          <View className="mt-5 flex-row flex-wrap gap-3">
            <Stat value={people} label="Personnes attendues" highlight color={accent === '#F7F5F2' ? colors.ink : accent} />
            <Stat value={yes.length} label="Oui" />
            <Stat value={maybe.length} label="Peut-être" />
            <Stat value={no.length} label="Non" />
          </View>
          {c.rsvps.length === 0 ? (
            <View className="mt-6"><Empty icon={Users} text="Aucune réponse pour le moment. Partagez le lien invités." /></View>
          ) : (
            <Card className="mt-5 p-2">
              {c.rsvps.map((r, i) => (
                <View key={r.id} className={`px-3 py-3 ${i ? 'border-t border-ink/[0.06]' : ''}`}>
                  <View className="flex-row flex-wrap items-center gap-2">
                    <Text className="font-bold2 text-[14px] text-ink">{r.name}</Text>
                    <Badge tone={r.attending === 'oui' ? 'mint' : r.attending === 'non' ? 'muted' : 'gold'}
                      label={r.attending === 'oui' ? `Oui · ${r.guests} pers.` : r.attending === 'non' ? 'Non' : 'Peut-être'} />
                  </View>
                  {!!r.phone && (
                    <Pressable onPress={() => Linking.openURL(waLink(r.phone!))} className="min-h-[32px] justify-center">
                      <Text className="font-body text-[13px] text-ink/55 underline">{r.phone}</Text>
                    </Pressable>
                  )}
                  {!!r.message && <Txt className="text-[13px] text-ink/60">« {r.message} »</Txt>}
                </View>
              ))}
            </Card>
          )}
        </>
      )}
    </Screen>
  );
}
