/**
 * Gâteau d'anniversaire animé (react-native-svg + reanimated).
 * - Une bougie par année, jusqu'à 36 dessinées (réparties sur 1 à 3 rangées).
 * - Les bougies apparaissent, puis les flammes vacillent en continu.
 * - La couleur du gâteau suit la couleur de thème du célébrant.
 * - Si « réduire les animations » est activé sur le téléphone, tout reste immobile.
 * Reprise du composant web components/Cake.tsx (même dessin, mêmes coordonnées).
 */
import { useEffect } from 'react';
import Animated, {
  Easing, useAnimatedProps, useReducedMotion, useSharedValue, withDelay, withRepeat, withTiming, type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, Ellipse, G, Line, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedG = Animated.createAnimatedComponent(G);

/** Bord de glaçage qui coule, entre x0 et x1 (même formule que le web). */
const drip = (x0: number, x1: number, top: number, base: number, n: number) => {
  const w = (x1 - x0) / n;
  let d = `M${x0} ${top + 8} Q${x0} ${top} ${x0 + 10} ${top} H${x1 - 10} Q${x1} ${top} ${x1} ${top + 8} V${base}`;
  for (let i = n; i > 0; i--) {
    const xa = x0 + i * w, xm = xa - w / 2, deep = i % 2 ? 14 : 8;
    d += ` Q${xm} ${base + deep} ${xa - w} ${base}`;
  }
  return d + 'Z';
};

export default function Cake({ age, color = '#E0456B', width = 260 }: { age: number; color?: string; width?: number }) {
  const reduce = useReducedMotion();
  const n = Math.max(1, Math.min(age || 1, 36));
  // Répartition des bougies en rangées de 12 maximum
  const perRow = n <= 12 ? n : Math.ceil(n / Math.ceil(n / 12));
  const rows: number[][] = [];
  for (let i = 0; i < n; i += perRow) rows.push(Array.from({ length: Math.min(perRow, n - i) }, (_, k) => i + k));
  const rowY = rows.length === 1 ? [96] : rows.length === 2 ? [90, 101] : [86, 95, 104];
  const STRIPES = ['#C8A26A', color, '#FFFFFF'];

  // `rise` : apparition des bougies (0 → 1). `flick` : horloge du vacillement des flammes.
  const rise = useSharedValue(reduce ? 1 : 0);
  const flick = useSharedValue(0);
  useEffect(() => {
    if (reduce) { rise.value = 1; return; }
    rise.value = withDelay(200, withTiming(1, { duration: 900, easing: Easing.out(Easing.back(1.4)) }));
    flick.value = withRepeat(withTiming(Math.PI * 2, { duration: 1800, easing: Easing.linear }), -1, false);
  }, [reduce, rise, flick]);

  const candlesProps = useAnimatedProps(() => ({ opacity: rise.value }));

  return (
    <Svg width={width} height={(width * 270) / 320} viewBox="0 0 320 270" accessibilityLabel={`Gâteau avec ${age} bougies`}>
      <Defs>
        <LinearGradient id="ct" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#FFF7F2" /><Stop offset="0.7" stopColor="#F6E3DA" /><Stop offset="1" stopColor="#E8CDBF" />
        </LinearGradient>
        <LinearGradient id="cb" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={color} stopOpacity="0.85" /><Stop offset="0.6" stopColor={color} /><Stop offset="1" stopColor="#000" stopOpacity="0.25" />
        </LinearGradient>
        <LinearGradient id="cf" x1="0" y1="1" x2="0" y2="0">
          <Stop offset="0" stopColor="#F27A1A" /><Stop offset="0.55" stopColor="#FFC94A" /><Stop offset="1" stopColor="#FFF4C2" />
        </LinearGradient>
        <RadialGradient id="cg" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#FFD36B" stopOpacity="0.55" /><Stop offset="1" stopColor="#FFD36B" stopOpacity="0" />
        </RadialGradient>
      </Defs>

      {/* plateau et ombre */}
      <Ellipse cx="160" cy="246" rx="150" ry="16" fill="#1E1428" opacity={0.1} />
      <Ellipse cx="160" cy="238" rx="138" ry="14" fill="#fff" stroke="#1E1428" strokeOpacity={0.08} />

      {/* étage du bas : couleur du thème */}
      <Rect x="28" y="152" width="264" height="84" rx="10" fill="url(#cb)" />
      <Rect x="28" y="152" width="264" height="84" rx="10" fill={color} opacity={0.25} />
      <Path d={drip(28, 292, 150, 172, 14)} fill="url(#ct)" />
      <G fill="#C8A26A" opacity={0.9}>{[58, 98, 140, 180, 222, 262].map((x) => <Circle key={x} cx={x} cy={210} r="3.2" />)}</G>

      {/* étage du haut : crème + glaçage coloré */}
      <Rect x="58" y="96" width="204" height="62" rx="8" fill="url(#ct)" />
      <Path d={drip(58, 262, 96, 114, 11)} fill={color} />
      <Ellipse cx="160" cy="97" rx="102" ry="11" fill="#FFF7F2" />

      {/* bougies */}
      <AnimatedG animatedProps={candlesProps}>
        {rows.map((row, ri) =>
          row.map((idx, ci) => {
            const span = 176;
            const x = 160 - span / 2 + (row.length === 1 ? span / 2 : (span / (row.length - 1)) * ci) + (ri % 2 ? 4 : 0);
            const y = rowY[ri];
            const h = 26;
            return (
              <G key={idx}>
                <Rect x={x - 3} y={y - h} width="6" height={h} rx="2" fill={STRIPES[idx % 3]} stroke="#1E1428" strokeOpacity={0.12} />
                <Line x1={x} y1={y - h} x2={x} y2={y - h - 4} stroke="#3A2150" strokeWidth="1.2" />
                <Circle cx={x} cy={y - h - 10} r="11" fill="url(#cg)" />
                <Flame x={x} base={y - h - 3.5} phase={idx * 0.9} clock={flick} />
              </G>
            );
          }),
        )}
      </AnimatedG>
    </Svg>
  );
}

/** Une flamme : sa hauteur et son inclinaison varient avec l'horloge partagée `clock`. */
function Flame({ x, base, phase, clock }: { x: number; base: number; phase: number; clock: SharedValue<number> }) {
  const props = useAnimatedProps(() => {
    const k = 1 + 0.1 * Math.sin(clock.value * 2 + phase);   // étirement vertical
    const lean = 1.2 * Math.sin(clock.value + phase);          // léger balancement
    const top = base - 14.5 * k;
    return {
      d: `M${x + lean} ${top} C ${x + 5} ${base - 7.5 * k}, ${x + 4.5} ${base - 0.5}, ${x} ${base} C ${x - 4.5} ${base - 0.5}, ${x - 5} ${base - 7.5 * k}, ${x + lean} ${top}Z`,
      opacity: 0.9 + 0.1 * Math.sin(clock.value * 3 + phase),
    };
  });
  return <AnimatedPath animatedProps={props} fill="url(#cf)" />;
}
