/**
 * Variables d'environnement publiques (préfixe EXPO_PUBLIC_, lues au moment du build).
 * Elles viennent du fichier `.env` à la racine du dossier mobile.
 * Aucune clé secrète ici : la clé « anon » est publique, la sécurité repose sur les règles RLS de Supabase.
 */
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
/** URL du site web (sans slash final) : liens de partage et routes /api du serveur Next.js. */
export const SITE_URL = (process.env.EXPO_PUBLIC_SITE_URL ?? '').replace(/\/$/, '');

/** Vrai si la configuration Supabase semble renseignée (même test que le web). */
export const supabaseConfigured = () =>
  SUPABASE_URL.startsWith('https://') && !SUPABASE_URL.includes('xxxx') && SUPABASE_ANON_KEY.length > 40;
