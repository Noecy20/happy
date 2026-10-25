/** Écran affiché pour un lien inconnu. */
import { router } from 'expo-router';
import { Gift } from 'lucide-react-native';
import { View } from 'react-native';
import { Button, Screen, Title, Txt } from '@/components/ui';
import { colors } from '@/lib/theme';

export default function NotFound() {
  return (
    <Screen>
      <View className="mt-24 items-center">
        <Gift size={40} color={colors.candy} />
        <Title className="mt-4 text-center">Page introuvable</Title>
        <Txt className="mt-2 text-center text-ink/60">Ce lien ne correspond à aucun écran de Happy.</Txt>
        <Button title="Retour à l’accueil" className="mt-6 w-full" onPress={() => router.replace('/')} />
      </View>
    </Screen>
  );
}
