/**
 * Appels aux routes serveur du site Next.js (dossier app/api du projet web).
 * Elles sont nécessaires pour les actions qui exigent la clé `service_role`
 * (supprimer un compte, créer une boutique) ou l'envoi de notifications push.
 * L'app mobile n'a pas de cookies : elle envoie son jeton de session dans l'en-tête
 * `Authorization: Bearer <access_token>` (les routes ont été adaptées pour l'accepter).
 */
import { SITE_URL } from './config';
import { supabase } from './supabase';

async function call(path: string, init: RequestInit = {}) {
  if (!SITE_URL) throw new Error('EXPO_PUBLIC_SITE_URL n’est pas renseignée dans .env.');
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(`${SITE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
      ...(init.headers || {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `Erreur serveur (${res.status}).`);
  return body;
}

/** Admin : supprime définitivement un utilisateur (et en cascade son anniversaire, sa boutique…). */
export const adminDeleteUser = (id: string) => call(`/api/admin/users/${id}`, { method: 'DELETE' });

/** Admin : crée une boutique déjà validée et en ligne. */
export const adminCreateVendor = (b: Record<string, string>) => call('/api/admin/vendors', { method: 'POST', body: JSON.stringify(b) });

/** Boutique : prévient l'acheteur (push web + mobile) du nouveau statut de sa commande. Silencieux en cas d'échec. */
export const notifyOrder = (code: string) => call('/api/push/order', { method: 'POST', body: JSON.stringify({ code }) }).catch(() => null);

/** Liens publics partagés (toujours des URL web pour que tout le monde puisse les ouvrir). */
export const links = {
  event: (token: string) => `${SITE_URL}/e/${token}`,
  shop: (id: string) => `${SITE_URL}/boutiques/${id}`,
  tracking: (code: string) => `${SITE_URL}/suivi/${code}`,
};
