/**
 * Bloc de partage d'un lien : copier, WhatsApp, aperçu (ouvre la page dans l'app), partage natif.
 * Les liens restent des URL web pour que les amis sans l'application puissent tout faire.
 */
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { Copy, Eye, MessageCircle, Share2 } from 'lucide-react-native';
import { Linking, Pressable, Share, Text, View } from 'react-native';
import { colors } from '@/lib/theme';
import { useFx } from '@/providers/FxProvider';

export default function ShareLink({ label, url, text, previewPath }: { label: string; url: string; text: string; previewPath: string }) {
  const fx = useFx();
  const actions = [
    { icon: Copy, label: 'Copier', bg: colors.ink, color: '#fff', run: async () => { await Clipboard.setStringAsync(url); fx.toast('Lien copié'); } },
    { icon: MessageCircle, label: 'WhatsApp', bg: '#25D366', color: '#fff', run: () => Linking.openURL(`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`) },
    { icon: Share2, label: 'Partager', bg: '#fff', color: colors.ink, run: () => Share.share({ message: `${text} ${url}` }) },
    { icon: Eye, label: 'Aperçu', bg: '#fff', color: colors.ink, run: () => router.push(previewPath as any) },
  ];
  return (
    <View className="mb-4">
      <Text className="mb-1.5 font-bold2 text-[12px] text-ink/55">{label}</Text>
      <View className="rounded-2xl border border-ink/10 bg-paper p-2">
        <Text className="px-2 py-1 font-body text-[13px] text-ink" numberOfLines={1}>{url}</Text>
        <View className="mt-1 flex-row gap-2">
          {actions.map((a) => (
            <Pressable key={a.label} onPress={a.run} accessibilityLabel={a.label}
              className="min-h-[44px] flex-1 flex-row items-center justify-center rounded-full border border-ink/10"
              style={{ backgroundColor: a.bg }}>
              <a.icon size={15} color={a.color} />
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}
