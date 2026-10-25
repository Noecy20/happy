/**
 * Fonctions utilitaires partagées — copie fidèle de `lib/utils.ts` du site web.
 * On garde exactement les mêmes règles (format des prix, identifiant téléphone,
 * calcul du prochain anniversaire…) pour que le web et le mobile se comportent pareil.
 */

/* ------------------------------------------------------------------ */
/* Identifiant technique quand l'utilisateur n'a pas d'email           */
/* ------------------------------------------------------------------ */

/** « 07 08 09 10 11 » → « 0708091011@tel.happy.app ». Jamais affiché, jamais stocké dans profiles.email. */
export const phoneToEmail = (phone: string) => `${phone.replace(/\D/g, '')}@tel.happy.app`;

/** Vrai si la saisie ressemble à un numéro (pas de @ et au moins 8 chiffres). */
export const isPhone = (v: string) => !v.includes('@') && v.replace(/\D/g, '').length >= 8;

/* ------------------------------------------------------------------ */
/* Dates et montants (français, FCFA, fuseau Africa/Abidjan = UTC+0)    */
/* ------------------------------------------------------------------ */

/** Transforme "2026-12-20" en Date à midi (évite les décalages de fuseau). */
const toDate = (d: string | Date) =>
  new Date(typeof d === 'string' && d.length === 10 ? d + 'T12:00:00' : d);

/** Date lisible en français : « 20 décembre 2026 » (options personnalisables). */
export const formatDate = (
  d: string | Date,
  opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' }
) => toDate(d).toLocaleDateString('fr-FR', opts);

/** Date longue avec majuscule : « Samedi 20 décembre 2026 ». */
export const formatLongDate = (d: string | Date) => {
  const s = formatDate(d, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  return s.charAt(0).toUpperCase() + s.slice(1);
};

/** Montant : 45000 → « 45 000 FCFA ». Espace insécable remplacée par une espace simple. */
export const formatPrice = (n?: number | string | null) =>
  n == null || n === '' ? '' : new Intl.NumberFormat('fr-FR').format(Number(n)).replace(/ | /g, ' ') + ' FCFA';

/** Nombre de jours entre aujourd'hui et une date (négatif si passée). */
export const daysUntil = (d: string | Date) => {
  const target = new Date(typeof d === 'string' && d.length === 10 ? d + 'T00:00:00' : d);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - now.getTime()) / 86400000);
};

/** Date du jour au format ISO "AAAA-MM-JJ". */
export const todayIso = () => new Date().toISOString().slice(0, 10);

/** Date → "AAAA-MM-JJ" en heure locale (pour les sélecteurs de date). */
export const toIso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/* ------------------------------------------------------------------ */
/* Commandes                                                            */
/* ------------------------------------------------------------------ */

/** Étapes du suivi de commande (valeurs de l'enum SQL order_status). */
export const ORDER_STEPS = [
  { key: 'recue', label: 'Reçue' },
  { key: 'acceptee', label: 'Acceptée' },
  { key: 'preparation', label: 'En préparation' },
  { key: 'prete', label: 'Prête' },
  { key: 'livree', label: 'Livrée' },
] as const;

export const statusLabel = (s: string) =>
  s === 'annulee' ? 'Annulée' : ORDER_STEPS.find((x) => x.key === s)?.label ?? s;

/* ------------------------------------------------------------------ */
/* Couleurs de thème et dress code                                      */
/* ------------------------------------------------------------------ */

export const THEME_COLORS = [
  { name: 'Rose', hex: '#E0456B' },
  { name: 'Rose poudré', hex: '#F2B8C6' },
  { name: 'Rouge', hex: '#D62F3A' },
  { name: 'Bordeaux', hex: '#7A1033' },
  { name: 'Orange', hex: '#F27A1A' },
  { name: 'Or', hex: '#C9A044' },
  { name: 'Blanc', hex: '#F7F5F2' },
  { name: 'Noir', hex: '#1A1A1A' },
  { name: 'Bleu roi', hex: '#2F4BD8' },
  { name: 'Vert émeraude', hex: '#0F8F65' },
  { name: 'Lilas', hex: '#A98BE0' },
];

// Palette de référence pour nommer n'importe quelle couleur (dress code « Tout en … »)
const NAMED: [string, number[]][] = [
  ['rose', [224, 69, 107]], ['rose poudré', [242, 184, 198]], ['fuchsia', [214, 40, 160]], ['rouge', [214, 47, 58]],
  ['bordeaux', [122, 16, 51]], ['orange', [242, 122, 26]], ['jaune', [245, 205, 50]], ['or', [201, 160, 68]],
  ['beige', [225, 205, 170]], ['marron', [120, 72, 40]], ['blanc', [247, 245, 242]], ['gris', [140, 140, 145]],
  ['noir', [26, 26, 26]], ['bleu ciel', [120, 185, 235]], ['bleu roi', [47, 75, 216]], ['bleu marine', [20, 35, 90]],
  ['turquoise', [40, 190, 185]], ['vert', [60, 170, 80]], ['vert émeraude', [15, 143, 101]], ['vert olive', [110, 120, 50]],
  ['violet', [110, 50, 160]], ['lilas', [169, 139, 224]],
];

/** Nom français le plus proche d'une couleur hexadécimale (distance euclidienne RVB). */
export const colorName = (hex: string) => {
  const h = hex.replace('#', '');
  const c = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  let best = NAMED[0][0];
  let d = Infinity;
  for (const [n, v] of NAMED) {
    const dd = (c[0] - v[0]) ** 2 + (c[1] - v[1]) ** 2 + (c[2] - v[2]) ** 2;
    if (dd < d) { d = dd; best = n; }
  }
  return best;
};

/** Vrai si la chaîne est une couleur hexadécimale valide « #RRGGBB ». */
export const isHex = (v: string) => /^#[0-9a-fA-F]{6}$/.test(v);

/** Couleur de texte lisible (nuit ou blanc) posée sur une couleur de fond. */
export const readableOn = (hex?: string | null) => {
  if (!hex || !isHex(hex)) return '#fff';
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? '#1E1428' : '#fff';
};

/** Couleur d'accent utilisable comme texte sur fond clair (le blanc devient nuit). */
export const textAccentOf = (hex: string) => (readableOn(hex) === '#fff' ? hex : '#1E1428');

/** Ajoute une transparence à une couleur hex : withAlpha('#E0456B', 0.1). */
export const withAlpha = (hex: string, a: number) =>
  hex + Math.round(Math.max(0, Math.min(1, a)) * 255).toString(16).padStart(2, '0');

/* ------------------------------------------------------------------ */
/* Anniversaire                                                         */
/* ------------------------------------------------------------------ */

/** Prochain anniversaire et âge atteint, à partir de la date de naissance (29/02 → 28/02). */
export const nextBirthday = (birth: string) => {
  const [, m, d] = birth.split('-').map(Number);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  let y = today.getFullYear();
  let next = new Date(y, m - 1, d);
  if (next.getMonth() !== m - 1) next = new Date(y, 1, 28);
  if (next < today) {
    y += 1;
    next = new Date(y, m - 1, d);
    if (next.getMonth() !== m - 1) next = new Date(y, 1, 28);
  }
  return { date: toIso(next), age: next.getFullYear() - Number(birth.slice(0, 4)) };
};

/** Catégories proposées à l'inscription d'une boutique. */
export const VENDOR_CATEGORIES = [
  'Mode et couture', 'Beauté et parfums', 'Bijoux et accessoires', 'Fleurs', 'Pâtisserie et gâteaux',
  'Décoration', 'High-tech', 'Livres et papeterie', 'Bien-être et spa', 'Autre',
];

/* ------------------------------------------------------------------ */
/* Erreurs                                                              */
/* ------------------------------------------------------------------ */

/** Traduit les erreurs techniques d'authentification en messages lisibles. */
export const authError = (msg = '') => {
  const m = msg.toLowerCase();
  if (m.includes('network request failed') || m.includes('failed to fetch') || m.includes('fetch failed'))
    return 'Impossible de joindre Supabase : vérifiez votre connexion et EXPO_PUBLIC_SUPABASE_URL dans .env.';
  if (m.includes('invalid api key') || m.includes('no api key')) return 'Clé Supabase invalide : vérifiez EXPO_PUBLIC_SUPABASE_ANON_KEY dans .env.';
  if (m.includes('database error')) return 'La base n’est pas prête : exécutez les scripts SQL du dossier supabase.';
  if (m.includes('rate limit')) return 'Limite d’emails Supabase atteinte : désactivez « Confirm email » ou réessayez dans une heure.';
  if (m.includes('already registered')) return 'Cet email a déjà un compte. Connectez-vous.';
  if (m.includes('email not confirmed')) return 'Email non confirmé : cliquez sur le lien reçu par email.';
  if (m.includes('invalid login credentials')) return 'Email ou mot de passe incorrect.';
  if (m.includes('password')) return 'Mot de passe trop court : 6 caractères minimum.';
  return msg || 'Une erreur est survenue.';
};

/** Numéro → lien WhatsApp. */
export const waLink = (phone: string, text?: string) =>
  `https://wa.me/${phone.replace(/\D/g, '')}${text ? `?text=${encodeURIComponent(text)}` : ''}`;

/** Moyens de paiement réellement configurés par l'admin dans `settings`. */
export const paymentMethods = (cfg: any): [string, string][] =>
  cfg
    ? ([['Wave', cfg.wave_number], ['Orange Money', cfg.orange_number], ['MTN MoMo', cfg.mtn_number], ['Moov Money', cfg.moov_number]]
        .filter(([, n]) => n) as [string, string][])
    : [];
