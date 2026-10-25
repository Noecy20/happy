/**
 * Carte d'invitation dans une enveloppe qui s'ouvre (lien invités uniquement).
 * - Fermée : enveloppe à la couleur du thème, cachet champagne, « Touchez pour ouvrir l'invitation ».
 * - Au toucher : l'enveloppe glisse vers le bas et disparaît, la carte monte avec un effet ressort.
 * La carte affiche date, heure, lieu (avec lien vers la carte), dress code et infos pratiques.
 */
import { CalendarDays, Clock, MailOpen, MapPin, Shirt } from 'lucide-react-native';
import { useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import Animated, { FadeOutDown, SlideInDown, useReducedMotion } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { colors, shadow } from '@/lib/theme';
import { formatLongDate, readableOn } from '@/lib/utils';
import { Button, InfoRow } from './ui';

type Props = {
  name: string; age?: number; color: string; date: string; time?: string | null;
  place?: string | null; details?: string | null; dressCode?: string | null;
};

export default function Invitation({ name, age, color, date, time, place, details, dressCode }: Props) {
  const [open, setOpen] = useState(false);
  const reduce = useReducedMotion();
  const ink = readableOn(color);
  const iconColor = ink === '#fff' ? color : colors.ink;

  if (!open)
    return (
      <Animated.View exiting={reduce ? undefined : FadeOutDown.duration(350)}>
        <Pressable onPress={() => setOpen(true)} accessibilityRole="button" accessibilityLabel="Ouvrir l’invitation"
          className="aspect-[3/2] w-full overflow-hidden rounded-[22px]" style={[{ backgroundColor: color }, shadow.pop]}>
          {/* rabats de l'enveloppe */}
          <Svg width="100%" height="100%" viewBox="0 0 300 200" preserveAspectRatio="none" style={{ position: 'absolute' }}>
            <Path d="M0 200 L150 95 L300 200Z" fill="#000" opacity={0.08} />
            <Path d="M0 0 L150 120 L300 0Z" fill="#fff" opacity={0.16} />
            <Path d="M0 0 L150 120 L300 0" fill="none" stroke="#000" strokeOpacity={0.1} />
          </Svg>
          {/* cachet de cire champagne */}
          <View className="absolute left-0 right-0 items-center" style={{ top: '45%' }}>
            <View className="h-20 w-20 items-center justify-center rounded-full border-4 border-white/40 bg-mango" style={shadow.pop}>
              <MailOpen size={28} color="#fff" />
            </View>
          </View>
          <Text className="absolute bottom-5 left-0 right-0 text-center font-bold2 text-[14px]" style={{ color: ink }}>
            Touchez pour ouvrir l’invitation
          </Text>
        </Pressable>
      </Animated.View>
    );

  return (
    <Animated.View entering={reduce ? undefined : SlideInDown.springify().damping(16).delay(150)} style={[shadow.pop, { borderRadius: 28 }]}>
     <View className="overflow-hidden rounded-[28px] border border-ink/[0.07] bg-white px-6 py-8">
      <View className="absolute left-0 right-0 top-0 h-2" style={{ backgroundColor: color }} />
      <Text className="text-center font-bold2 text-[11px] uppercase tracking-[3px] text-ink/45">Vous êtes invité(e)</Text>
      <Text className="mt-4 text-center font-display text-[38px] leading-[40px] text-ink">
        {age ? `Les ${age} ans\nde ${name}` : `L’anniversaire\nde ${name}`}
      </Text>
      <View className="my-6 h-px w-16 self-center bg-ink/15" />
      <InfoRow icon={CalendarDays} color={iconColor} text={formatLongDate(date)} />
      {!!time && <InfoRow icon={Clock} color={iconColor} text={time} />}
      {!!place && <InfoRow icon={MapPin} color={iconColor} text={place} />}
      {!!dressCode && <InfoRow icon={Shirt} color={iconColor} text={`Dress code : ${dressCode}`} />}
      {!!details && <Text className="mt-4 rounded-2xl bg-lilac/50 p-4 font-body text-[14px] leading-[20px] text-ink/75">{details}</Text>}
      {!!place && (
        <Button variant="ghost" small icon={MapPin} title="Voir sur la carte" className="mt-5 self-center"
          onPress={() => Linking.openURL(`https://www.google.com/maps/search/${encodeURIComponent(place)}`)} />
      )}
     </View>
    </Animated.View>
  );
}
