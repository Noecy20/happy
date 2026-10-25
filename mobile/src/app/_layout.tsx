/**
 * Racine de l'application (expo-router).
 * - Charge les polices Cormorant Garamond (titres) et Manrope (texte).
 * - Installe les « providers » : zone sûre, authentification, effets (toasts, confettis).
 * - Ouvre le bon écran quand l'utilisateur touche une notification push.
 * - Déclare la pile de navigation (Stack) : chaque fichier de src/app est un écran.
 *
 * Liens profonds : les URL https://<site>/e/<token>, /boutiques/<id>, /suivi/<code>
 * ouvrent directement les fichiers src/app/e/[token].tsx, boutiques/[id].tsx, suivi/[code].tsx.
 */
import '../../global.css';
import { CormorantGaramond_600SemiBold } from '@expo-google-fonts/cormorant-garamond';
import {
  Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold,
} from '@expo-google-fonts/manrope';
import { useFonts } from 'expo-font';
import * as Notifications from 'expo-notifications';
import { router, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { routeFromUrl } from '@/lib/push';
import { colors } from '@/lib/theme';
import { AuthProvider } from '@/providers/AuthProvider';
import { FxProvider } from '@/providers/FxProvider';

// On garde l'écran de démarrage tant que les polices ne sont pas prêtes (évite un « saut » de police).
SplashScreen.preventAutoHideAsync().catch(() => null);

export default function RootLayout() {
  const [loaded, fontError] = useFonts({
    CormorantGaramond_600SemiBold,
    Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold,
  });

  useEffect(() => {
    if (loaded || fontError) SplashScreen.hideAsync().catch(() => null);
  }, [loaded, fontError]);

  // Toucher une notification → ouvrir l'écran correspondant (data.url envoyée par le serveur).
  useEffect(() => {
    const open = (n: Notifications.Notification) => {
      const target = routeFromUrl((n.request.content.data as any)?.url);
      if (target) router.push(target as any);
    };
    if (Platform.OS === 'web') return; // pas de push natif dans un navigateur
    try {
      // Notification touchée alors que l'app était fermée
      const last = Notifications.getLastNotificationResponse();
      if (last) open(last.notification);
    } catch { /* module natif indisponible : on ignore */ }
    const sub = Notifications.addNotificationResponseReceivedListener((r) => open(r.notification));
    return () => sub.remove();
  }, []);

  if (!loaded && !fontError) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <FxProvider>
            <StatusBar style="dark" />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.paper },
                animation: 'slide_from_right',
              }}
            />
          </FxProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
