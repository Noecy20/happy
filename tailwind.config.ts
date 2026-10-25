import type { Config } from 'tailwindcss';

// Identité « pagne & papier cadeau » : les noms historiques (ink, candy…) sont gardés pour que toute l'app suive
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#14112B',      // nuit : texte et fonds sombres
        paper: '#FFFBF5',    // coton : fond de page
        candy: '#D6336C',    // hibiscus : actions principales
        mango: '#F2A93B',    // safran : rubans et accents
        mint: '#1F8A6A',     // feuille : succès, livré, payé
        lilac: '#ECEFFA',    // indigo très clair : fonds de puces et d'états sélectionnés
        plum: '#22306B',     // indigo : grandes surfaces sombres
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', 'Manrope', 'system-ui', 'sans-serif'],
        sans: ['Manrope', 'system-ui', 'sans-serif'],
        book: ['"Cormorant Garamond"', 'Georgia', 'serif'], // livre d'or uniquement
      },
      boxShadow: {
        pop: '0 24px 48px -24px rgba(20,17,43,.35)',
        popsm: '0 10px 24px -14px rgba(20,17,43,.3)',
      },
    },
  },
  plugins: [],
};
export default config;
