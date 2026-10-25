/**
 * Notifications push mobiles via Expo Push (service gratuit d'Expo).
 *
 * Principe :
 * 1. L'app demande la permission (au bon moment : après une action, jamais au lancement).
 * 2. Expo fournit un « jeton » unique pour ce téléphone (ExponentPushToken[...]).
 * 3. On l'enregistre dans Supabase via la RPC `save_expo_push_token` (migration 3-push-mobile.sql),
 *    avec une portée : l'utilisateur connecté, OU un anniversaire (lien), OU une commande (code).
 * 4. Le serveur web (lib/expopush.ts) envoie ensuite les notifications à ces jetons.
 *
 * Remarque : sur Android, Expo Go ne reçoit plus les push distants depuis le SDK 53.
 * Pour tester les push, utilisez un « development build » (eas build --profile development).
 */
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { markPushDone } from './memory';
import { supabase } from './supabase';

// Comportement quand une notification arrive alors que l'app est ouverte : on l'affiche quand même.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export type PushScope = { eventToken?: string; orderCode?: string };

/** Clé locale qui mémorise qu'une portée est déjà abonnée. */
export const scopeKey = (s: PushScope) => s.eventToken || s.orderCode || 'user';

/** Demande la permission, récupère le jeton Expo et l'enregistre dans Supabase. */
export async function enablePush(scope: PushScope = {}) {
  if (!Device.isDevice) throw new Error('Les notifications push nécessitent un vrai téléphone (pas un simulateur).');

  // Android : un « canal » est obligatoire pour afficher des notifications.
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Happy',
      importance: Notifications.AndroidImportance.HIGH,
      lightColor: '#E0456B',
    });
  }

  const current = await Notifications.getPermissionsAsync();
  let granted = current.granted;
  if (!granted) granted = (await Notifications.requestPermissionsAsync()).granted;
  if (!granted) throw new Error('Notifications refusées. Autorisez-les dans les réglages du téléphone.');

  // projectId EAS : renseigné par `eas init` dans app.json > extra.eas.projectId
  const projectId = Constants.expoConfig?.extra?.eas?.projectId || (Constants as any).easConfig?.projectId;
  let token: string;
  try {
    token = (await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined)).data;
  } catch {
    throw new Error('Jeton de notification indisponible. Lancez « eas init » puis utilisez un development build.');
  }

  const { error } = await supabase.rpc('save_expo_push_token', {
    p_token: token,
    p_event_token: scope.eventToken || null,
    p_order_code: scope.orderCode || null,
  });
  if (error) throw new Error(error.message);
  await markPushDone(scopeKey(scope));
  return token;
}

/** À la déconnexion : retire le jeton lié au compte (le téléphone ne reçoit plus ses notifications). */
export async function forgetPush() {
  try {
    const perm = await Notifications.getPermissionsAsync();
    if (!perm.granted || !Device.isDevice) return;
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const token = (await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined)).data;
    await supabase.rpc('forget_expo_push_token', { p_token: token });
  } catch {
    // silencieux : la déconnexion ne doit jamais échouer à cause des notifications
  }
}

/**
 * Convertit l'URL reçue dans une notification (chemin du site web) en écran de l'app.
 * Le serveur envoie les mêmes URL que pour le web : /dashboard, /vendeur, /e/<token>, /suivi/<code>…
 */
export function routeFromUrl(url?: string | null): string | null {
  if (!url) return null;
  let path = url;
  try { if (/^https?:/.test(url)) path = new URL(url).pathname; } catch { /* garde l'URL brute */ }
  if (path.startsWith('/dashboard')) return '/espace';
  if (path.startsWith('/vendeur')) return '/vendeur';
  if (path.startsWith('/admin')) return '/admin';
  if (/^\/(e|boutiques|suivi)\//.test(path)) return path;
  return null;
}
