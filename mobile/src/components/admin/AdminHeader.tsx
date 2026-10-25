/** En-tête sombre illustré (confettis) de l'espace admin. */
import { Text, View } from 'react-native';
import { Decor } from '@/components/Illustrations';

export default function AdminHeader({ title, subtitle = 'Happy · Administration' }: { title: string; subtitle?: string }) {
  return (
    <View className="mt-4 overflow-hidden rounded-[32px] bg-ink px-6 py-8">
      <Decor seed={11} variant={0} opacity={0.5} />
      <View pointerEvents="none" style={{ position: 'absolute', right: -60, top: -60, width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(224,69,107,0.3)' }} />
      <Text className="font-semi text-[13px] text-white/60">{subtitle}</Text>
      <Text className="font-display text-[42px] leading-[44px] text-white">{title}</Text>
    </View>
  );
}
