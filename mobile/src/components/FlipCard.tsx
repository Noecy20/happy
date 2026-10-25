/**
 * Révélation : carte emballée qui se retourne au toucher pour montrer qui a offert le cadeau.
 * Face avant : papier cadeau + ruban + nom du cadeau. Face arrière : nom de l'ami et son petit mot.
 * Rotation 3D sur l'axe Y avec un ressort ; chaque face est masquée quand elle est de dos.
 */
import { useRef } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { interpolate, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { colors, shadow } from '@/lib/theme';
import type { GiftItem } from '@/lib/types';
import WrapPaper from './WrapPaper';

/** Occupe tout le conteneur (les deux faces sont superposées). */
const FILL = { position: 'absolute' as const, top: 0, left: 0, right: 0, bottom: 0 };

export default function FlipCard({ gift, accent, onFirstFlip }: { gift: GiftItem; accent: string; onFirstFlip?: () => void }) {
  const reduce = useReducedMotion();
  const rot = useSharedValue(0); // 0 = face avant, 180 = face arrière
  const flipped = useRef(false); // confettis seulement à la première ouverture

  const front = useAnimatedStyle(() => ({
    transform: [{ perspective: 1000 }, { rotateY: `${rot.value}deg` }],
    opacity: interpolate(rot.value, [89, 90], [1, 0], 'clamp'),
  }));
  const back = useAnimatedStyle(() => ({
    transform: [{ perspective: 1000 }, { rotateY: `${rot.value + 180}deg` }],
    opacity: interpolate(rot.value, [89, 90], [0, 1], 'clamp'),
  }));

  const toggle = () => {
    const to = rot.value < 90 ? 180 : 0;
    if (to === 180 && !flipped.current) { flipped.current = true; onFirstFlip?.(); }
    rot.value = reduce ? withTiming(to, { duration: 1 }) : withSpring(to, { stiffness: 90, damping: 14 });
  };

  return (
    <Pressable onPress={toggle} accessibilityRole="button" accessibilityLabel={`Révéler ${gift.name}`} className="mb-4 h-56">
      <Animated.View style={[FILL, { backfaceVisibility: 'hidden' }, front]}>
        <View className="flex-1 overflow-hidden rounded-3xl border border-ink/10">
          <WrapPaper color={accent} />
          <View className="absolute bottom-3 left-3 right-3 rounded-full border border-ink/10 bg-white px-3 py-1.5">
            <Text className="font-bold2 text-[14px] text-ink" numberOfLines={1}>{gift.name}</Text>
          </View>
        </View>
      </Animated.View>
      <Animated.View style={[FILL, { backfaceVisibility: 'hidden', borderRadius: 24 }, back, shadow.sm]}>
        <View className="flex-1 justify-center rounded-3xl border border-ink/10 bg-white p-5">
          <Text className="font-semi text-[12px] text-ink/55">{gift.name}</Text>
          <Text className="mt-1 font-display text-[28px] leading-[30px]" style={{ color: colors.ink }}>{gift.friend_name || 'Un proche'}</Text>
          {!!gift.friend_message && <Text className="mt-3 font-body text-[14px] italic leading-[20px] text-ink/75">« {gift.friend_message} »</Text>}
        </View>
      </Animated.View>
    </Pressable>
  );
}
