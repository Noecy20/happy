/**
 * Petite mémoire locale du téléphone (AsyncStorage) pour les visiteurs SANS compte :
 * - les codes de suivi des cadeaux réservés par l'ami (pour « Suivre ma commande »),
 * - la réponse à l'invitation (pour ne pas répondre deux fois),
 * - les notifications déjà activées.
 * Équivalent du localStorage du site web.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const MINE = 'happy-mes-cadeaux';     // { [giftId]: trackingCode }
const ORDERS = 'happy-mes-commandes'; // liste de codes de commandes directes

async function readJson<T>(key: string, fallback: T): Promise<T> {
  try { const v = await AsyncStorage.getItem(key); return v ? (JSON.parse(v) as T) : fallback; } catch { return fallback; }
}

/** Cadeaux réservés depuis ce téléphone : { idCadeau: codeDeSuivi }. */
export const readMyGifts = () => readJson<Record<string, string>>(MINE, {});
export async function saveMyGift(giftId: string, code: string) {
  const m = await readMyGifts();
  m[giftId] = code;
  await AsyncStorage.setItem(MINE, JSON.stringify(m));
  await saveMyOrder(code);
  return m;
}

/** Tous les codes de suivi connus sur ce téléphone (réservations + commandes directes). */
export const readMyOrders = () => readJson<string[]>(ORDERS, []);
export async function saveMyOrder(code: string) {
  const list = await readMyOrders();
  if (!list.includes(code)) await AsyncStorage.setItem(ORDERS, JSON.stringify([code, ...list].slice(0, 30)));
}

/** Réponse déjà envoyée à une invitation (clé = lien). */
export const readRsvp = (token: string) => AsyncStorage.getItem(`happy-rsvp-${token}`).catch(() => null);
export const saveRsvp = (token: string, label: string) => AsyncStorage.setItem(`happy-rsvp-${token}`, label).catch(() => null);

/** Notifications déjà activées pour une portée (utilisateur, anniversaire, commande). */
export const pushDone = async (scope: string) => (await AsyncStorage.getItem(`happy-push-${scope}`).catch(() => null)) === '1';
export const markPushDone = (scope: string) => AsyncStorage.setItem(`happy-push-${scope}`, '1').catch(() => null);
