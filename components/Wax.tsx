/* Motifs de pagne (wax) dessinés en SVG : le papier cadeau de Happy.
   Chaque motif est une tuile de 80 px qui se répète ; les couleurs sont libres. */

export type WaxColors = { bg: string; light: string; accent: string; dark: string };
export const WAX_DEFAULT: WaxColors = { bg: '#22306B', light: '#FFFBF5', accent: '#F2A93B', dark: '#14112B' };

const motif = (v: number, c: WaxColors) => {
  if (v === 1) // losanges
    return `<path d='M40 6 L74 40 L40 74 L6 40Z' fill='none' stroke='${c.light}' stroke-width='3'/>
      <path d='M40 20 L60 40 L40 60 L20 40Z' fill='${c.accent}'/>
      <circle cx='40' cy='40' r='5' fill='${c.dark}' fill-opacity='.55'/>
      <circle cx='0' cy='0' r='7' fill='${c.light}'/><circle cx='80' cy='0' r='7' fill='${c.light}'/>
      <circle cx='0' cy='80' r='7' fill='${c.light}'/><circle cx='80' cy='80' r='7' fill='${c.light}'/>`;
  if (v === 2) // éventails
    return `<path d='M0 40 A20 20 0 0 1 40 40Z' fill='${c.accent}'/>
      <path d='M9 40 A11 11 0 0 1 31 40' fill='none' stroke='${c.light}' stroke-width='3'/>
      <path d='M40 80 A20 20 0 0 1 80 80Z' fill='${c.accent}'/>
      <path d='M49 80 A11 11 0 0 1 71 80' fill='none' stroke='${c.light}' stroke-width='3'/>
      <path d='M40 0 A20 20 0 0 1 80 0Z' fill='none'/>
      <path d='M40 40 A20 20 0 0 1 80 40Z' fill='${c.dark}' fill-opacity='.3'/>
      <path d='M49 40 A11 11 0 0 1 71 40' fill='none' stroke='${c.accent}' stroke-width='3'/>
      <path d='M0 80 A20 20 0 0 1 40 80Z' fill='${c.dark}' fill-opacity='.3'/>
      <circle cx='20' cy='62' r='3' fill='${c.light}'/><circle cx='60' cy='22' r='3' fill='${c.light}'/>`;
  return `<g fill='none' stroke-width='3'>
      <circle cx='20' cy='20' r='14' stroke='${c.light}'/><circle cx='20' cy='20' r='7.5' stroke='${c.accent}'/>
      <circle cx='60' cy='60' r='14' stroke='${c.light}'/><circle cx='60' cy='60' r='7.5' stroke='${c.accent}'/></g>
    <circle cx='20' cy='20' r='2.5' fill='${c.light}'/><circle cx='60' cy='60' r='2.5' fill='${c.light}'/>
    <path d='M60 7 L67 20 L60 33 L53 20Z M20 47 L27 60 L20 73 L13 60Z' fill='${c.dark}' fill-opacity='.35'/>`; // anneaux
};

/** Source data: d'un motif (fond transparent si bg = 'none'), pour <image> dans un SVG. */
export const waxSrc = (v = 0, c: Partial<WaxColors> = {}) => {
  const col = { ...WAX_DEFAULT, ...c };
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'>${col.bg === 'none' ? '' : `<rect width='80' height='80' fill='${col.bg}'/>`}${motif(v, col)}</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg.replace(/\s+/g, ' '))}`;
};

/** Image CSS d'un motif, à utiliser en background-image. */
export const waxUrl = (v = 0, c: Partial<WaxColors> = {}) => `url("${waxSrc(v, c)}")`;

/** Motif utilisable en remplissage SVG : fill={`url(#${id})`}. */
export function WaxPattern({ id, variant = 0, colors, size = 40 }: { id: string; variant?: number; colors?: Partial<WaxColors>; size?: number }) {
  return (
    <pattern id={id} width={size} height={size} patternUnits="userSpaceOnUse">
      <image href={waxSrc(variant, colors)} width={size} height={size} />
    </pattern>
  );
}

/** Surface en tissu wax (bloc positionné qui remplit son parent). */
export default function Wax({ variant = 0, colors, size = 80, className = '', style }: {
  variant?: number; colors?: Partial<WaxColors>; size?: number; className?: string; style?: React.CSSProperties;
}) {
  return (
    <div aria-hidden className={`pointer-events-none ${className}`}
      style={{ backgroundImage: waxUrl(variant, colors), backgroundSize: `${size}px ${size}px`, ...style }} />
  );
}
