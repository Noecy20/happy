/**
 * Design system Happy en valeurs JavaScript (pour les props `color`, les SVG et les styles natifs).
 * Les mêmes couleurs existent en classes NativeWind dans tailwind.config.js (bg-candy, text-ink…).
 */
import { Platform, type ViewStyle } from 'react-native';

export const colors = {
  ink: '#1E1428',    // nuit : texte, fonds sombres
  plum: '#3A2150',   // prune
  candy: '#E0456B',  // rose Happy : action principale
  mango: '#C8A26A',  // champagne : rubans, accents
  lilac: '#F6E7EA',  // blush : surfaces douces
  paper: '#FCFAFB',  // porcelaine : fond
  mint: '#4E9C80',   // sauge : succès
  gold: '#8A6A35',   // texte sur fond champagne
  muted: 'rgba(30,20,40,0.55)',
  faint: 'rgba(30,20,40,0.08)',
  white: '#FFFFFF',
};

export const fonts = {
  display: 'CormorantGaramond_600SemiBold',
  body: 'Manrope_400Regular',
  medium: 'Manrope_500Medium',
  semi: 'Manrope_600SemiBold',
  bold: 'Manrope_700Bold',
  black: 'Manrope_800ExtraBold',
};

/** Ombres douces (équivalent des `shadow-pop` / `shadow-popsm` du web). */
export const shadow = {
  pop: Platform.select<ViewStyle>({
    ios: { shadowColor: '#1E1428', shadowOpacity: 0.18, shadowRadius: 24, shadowOffset: { width: 0, height: 16 } },
    default: { elevation: 8, shadowColor: '#1E1428' },
  }),
  sm: Platform.select<ViewStyle>({
    ios: { shadowColor: '#1E1428', shadowOpacity: 0.12, shadowRadius: 14, shadowOffset: { width: 0, height: 8 } },
    default: { elevation: 3, shadowColor: '#1E1428' },
  }),
};
