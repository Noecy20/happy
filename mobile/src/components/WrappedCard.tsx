/**
 * Carte cadeau. Quand un cadeau est réservé, il « s'emballe » sous nos yeux :
 * 1. le papier satiné descend du haut de la photo (0,75 s),
 * 2. le ruban vertical puis le ruban horizontal apparaissent,
 * 3. l'étiquette « Déjà réservé » (ou « Vous l'offrez ») surgit au centre.
 * Utilisée sur la page de l'ami, dans la liste du célébrant et la démo d'accueil.
 */
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { ExternalLink, Heart, Lock, Ribbon, Store } from 'lucide-react-native';
import { useEffect, type ReactNode } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import Animated, {
  Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withSpring, withTiming,
} from 'react-native-reanimated';
import { colors, shadow } from '@/lib/theme';
import type { GiftItem } from '@/lib/types';
import { formatPrice, readableOn } from '@/lib/utils';
import { GiftPlaceholder } from './Illustrations';
import { Badge, Button } from './ui';
import WrapPaper, { RibbonH, RibbonV } from './WrapPaper';

export default function WrappedCard({ gift, onClaim, mine = false, footer, closed = false, accent = colors.candy }: {
  gift: GiftItem; onClaim?: (g: GiftItem) => void; mine?: boolean; footer?: ReactNode; closed?: boolean; accent?: string;
}) {
  const reduce = useReducedMotion();
  const vendorName = gift.vendor?.name || gift.vendor_name;
  const vendorId = gift.vendor?.id || gift.vendor_id;
  const opts = Object.entries(gift.options || {});

  // Valeurs animées : papier, rubans, étiquette
  const paper = useSharedValue(0);
  const ribV = useSharedValue(0);
  const ribH = useSharedValue(0);
  const tag = useSharedValue(0);

  useEffect(() => {
    if (!gift.claimed) { paper.value = 0; ribV.value = 0; ribH.value = 0; tag.value = 0; return; }
    if (reduce) { paper.value = 1; ribV.value = 1; ribH.value = 1; tag.value = 1; return; }
    paper.value = withTiming(1, { duration: 750, easing: Easing.bezier(0.7, 0, 0.2, 1) });
    ribV.value = withDelay(550, withTiming(1, { duration: 400 }));
    ribH.value = withDelay(750, withTiming(1, { duration: 400 }));
    tag.value = withDelay(1000, withSpring(1, { stiffness: 260, damping: 18 }));
  }, [gift.claimed, reduce, paper, ribV, ribH, tag]);

  // Le papier « tombe » depuis le haut (transformOrigin en haut)
  const paperStyle = useAnimatedStyle(() => ({ transform: [{ scaleY: paper.value }], opacity: paper.value > 0 ? 1 : 0 }));
  const ribVStyle = useAnimatedStyle(() => ({ transform: [{ scaleY: ribV.value }] }));
  const ribHStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: ribH.value }] }));
  const tagStyle = useAnimatedStyle(() => ({ opacity: tag.value, transform: [{ scale: 0.6 + 0.4 * tag.value }] }));

  const canClaim = !!onClaim && !gift.claimed && !closed && gift.stock !== 0;

  return (
    <View className="mb-5 overflow-hidden rounded-[24px] border border-ink/[0.07] bg-white" style={shadow.sm}>
      {/* Photo ou illustration, recouverte du papier cadeau si réservé */}
      <View className="aspect-[4/3] overflow-hidden bg-lilac">
        {gift.image_url
          ? <Image source={{ uri: gift.image_url }} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={200} accessibilityLabel={gift.name} />
          : <GiftPlaceholder seed={gift.id} />}

        {gift.claimed && (
          <Animated.View style={[{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, transformOrigin: 'top' }, paperStyle]}>
            <WrapPaper color={accent} ribbons={false} />
            <Animated.View style={[{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, transformOrigin: 'top' }, ribVStyle]}><RibbonV /></Animated.View>
            <Animated.View style={[{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, transformOrigin: 'left' }, ribHStyle]}><RibbonH /></Animated.View>
            <View className="absolute inset-0 items-center justify-center">
              {/* Les classes NativeWind vont sur une View classique : Animated.View ne reçoit que des styles */}
              <Animated.View style={[tagStyle, shadow.pop, { borderRadius: 999 }]}>
                <View className="flex-row items-center rounded-full bg-white px-4 py-2">
                  {mine ? <Heart size={15} color={colors.candy} fill={colors.candy} /> : <Lock size={14} color={colors.ink} />}
                  <Text className="ml-1.5 font-bold2 text-[14px] text-ink">{mine ? 'Vous l’offrez' : 'Déjà réservé'}</Text>
                </View>
              </Animated.View>
            </View>
          </Animated.View>
        )}
      </View>

      <View className="p-5">
        <Text className="font-display text-[23px] leading-[26px] text-ink">{gift.name}</Text>
        {!!gift.price && <Text className="mt-1 font-bold2 text-[14px] text-ink/75">{formatPrice(gift.price)}</Text>}
        {!!gift.description && <Text className="mt-2 font-body text-[14px] leading-[20px] text-ink/60">{gift.description}</Text>}

        <View className="mt-3 flex-row flex-wrap gap-2">
          {vendorName && (
            <Pressable disabled={!vendorId} onPress={() => vendorId && router.push(`/boutiques/${vendorId}`)} accessibilityRole={vendorId ? 'link' : undefined}
              className="flex-row items-center rounded-full bg-lilac/70 px-2.5 py-1.5">
              <Store size={13} color={colors.muted} />
              <Text className="ml-1.5 font-semi text-[12px] text-ink/70">{vendorName}</Text>
            </Pressable>
          )}
          {opts.map(([k, v]) => <Badge key={k} label={`${k} : ${v}`} />)}
          {gift.wrap_available && <Badge tone="gold" icon={Ribbon} label="Emballage possible" />}
          {gift.stock === 0 && !gift.claimed && <Badge tone="candy" label="Rupture de stock" />}
          {!!gift.product_link && (
            <Pressable onPress={() => Linking.openURL(gift.product_link!)} className="flex-row items-center rounded-full bg-lilac/70 px-2.5 py-1.5">
              <ExternalLink size={13} color={colors.muted} />
              <Text className="ml-1.5 font-semi text-[12px] text-ink/70">Voir le produit</Text>
            </Pressable>
          )}
        </View>

        {canClaim && (
          <Button title="Je m’en charge" className="mt-4" color={accent} textColor={readableOn(accent)} onPress={() => onClaim!(gift)} />
        )}
        {footer ? <View className="mt-3">{footer}</View> : null}
      </View>
    </View>
  );
}
