/** En-tête prune de l'espace boutique : couverture ou décor festif, logo, catégorie, nom. */
import { Image } from 'expo-image';
import { Text, View } from 'react-native';
import { Decor, seedOf } from '@/components/Illustrations';
import type { Vendor } from '@/lib/types';

export default function ShopHeader({ vendor }: { vendor: Vendor }) {
  return (
    <View className="mt-4 overflow-hidden rounded-[32px] bg-plum p-6">
      {vendor.cover_url
        ? <Image source={{ uri: vendor.cover_url }} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.4 }} contentFit="cover" />
        : <Decor seed={seedOf(vendor.id)} opacity={0.35} />}
      <View className="flex-row items-center">
        <View className="h-16 w-16 items-center justify-center overflow-hidden rounded-3xl bg-white/15">
          {vendor.logo_url ? <Image source={{ uri: vendor.logo_url }} style={{ width: '100%', height: '100%' }} />
            : <Text className="font-display text-[32px] text-white">{vendor.name[0]?.toUpperCase()}</Text>}
        </View>
        <View className="ml-4 flex-1">
          {!!vendor.category && <Text className="font-semi text-[12px] text-white/65">{vendor.category}</Text>}
          <Text className="font-display text-[32px] leading-[34px] text-white" numberOfLines={2}>{vendor.name}</Text>
        </View>
      </View>
    </View>
  );
}
