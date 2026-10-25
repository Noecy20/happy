/** Barre du haut des écrans publics : bouton retour (si possible) + logo ou titre + action à droite. */
import { router } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { Logo } from './Illustrations';
import { IconButton } from './ui';

export default function TopBar({ title, right, light = false, back = true }: { title?: string; right?: ReactNode; light?: boolean; back?: boolean }) {
  return (
    <View className="flex-row items-center justify-between py-3">
      <View className="flex-1 flex-row items-center">
        {back && (
          <IconButton icon={ArrowLeft} label="Retour" className={light ? 'mr-3 border-white/20 bg-white/10' : 'mr-3'} color={light ? '#fff' : undefined}
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
        )}
        {title ? <Text className="flex-1 font-display text-[24px]" style={{ color: light ? '#fff' : '#1E1428' }} numberOfLines={1}>{title}</Text> : <Logo light={light} />}
      </View>
      {right}
    </View>
  );
}
