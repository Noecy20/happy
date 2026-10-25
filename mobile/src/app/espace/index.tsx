/**
 * Onglet « Anniversaire » du célébrant : le tableau de bord.
 * 1. Bandeau d'accès (non activé / en attente / actif / expiré).
 * 2. Sans anniversaire : formulaire de création.
 * 3. Avec anniversaire : carte (date, titre, âge, compte à rebours, gâteau animé), suivi « X / Y pris en charge »
 *    avec barre de progression, publication puis deux liens de partage, et la révélation après la fête.
 * La couleur de thème du célébrant remplace le rose Happy sur tout son espace.
 */
import { Lock, Palette, PartyPopper, Send } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Cake from '@/components/Cake';
import AccessBanner from '@/components/celebrant/AccessBanner';
import EventForm from '@/components/celebrant/EventForm';
import RequestSheet from '@/components/celebrant/RequestSheet';
import Countdown from '@/components/Countdown';
import FlipCard from '@/components/FlipCard';
import ShareLink from '@/components/ShareLink';
import { Badge, Button, Card, Loading, Screen, Sheet, Title, Txt } from '@/components/ui';
import { links } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { colors } from '@/lib/theme';
import { formatDate, formatLongDate, textAccentOf, withAlpha } from '@/lib/utils';
import { useAuth } from '@/providers/AuthProvider';
import { useCelebrant } from '@/providers/CelebrantProvider';
import { useFx } from '@/providers/FxProvider';

export default function CelebrantHome() {
  const { profile } = useAuth();
  const c = useCelebrant();
  const fx = useFx();
  const [editing, setEditing] = useState(false);
  const [request, setRequest] = useState<null | 'acces' | 'prolongation'>(null);
  const [publishing, setPublishing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  if (c.loading || !profile) return <Loading />;

  const ev = c.event;
  const accent = ev?.theme_color || colors.candy;
  const textAccent = textAccentOf(accent);
  const taken = c.gifts.filter((g) => g.claimed).length;
  const age = ev ? Number(ev.birthday_date.slice(0, 4)) - Number(ev.birth_date.slice(0, 4)) : 0;
  const askAccess = () => setRequest(profile.access_expires_at ? 'prolongation' : 'acces');

  /** Publication : refusée par la base (trigger prepare_event) si l'accès n'est pas actif. */
  const publish = async () => {
    const { data, error } = await supabase.from('events').update({ published: true }).eq('id', ev!.id).select().single();
    if (error) return fx.toast(error.message, 'err');
    c.setEvent(data as any); setPublishing(false);
    fx.confetti([accent, colors.mango, '#ffffff']); fx.toast('Liste publiée');
  };

  return (
    <Screen onRefresh={async () => { setRefreshing(true); await c.reload(); setRefreshing(false); }} refreshing={refreshing}>
      <Title className="mt-4 text-[40px]">Bonjour {profile.full_name?.split(' ')[0] || ''}</Title>
      <AccessBanner hasAccess={c.hasAccess} daysLeft={c.daysLeft} expires={profile.access_expires_at} pending={c.pending} onRequest={askAccess} />

      {!ev ? (
        <Card className="mt-6">
          <Title className="text-[30px]">Créez votre anniversaire</Title>
          <Txt className="mb-5 mt-1 text-ink/65">Votre date de naissance, vos couleurs, et la fête si vous en organisez une.</Txt>
          <EventForm userId={profile.id} defaultName={profile.full_name?.split(' ')[0]} onSaved={(e) => { c.setEvent(e); fx.toast('Anniversaire créé'); }} />
        </Card>
      ) : (
        <>
          {/* Carte de l'anniversaire */}
          <Card className="mt-6 overflow-hidden">
            <View pointerEvents="none" style={{ position: 'absolute', right: -80, top: -80, width: 220, height: 220, borderRadius: 110, backgroundColor: withAlpha(accent, 0.15) }} />
            <Txt className="font-semi text-[13px] text-ink/55">{formatLongDate(ev.birthday_date)}</Txt>
            <Title className="mt-1 text-[32px] leading-[34px]">{ev.title || `L’anniversaire de ${ev.celebrant_name}`}</Title>
            <Text className="mt-1 font-display text-[24px]" style={{ color: textAccent }}>{age} ans</Text>
            <View className="mt-4"><Countdown date={ev.birthday_date} color={textAccent} /></View>
            <View className="mt-4 items-center"><Cake age={age} color={accent} width={260} /></View>
            <View className="mt-3 flex-row flex-wrap gap-2">
              {!!ev.dress_code && (
                <View className="flex-row items-center rounded-full bg-lilac/60 px-3 py-1.5">
                  <View className="mr-2 h-4 w-4 rounded-full border border-ink/10" style={{ backgroundColor: accent }} />
                  <Text className="font-semi text-[12px] text-ink">{ev.dress_code}</Text>
                </View>
              )}
              {ev.has_party && <Badge icon={PartyPopper} label={`Fête${ev.party_date ? ` le ${formatDate(ev.party_date, { day: 'numeric', month: 'long' })}` : ''}${ev.party_place ? ` · ${ev.party_place}` : ''}`} />}
              <Badge tone={ev.published ? 'mint' : 'gold'} label={ev.published ? 'Liste publiée' : 'Brouillon'} />
            </View>
            <Button small variant="ghost" icon={Palette} title="Personnaliser" className="mt-4" onPress={() => setEditing(true)} />
          </Card>

          {/* Suivi des cadeaux + partage */}
          <Card className="mt-5">
            <Txt className="font-semi text-[13px] text-ink/55">Cadeaux pris en charge</Txt>
            <View className="mt-1 flex-row items-end">
              <Text className="font-display text-[56px] leading-[58px] text-ink">{taken}</Text>
              <Text className="mb-2 ml-2 font-semi text-[18px] text-ink/45">/ {c.gifts.length}</Text>
            </View>
            <Progress value={c.gifts.length ? taken / c.gifts.length : 0} color={accent} />
            <Txt className="mt-3 text-[13px] text-ink/55">
              {c.revealed ? 'La fête est passée : découvrez qui vous a gâté.' : 'Les noms restent secrets jusqu’au lendemain de votre anniversaire.'}
            </Txt>

            <View className="mt-5">
              {ev.published ? (
                c.hasAccess ? (
                  <>
                    {ev.has_party && (
                      <ShareLink label="Lien invités · avec la carte d’invitation" url={links.event(ev.invite_token)} previewPath={`/e/${ev.invite_token}`}
                        text="Tu es invité(e) à mon anniversaire ! Invitation et liste de cadeaux :" />
                    )}
                    <ShareLink label={ev.has_party ? 'Lien liste seule · sans invitation' : 'Lien de ma liste'} url={links.event(ev.share_token)}
                      previewPath={`/e/${ev.share_token}`} text="Ma liste d’anniversaire :" />
                  </>
                ) : (
                  <View className="flex-row items-center rounded-2xl bg-lilac p-3">
                    <Lock size={16} color={colors.candy} />
                    <Text className="ml-2 flex-1 font-semi text-[13px] text-candy">Lien expiré : vos amis ne peuvent plus l’ouvrir.</Text>
                  </View>
                )
              ) : c.hasAccess ? (
                <Button icon={Send} disabled={c.gifts.length === 0} color={accent} textColor={accent === '#F7F5F2' ? colors.ink : '#fff'}
                  title={c.gifts.length === 0 ? 'Ajoutez un cadeau pour publier' : 'Publier et obtenir le lien'} onPress={() => setPublishing(true)} />
              ) : (
                <Button variant="candy" icon={Lock} disabled={c.pending} onPress={askAccess}
                  title={c.pending ? 'Demande en cours de validation' : 'Demander l’accès pour publier'} />
              )}
            </View>
          </Card>

          {/* Révélation (le lendemain de l'anniversaire, get_my_gifts renvoie les noms) */}
          {c.revealed && taken > 0 && (
            <View className="mt-8">
              <Title className="text-[32px]">Qui vous a offert quoi</Title>
              <Txt className="mb-4 mt-1 text-ink/65">Touchez un cadeau pour l’ouvrir.</Txt>
              {c.gifts.filter((g) => g.claimed).map((g) => (
                <FlipCard key={g.id} gift={g} accent={accent} onFirstFlip={() => fx.confetti([accent, colors.mango, '#fff'])} />
              ))}
            </View>
          )}
        </>
      )}

      <Sheet open={editing} onClose={() => setEditing(false)} title="Personnaliser l’anniversaire">
        {ev && <EventForm userId={profile.id} event={ev} onSaved={(e) => { c.setEvent(e); setEditing(false); fx.toast('Modifications enregistrées'); }} />}
      </Sheet>

      <Sheet open={publishing} onClose={() => setPublishing(false)} title="Publier votre liste ?">
        <Txt className="leading-[22px] text-ink/70">
          Vous obtiendrez vos liens à partager. Après publication, le prénom et la date de naissance ne pourront plus être modifiés.
          {profile.access_expires_at ? ` Le lien restera actif jusqu’au ${formatDate(profile.access_expires_at)}.` : ''}
        </Txt>
        <View className="mt-6 flex-row gap-3">
          <Button variant="ghost" title="Pas encore" className="flex-1" onPress={() => setPublishing(false)} />
          <Button variant="candy" title="Publier" className="flex-1" onPress={publish} />
        </View>
      </Sheet>

      <RequestSheet kind={request} userId={profile.id} onClose={() => setRequest(null)}
        onSent={() => { setRequest(null); c.setPending(true); fx.toast('Demande envoyée à l’administrateur'); }} />
    </Screen>
  );
}

/** Barre de progression animée (remplissage en 1 seconde). */
function Progress({ value, color }: { value: number; color: string }) {
  const w = useSharedValue(0);
  useEffect(() => { w.value = withTiming(value, { duration: 1000 }); }, [value, w]);
  const style = useAnimatedStyle(() => ({ width: `${w.value * 100}%` }));
  return (
    <View className="mt-3 h-2.5 overflow-hidden rounded-full bg-lilac" accessibilityLabel={`${Math.round(value * 100)} % des cadeaux pris en charge`}>
      <Animated.View style={[{ height: '100%', borderRadius: 99, backgroundColor: color }, style]} />
    </View>
  );
}
