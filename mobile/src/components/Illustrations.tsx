/**
 * Illustrations vectorielles Happy (react-native-svg), reprises de components/Illustrations.tsx
 * et components/Decor.tsx du web : nettes à toutes les tailles, sans image externe.
 * - <GiftStack>      : pile de cadeaux + ballons (accueil, connexion).
 * - <GiftPlaceholder>: fond d'une carte cadeau sans photo.
 * - <Decor>          : fond décoratif festif, différent pour chaque boutique (confettis, ballons, rubans, étoiles, petits cadeaux).
 * - <Logo>           : logo Happy.
 */
import { Gift } from 'lucide-react-native';
import { Text, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { colors, shadow } from '@/lib/theme';

/** Petite étoile à 4 branches. */
const sparkle = (x: number, y: number, s: number) =>
  `M${x} ${y - s}Q${x} ${y} ${x + s} ${y}Q${x} ${y} ${x} ${y + s}Q${x} ${y} ${x - s} ${y}Q${x} ${y} ${x} ${y - s}Z`;

/** Dégradés partagés par les illustrations. */
function Gradients() {
  return (
    <Defs>
      <LinearGradient id="rose" x1="0" y1="0" x2="1" y2="0"><Stop offset="0" stopColor="#F06A8B" /><Stop offset="0.55" stopColor="#E0456B" /><Stop offset="1" stopColor="#B82F52" /></LinearGradient>
      <LinearGradient id="roseLid" x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor="#F47A97" /><Stop offset="1" stopColor="#D23C62" /></LinearGradient>
      <LinearGradient id="plum" x1="0" y1="0" x2="1" y2="0"><Stop offset="0" stopColor="#5A3677" /><Stop offset="0.6" stopColor="#3A2150" /><Stop offset="1" stopColor="#26143A" /></LinearGradient>
      <LinearGradient id="plumLid" x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor="#6B4389" /><Stop offset="1" stopColor="#402459" /></LinearGradient>
      <LinearGradient id="cream" x1="0" y1="0" x2="1" y2="0"><Stop offset="0" stopColor="#FFF6F1" /><Stop offset="0.6" stopColor="#F4E2DA" /><Stop offset="1" stopColor="#E3C9BE" /></LinearGradient>
      <LinearGradient id="gold" x1="0" y1="0" x2="1" y2="0"><Stop offset="0" stopColor="#B98F55" /><Stop offset="0.5" stopColor="#EAD3A2" /><Stop offset="1" stopColor="#B98F55" /></LinearGradient>
      <LinearGradient id="goldD" x1="0" y1="0" x2="1" y2="0"><Stop offset="0" stopColor="#A57C45" /><Stop offset="1" stopColor="#D4B47D" /></LinearGradient>
      <RadialGradient id="halo" cx="50%" cy="50%" r="50%"><Stop offset="0" stopColor="#F6E7EA" /><Stop offset="1" stopColor="#F6E7EA" stopOpacity="0" /></RadialGradient>
      <LinearGradient id="balloonR" x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor="#F58CA6" /><Stop offset="1" stopColor="#D83D64" /></LinearGradient>
      <LinearGradient id="balloonG" x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor="#F1DDB3" /><Stop offset="1" stopColor="#BE945A" /></LinearGradient>
    </Defs>
  );
}

/** Nœud de ruban champagne. */
function Bow({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  return (
    <G transform={`translate(${x} ${y}) scale(${scale})`}>
      <Path d="M-4 4 L-26 44 L-14 40 L-8 52 L2 8Z" fill="url(#goldD)" />
      <Path d="M4 4 L26 44 L14 40 L8 52 L-2 8Z" fill="url(#goldD)" />
      <Ellipse cx="-24" cy="-10" rx="26" ry="15" transform="rotate(-22 -24 -10)" fill="url(#gold)" />
      <Ellipse cx="-22" cy="-9" rx="13" ry="6" transform="rotate(-22 -22 -9)" fill="#9C7640" opacity={0.45} />
      <Ellipse cx="24" cy="-10" rx="26" ry="15" transform="rotate(22 24 -10)" fill="url(#gold)" />
      <Ellipse cx="22" cy="-9" rx="13" ry="6" transform="rotate(22 22 -9)" fill="#9C7640" opacity={0.45} />
      <Rect x="-9" y="-12" width="18" height="18" rx="6" fill="url(#goldD)" />
    </G>
  );
}

function Balloon({ x, y, fill, r = 34 }: { x: number; y: number; fill: string; r?: number }) {
  return (
    <G>
      <Path d={`M${x} ${y + r * 1.2} C ${x - 10} ${y + r * 2}, ${x + 14} ${y + r * 2.6}, ${x - 4} ${y + r * 3.6}`} stroke="#C8A26A" strokeWidth="1.5" fill="none" />
      <Ellipse cx={x} cy={y} rx={r} ry={r * 1.18} fill={fill} />
      <Ellipse cx={x - r * 0.35} cy={y - r * 0.45} rx={r * 0.22} ry={r * 0.34} fill="#fff" opacity={0.35} />
      <Path d={`M${x - 5} ${y + r * 1.18 + 6} L${x} ${y + r * 1.14} L${x + 5} ${y + r * 1.18 + 6}Z`} fill={fill} />
    </G>
  );
}

/** Pile de cadeaux et ballons. */
export function GiftStack({ width = 300, dark = false }: { width?: number; dark?: boolean }) {
  return (
    <Svg width={width} height={(width * 460) / 480} viewBox="0 0 480 460" accessibilityLabel="Pile de cadeaux emballés et ballons">
      <Gradients />
      {!dark && <Circle cx="240" cy="235" r="215" fill="url(#halo)" />}
      <Balloon x={120} y={92} fill="url(#balloonR)" />
      <Balloon x={176} y={62} r={26} fill="url(#balloonG)" />
      <Ellipse cx="240" cy="408" rx="190" ry="16" fill={dark ? '#000' : '#1E1428'} opacity={dark ? 0.35 : 0.1} />
      {/* grand cadeau prune */}
      <Rect x="268" y="186" width="136" height="216" rx="6" fill="url(#plum)" />
      <Rect x="326" y="186" width="20" height="216" fill="url(#gold)" />
      <Rect x="258" y="158" width="156" height="38" rx="6" fill="url(#plumLid)" />
      <Rect x="326" y="158" width="20" height="38" fill="url(#gold)" />
      <Bow x={336} y={156} scale={0.9} />
      {/* cadeau rose */}
      <Rect x="72" y="238" width="200" height="164" rx="6" fill="url(#rose)" />
      <Rect x="72" y="302" width="200" height="20" fill="url(#gold)" opacity={0.95} />
      <Rect x="160" y="238" width="22" height="164" fill="url(#gold)" />
      <Rect x="60" y="208" width="224" height="42" rx="7" fill="url(#roseLid)" />
      <Rect x="160" y="208" width="22" height="42" fill="url(#gold)" />
      <Bow x={171} y={206} />
      {/* petit cadeau crème */}
      <Rect x="232" y="330" width="112" height="72" rx="5" fill="url(#cream)" />
      <Rect x="280" y="330" width="16" height="72" fill="url(#rose)" />
      <Rect x="224" y="312" width="128" height="26" rx="5" fill="#FFF8F4" />
      <Rect x="280" y="312" width="16" height="26" fill="url(#roseLid)" />
      {/* éclats */}
      <Path d={sparkle(420, 110, 14)} fill="#C8A26A" />
      <Path d={sparkle(448, 150, 7)} fill="#E0456B" />
      <Path d={sparkle(58, 190, 9)} fill="#C8A26A" />
      <Path d={sparkle(250, 118, 6)} fill="#E0456B" opacity={0.8} />
      <Circle cx="400" cy="70" r="4" fill="#E0456B" opacity={0.6} />
      <Circle cx="40" cy="300" r="3.5" fill="#C8A26A" />
    </Svg>
  );
}

/** Cadeau dessiné, utilisé quand un article n'a pas de photo. Le ton varie selon l'identifiant. */
export function GiftPlaceholder({ seed = '' }: { seed?: string }) {
  const tone = [...seed].reduce((a, c) => a + c.charCodeAt(0), 0) % 3;
  const box = tone === 1 ? 'url(#plum)' : tone === 2 ? 'url(#cream)' : 'url(#rose)';
  const lid = tone === 1 ? 'url(#plumLid)' : tone === 2 ? '#FFF8F4' : 'url(#roseLid)';
  return (
    <Svg width="100%" height="100%" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice">
      <Gradients />
      <Rect width="400" height="300" fill="#F6E7EA" />
      <Circle cx="200" cy="160" r="120" fill="#fff" opacity={0.6} />
      <Ellipse cx="200" cy="246" rx="96" ry="9" fill="#1E1428" opacity={0.08} />
      <Rect x="130" y="150" width="140" height="94" rx="5" fill={box} />
      <Rect x="190" y="150" width="20" height="94" fill="url(#gold)" />
      <Rect x="120" y="124" width="160" height="32" rx="6" fill={lid} />
      <Rect x="190" y="124" width="20" height="32" fill="url(#gold)" />
      <Bow x={200} y={122} scale={0.75} />
      <Path d={sparkle(300, 90, 10)} fill="#C8A26A" />
      <Path d={sparkle(100, 120, 6)} fill="#E0456B" opacity={0.7} />
    </Svg>
  );
}

/* ------------------------------------------------------------------ */
/* Fonds décoratifs des boutiques                                       */
/* ------------------------------------------------------------------ */

/** Générateur pseudo-aléatoire déterministe : la même boutique a toujours le même décor. */
const rand = (seed: number) => () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
/** Graine numérique à partir d'un identifiant (somme des codes de caractères). */
export const seedOf = (s: string) => [...s].reduce((a, c) => a + c.charCodeAt(0), 0);

const PALETTES = [
  ['#E0456B', '#C8A26A', '#F2B8C6', '#FFFFFF'],
  ['#C8A26A', '#EAD3A2', '#E0456B', '#FFFFFF'],
  ['#A98BE0', '#E0456B', '#C8A26A', '#FFFFFF'],
  ['#22C99A', '#C8A26A', '#F2B8C6', '#FFFFFF'],
];

/** Fond décoratif posé en absolu dans un conteneur (à placer dans une View `overflow-hidden`). */
export function Decor({ seed = 0, variant, opacity = 0.9 }: { seed?: number; variant?: number; opacity?: number }) {
  const r = rand(seed + 7);
  const v = variant ?? seed % 5;
  const pal = PALETTES[seed % PALETTES.length];
  const col = () => pal[Math.floor(r() * pal.length)];
  const items: React.ReactNode[] = [];

  if (v === 0) { // confettis
    for (let i = 0; i < 46; i++) {
      const x = r() * 800, y = r() * 300, w = 6 + r() * 10, rot = r() * 180;
      items.push(r() > 0.5
        ? <Rect key={i} x={x} y={y} width={w} height={w * 0.45} rx="1.5" fill={col()} transform={`rotate(${rot} ${x} ${y})`} />
        : <Circle key={i} cx={x} cy={y} r={2 + r() * 3.5} fill={col()} />);
    }
  } else if (v === 1) { // ballons
    for (let i = 0; i < 9; i++) {
      const x = 40 + i * 90 + r() * 30, y = 40 + r() * 170, s = 22 + r() * 18, c = col();
      items.push(
        <G key={i}>
          <Path d={`M${x} ${y + s * 1.2} q -10 30 6 70`} stroke={c} strokeOpacity={0.6} fill="none" />
          <Ellipse cx={x} cy={y} rx={s} ry={s * 1.2} fill={c} />
          <Ellipse cx={x - s * 0.35} cy={y - s * 0.45} rx={s * 0.2} ry={s * 0.32} fill="#fff" opacity={0.35} />
        </G>,
      );
    }
  } else if (v === 2) { // rubans ondulés
    for (let i = 0; i < 6; i++) {
      const y = 20 + i * 52 + r() * 20;
      items.push(<Path key={i} d={`M-20 ${y} C 120 ${y - 40}, 220 ${y + 40}, 360 ${y} S 600 ${y - 40}, 820 ${y}`} stroke={col()} strokeWidth={5 + r() * 6} fill="none" strokeLinecap="round" opacity={0.8} />);
    }
  } else if (v === 3) { // étoiles
    for (let i = 0; i < 34; i++) items.push(<Path key={i} d={sparkle(r() * 800, r() * 300, 4 + r() * 12)} fill={col()} />);
  } else { // petits cadeaux
    for (let i = 0; i < 16; i++) {
      const x = r() * 760, y = r() * 260, s = 18 + r() * 18, c = col();
      items.push(
        <G key={i} transform={`rotate(${r() * 30 - 15} ${x + s / 2} ${y + s / 2})`}>
          <Rect x={x} y={y} width={s} height={s} rx="3" fill={c} />
          <Rect x={x + s / 2 - 2} y={y} width="4" height={s} fill="#fff" opacity={0.7} />
          <Rect x={x} y={y + s / 2 - 2} width={s} height="4" fill="#fff" opacity={0.7} />
        </G>,
      );
    }
  }
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity }}>
      <Svg width="100%" height="100%" viewBox="0 0 800 300" preserveAspectRatio="xMidYMid slice">{items}</Svg>
    </View>
  );
}

/** Logo Happy : pastille rose + nom en Cormorant. */
export function Logo({ light = false }: { light?: boolean }) {
  return (
    <View className="flex-row items-center" accessibilityLabel="Happy">
      <View className="h-9 w-9 items-center justify-center rounded-xl bg-candy" style={shadow.sm}>
        <Gift size={18} color="#fff" strokeWidth={2.2} />
      </View>
      <Text className="ml-2.5 font-display text-[26px]" style={{ color: light ? '#fff' : colors.ink }}>Happy</Text>
    </View>
  );
}
