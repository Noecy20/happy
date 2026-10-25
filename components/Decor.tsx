/* Fond décoratif : un pagne wax, choisi selon une graine pour varier d'une boutique à l'autre */
import Wax from './Wax';

export const seedOf = (s: string) => [...s].reduce((a, c) => a + c.charCodeAt(0), 0);

// Motif posé sur la couleur du bloc parent (fond transparent)
const PALETTES = [
  { light: '#FFFBF5', accent: '#F2A93B', dark: '#14112B' },
  { light: '#FFFBF5', accent: '#D6336C', dark: '#14112B' },
  { light: '#F2A93B', accent: '#FFFBF5', dark: '#14112B' },
];

export default function Decor({ seed = 0, variant, className = '', opacity = 0.9 }: { seed?: number; variant?: number; className?: string; opacity?: number }) {
  return (
    <Wax variant={variant ?? seed % 3} size={56 + (seed % 4) * 8} colors={{ bg: 'none', ...PALETTES[seed % PALETTES.length] }}
      className={`absolute inset-0 ${className}`} style={{ opacity }} />
  );
}
