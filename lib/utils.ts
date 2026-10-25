// Inscription sans email : identifiant technique basé sur le téléphone
export const phoneToEmail = (phone: string) => `${phone.replace(/\D/g, '')}@tel.happy.app`;
export const isPhone = (v: string) => !v.includes('@') && v.replace(/\D/g, '').length >= 8;

export const cn = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

export const formatDate = (d: string | Date, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' }) =>
  new Date(typeof d === 'string' && d.length === 10 ? d + 'T12:00:00' : d).toLocaleDateString('fr-FR', opts);

export const formatPrice = (n?: number | null) =>
  n == null ? '' : new Intl.NumberFormat('fr-FR').format(Number(n)) + ' FCFA';

export const daysUntil = (d: string | Date) => {
  const target = new Date(typeof d === 'string' && d.length === 10 ? d + 'T00:00:00' : d);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - now.getTime()) / 86400000);
};

export const siteUrl = () =>
  process.env.NEXT_PUBLIC_SITE_URL || (typeof window !== 'undefined' ? window.location.origin : '');

export const ORDER_STEPS = [
  { key: 'recue', label: 'Reçue' },
  { key: 'acceptee', label: 'Acceptée' },
  { key: 'preparation', label: 'En préparation' },
  { key: 'prete', label: 'Prête' },
  { key: 'livree', label: 'Livrée' },
] as const;

export const statusLabel = (s: string) =>
  s === 'annulee' ? 'Annulée' : ORDER_STEPS.find((x) => x.key === s)?.label ?? s;

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
  { name: 'Indigo', hex: '#22306B' },
  { name: 'Safran', hex: '#F2A93B' },
];

// Nom français approximatif d'une couleur quelconque (pour le dress code)
const NAMED: [string, number[]][] = [
  ['rose', [224, 69, 107]], ['rose poudré', [242, 184, 198]], ['fuchsia', [214, 40, 160]], ['rouge', [214, 47, 58]],
  ['bordeaux', [122, 16, 51]], ['orange', [242, 122, 26]], ['jaune', [245, 205, 50]], ['or', [201, 160, 68]],
  ['beige', [225, 205, 170]], ['marron', [120, 72, 40]], ['blanc', [247, 245, 242]], ['gris', [140, 140, 145]],
  ['noir', [26, 26, 26]], ['bleu ciel', [120, 185, 235]], ['bleu roi', [47, 75, 216]], ['bleu marine', [20, 35, 90]],
  ['turquoise', [40, 190, 185]], ['vert', [60, 170, 80]], ['vert émeraude', [15, 143, 101]], ['vert olive', [110, 120, 50]],
  ['violet', [110, 50, 160]], ['lilas', [169, 139, 224]],
];
export const colorName = (hex: string) => {
  const h = hex.replace('#', '');
  const c = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  let best = NAMED[0][0], d = Infinity;
  for (const [n, v] of NAMED) {
    const dd = (c[0] - v[0]) ** 2 + (c[1] - v[1]) ** 2 + (c[2] - v[2]) ** 2;
    if (dd < d) { d = dd; best = n; }
  }
  return best;
};

// Prochain anniversaire et âge à partir de la date de naissance
export const nextBirthday = (birth: string) => {
  const [, m, d] = birth.split('-').map(Number);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  let y = today.getFullYear();
  let next = new Date(y, m - 1, d);
  if (next.getMonth() !== m - 1) next = new Date(y, 1, 28);
  if (next < today) { y += 1; next = new Date(y, m - 1, d); if (next.getMonth() !== m - 1) next = new Date(y, 1, 28); }
  const iso = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`;
  return { date: iso, age: next.getFullYear() - Number(birth.slice(0, 4)) };
};

export const VENDOR_CATEGORIES = ['Mode et couture', 'Beauté et parfums', 'Bijoux et accessoires', 'Fleurs', 'Pâtisserie et gâteaux', 'Décoration', 'High-tech', 'Livres et papeterie', 'Bien-être et spa', 'Autre'];

// Couleur de texte lisible sur une couleur de fond
export const readableOn = (hex?: string | null) => {
  if (!hex) return '#fff';
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? '#1E1428' : '#fff';
};

// Configuration Supabase renseignée ?
export const supabaseConfigured = () => {
  const u = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const k = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  return u.startsWith('https://') && !u.includes('xxxx') && k.length > 40;
};

// Messages d'erreur d'authentification lisibles
export const authError = (msg = '') => {
  const m = msg.toLowerCase();
  if (m.includes('failed to fetch') || m.includes('fetch failed')) return 'Impossible de joindre Supabase : vérifiez NEXT_PUBLIC_SUPABASE_URL dans .env.local.';
  if (m.includes('invalid api key') || m.includes('no api key')) return 'Clé Supabase invalide : vérifiez NEXT_PUBLIC_SUPABASE_ANON_KEY dans .env.local.';
  if (m.includes('database error')) return 'La base n’est pas prête : exécutez supabase/schema.sql dans le SQL Editor de Supabase.';
  if (m.includes('rate limit')) return 'Limite d’emails Supabase atteinte : désactivez « Confirm email » ou réessayez dans une heure.';
  if (m.includes('already registered')) return 'Cet email a déjà un compte. Connectez-vous.';
  if (m.includes('email not confirmed')) return 'Email non confirmé : cliquez sur le lien reçu par email.';
  if (m.includes('invalid login credentials')) return 'Email ou mot de passe incorrect.';
  if (m.includes('password')) return 'Mot de passe trop court : 6 caractères minimum.';
  return msg || 'Une erreur est survenue.';
};
