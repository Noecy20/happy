'use client';
import { useId } from 'react';
import { WaxPattern } from './Wax';
/* Illustrations vectorielles Happy — aucune dépendance externe, nettes à toutes les tailles */

const sparkle = (x: number, y: number, s: number) =>
  `M${x} ${y - s}Q${x} ${y} ${x + s} ${y}Q${x} ${y} ${x} ${y + s}Q${x} ${y} ${x - s} ${y}Q${x} ${y} ${x} ${y - s}Z`;

function Bow({ x, y, scale = 1, p }: { x: number; y: number; scale?: number; p: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <path d="M-4 4 L-26 44 L-14 40 L-8 52 L2 8Z" fill={`url(#${p}gold-d)`} />
      <path d="M4 4 L26 44 L14 40 L8 52 L-2 8Z" fill={`url(#${p}gold-d)`} />
      <ellipse cx="-24" cy="-10" rx="26" ry="15" transform="rotate(-22 -24 -10)" fill={`url(#${p}gold)`} />
      <ellipse cx="-22" cy="-9" rx="13" ry="6" transform="rotate(-22 -22 -9)" fill="#A86412" opacity=".45" />
      <ellipse cx="24" cy="-10" rx="26" ry="15" transform="rotate(22 24 -10)" fill={`url(#${p}gold)`} />
      <ellipse cx="22" cy="-9" rx="13" ry="6" transform="rotate(22 22 -9)" fill="#A86412" opacity=".45" />
      <rect x="-9" y="-12" width="18" height="18" rx="6" fill={`url(#${p}gold-d)`} />
    </g>
  );
}

function Defs({ p }: { p: string }) {
  return (
    <defs>
      {/* Tissus wax : hibiscus (anneaux), indigo (losanges), safran (éventails) */}
      <WaxPattern id={`${p}rose`} variant={0} size={46} colors={{ bg: '#D6336C', accent: '#F2A93B' }} />
      <WaxPattern id={`${p}rose-lid`} variant={0} size={46} colors={{ bg: '#C02A60', accent: '#F2A93B' }} />
      <WaxPattern id={`${p}plum`} variant={1} size={52} colors={{ bg: '#22306B', accent: '#D6336C' }} />
      <WaxPattern id={`${p}plum-lid`} variant={1} size={52} colors={{ bg: '#1B2758', accent: '#D6336C' }} />
      <WaxPattern id={`${p}cream`} variant={2} size={36} colors={{ bg: '#F2A93B', accent: '#22306B', light: '#FFFBF5' }} />
      <linearGradient id={`${p}gold`} x1="0" x2="1">
        <stop offset="0" stopColor="#C9821C" /><stop offset=".5" stopColor="#FFD27A" /><stop offset="1" stopColor="#C9821C" />
      </linearGradient>
      <linearGradient id={`${p}gold-d`} x1="0" x2="1">
        <stop offset="0" stopColor="#B8741A" /><stop offset="1" stopColor="#F2B451" />
      </linearGradient>
      <radialGradient id={`${p}halo`} cx=".5" cy=".5" r=".5">
        <stop offset="0" stopColor="#ECEFFA" /><stop offset="1" stopColor="#ECEFFA" stopOpacity="0" />
      </radialGradient>
      <linearGradient id={`${p}balloon-r`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#E8578A" /><stop offset="1" stopColor="#B8255A" />
      </linearGradient>
      <linearGradient id={`${p}balloon-g`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#FFC766" /><stop offset="1" stopColor="#E0911F" />
      </linearGradient>
    </defs>
  );
}

function Balloon({ x, y, fill, r = 34 }: { x: number; y: number; fill: string; r?: number }) {
  return (
    <g>
      <path d={`M${x} ${y + r * 1.2} C ${x - 10} ${y + r * 2}, ${x + 14} ${y + r * 2.6}, ${x - 4} ${y + r * 3.6}`} stroke="#F2A93B" strokeWidth="1.5" fill="none" />
      <ellipse cx={x} cy={y} rx={r} ry={r * 1.18} fill={fill} />
      <ellipse cx={x - r * 0.35} cy={y - r * 0.45} rx={r * 0.22} ry={r * 0.34} fill="#fff" opacity=".35" transform={`rotate(-25 ${x - r * 0.35} ${y - r * 0.45})`} />
      <path d={`M${x - 5} ${y + r * 1.18 + 6} L${x} ${y + r * 1.14} L${x + 5} ${y + r * 1.18 + 6}Z`} fill={fill} />
    </g>
  );
}

/** Composition principale : pile de cadeaux + ballons */
export function GiftStack({ className = '', dark = false }: { className?: string; dark?: boolean }) {
  const p = useId().replace(/[^a-zA-Z0-9]/g, '');
  return (
    <svg viewBox="0 0 480 460" className={className} role="img" aria-label="Pile de cadeaux emballés et ballons">
      <Defs p={p} />
      {!dark && <circle cx="240" cy="235" r="215" fill={`url(#${p}halo)`} />}

      <Balloon x={120} y={92} fill={`url(#${p}balloon-r)`} />
      <Balloon x={176} y={62} r={26} fill={`url(#${p}balloon-g)`} />

      {/* ombre au sol */}
      <ellipse cx="240" cy="408" rx="190" ry="16" fill={dark ? '#000' : '#14112B'} opacity={dark ? 0.35 : 0.1} />

      {/* grand cadeau aubergine (arrière droite) */}
      <rect x="268" y="186" width="136" height="216" rx="6" fill={`url(#${p}plum)`} />
      <rect x="326" y="186" width="20" height="216" fill={`url(#${p}gold)`} />
      <rect x="258" y="158" width="156" height="38" rx="6" fill={`url(#${p}plum-lid)`} />
      <rect x="326" y="158" width="20" height="38" fill={`url(#${p}gold)`} />
      <rect x="258" y="190" width="156" height="6" fill="#000" opacity=".15" />
      <Bow x={336} y={156} scale={0.9} p={p} />

      {/* cadeau rose (avant gauche) */}
      <rect x="72" y="238" width="200" height="164" rx="6" fill={`url(#${p}rose)`} />
      <rect x="72" y="302" width="200" height="20" fill={`url(#${p}gold)`} opacity=".95" />
      <rect x="160" y="238" width="22" height="164" fill={`url(#${p}gold)`} />
      <rect x="60" y="208" width="224" height="42" rx="7" fill={`url(#${p}rose-lid)`} />
      <rect x="160" y="208" width="22" height="42" fill={`url(#${p}gold)`} />
      <rect x="60" y="244" width="224" height="6" fill="#000" opacity=".12" />
      <Bow x={171} y={206} p={p} />

      {/* petit cadeau crème (devant) */}
      <rect x="232" y="330" width="112" height="72" rx="5" fill={`url(#${p}cream)`} />
      <rect x="280" y="330" width="16" height="72" fill={`url(#${p}rose)`} />
      <rect x="224" y="312" width="128" height="26" rx="5" fill="#FFE3B0" />
      <rect x="280" y="312" width="16" height="26" fill={`url(#${p}rose-lid)`} />
      <rect x="224" y="334" width="128" height="4" fill="#000" opacity=".08" />

      {/* éclats */}
      <path d={sparkle(420, 110, 14)} fill="#F2A93B" />
      <path d={sparkle(448, 150, 7)} fill="#D6336C" />
      <path d={sparkle(58, 190, 9)} fill="#F2A93B" />
      <path d={sparkle(250, 118, 6)} fill="#D6336C" opacity=".8" />
      <circle cx="400" cy="70" r="4" fill="#D6336C" opacity=".6" />
      <circle cx="40" cy="300" r="3.5" fill="#F2A93B" />
      <circle cx="444" cy="270" r="3" fill="#22306B" opacity=".4" />
    </svg>
  );
}

/** Fond de carte quand un cadeau n'a pas de photo */
export function GiftPlaceholder({ tone = 'rose' }: { tone?: 'rose' | 'plum' | 'cream' }) {
  const p = useId().replace(/[^a-zA-Z0-9]/g, '');
  const box = tone === 'plum' ? `url(#${p}plum)` : tone === 'cream' ? `url(#${p}cream)` : `url(#${p}rose)`;
  const lid = tone === 'plum' ? `url(#${p}plum-lid)` : tone === 'cream' ? '#FFE3B0' : `url(#${p}rose-lid)`;
  return (
    <svg viewBox="0 0 400 300" className="h-full w-full" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <Defs p={p} />
      <rect width="400" height="300" fill="#ECEFFA" />
      <circle cx="200" cy="160" r="120" fill="#fff" opacity=".6" />
      <ellipse cx="200" cy="246" rx="96" ry="9" fill="#14112B" opacity=".08" />
      <rect x="130" y="150" width="140" height="94" rx="5" fill={box} />
      <rect x="190" y="150" width="20" height="94" fill={`url(#${p}gold)`} />
      <rect x="120" y="124" width="160" height="32" rx="6" fill={lid} />
      <rect x="190" y="124" width="20" height="32" fill={`url(#${p}gold)`} />
      <Bow x={200} y={122} scale={0.75} p={p} />
      <path d={sparkle(300, 90, 10)} fill="#F2A93B" />
      <path d={sparkle(100, 120, 6)} fill="#D6336C" opacity=".7" />
    </svg>
  );
}
