/**
 * Tokens du design system Happy — identiques au site web (tailwind.config.ts).
 * Ainsi `bg-candy`, `text-ink`, `bg-lilac`… signifient la même chose sur le web et le mobile.
 * @type {import('tailwindcss').Config}
 */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        ink: '#1E1428',   // nuit aubergine : texte, fonds sombres
        plum: '#3A2150',  // prune
        candy: '#E0456B', // rose Happy : action principale
        mango: '#C8A26A', // champagne : rubans, accents
        lilac: '#F6E7EA', // blush : surfaces douces
        paper: '#FCFAFB', // porcelaine : fond
        mint: '#4E9C80',  // sauge : succès
      },
      // En React Native, chaque graisse d'une police personnalisée est une « famille » distincte.
      // On utilise donc font-body / font-semi / font-bold2 au lieu de font-semibold, font-bold.
      fontFamily: {
        display: ['CormorantGaramond_600SemiBold'],
        body: ['Manrope_400Regular'],
        medium: ['Manrope_500Medium'],
        semi: ['Manrope_600SemiBold'],
        bold2: ['Manrope_700Bold'],
        black2: ['Manrope_800ExtraBold'],
      },
    },
  },
  plugins: [],
};
