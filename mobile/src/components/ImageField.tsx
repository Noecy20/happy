/**
 * Zone « Ajouter une photo » : choisit une image dans la galerie et l'envoie dans Supabase Storage.
 * Affiche l'aperçu une fois envoyée. Renvoie l'URL publique via onChange.
 */
import { Image } from 'expo-image';
import { ImagePlus } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { colors } from '@/lib/theme';
import { pickAndUpload } from '@/lib/upload';
import { useFx } from '@/providers/FxProvider';
import { cn } from './ui';

export default function ImageField({ value, onChange, label = 'Ajouter une photo', prefix = 'photo', aspect = [16, 9], className, round }: {
  value?: string | null; onChange: (url: string) => void; label?: string; prefix?: string; aspect?: [number, number]; className?: string; round?: boolean;
}) {
  const fx = useFx();
  const [busy, setBusy] = useState(false);
  return (
    <Pressable
      accessibilityRole="button" accessibilityLabel={label} disabled={busy}
      onPress={async () => {
        setBusy(true);
        try { const url = await pickAndUpload(prefix, aspect); if (url) onChange(url); }
        catch (e: any) { fx.toast(e.message, 'err'); }
        setBusy(false);
      }}
      className={cn('mb-4 items-center justify-center overflow-hidden border-2 border-dashed border-ink/15 bg-paper', round ? 'rounded-3xl' : 'rounded-2xl', className)}
      style={{ aspectRatio: aspect[0] / aspect[1] }}
    >
      {value ? (
        <Image source={{ uri: value }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
      ) : busy ? (
        <ActivityIndicator color={colors.candy} />
      ) : (
        <View className="items-center px-2">
          <ImagePlus size={24} color={colors.muted} />
          <Text className="mt-2 text-center font-semi text-[13px] text-ink/55">{label}</Text>
        </View>
      )}
      {busy && value && <View className="absolute inset-0 items-center justify-center bg-white/60"><ActivityIndicator color={colors.candy} /></View>}
    </Pressable>
  );
}
