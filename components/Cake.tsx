'use client';
import { motion } from 'framer-motion';
import { useId } from 'react';

/** Gâteau animé : une bougie par année (jusqu'à 36 dessinées). */
// Bord de glaçage qui coule, entre x0 et x1
const drip = (x0: number, x1: number, top: number, base: number, n: number) => {
  const w = (x1 - x0) / n;
  let d = `M${x0} ${top + 8} Q${x0} ${top} ${x0 + 10} ${top} H${x1 - 10} Q${x1} ${top} ${x1} ${top + 8} V${base}`;
  for (let i = n; i > 0; i--) {
    const xa = x0 + i * w, xm = xa - w / 2, deep = i % 2 ? 14 : 8;
    d += ` Q${xm} ${base + deep} ${xa - w} ${base}`;
  }
  return d + 'Z';
};

export default function Cake({ age, color = '#D6336C', className = '' }: { age: number; color?: string; className?: string }) {
  const p = useId().replace(/[^a-zA-Z0-9]/g, '');
  const n = Math.max(1, Math.min(age || 1, 36));
  const perRow = n <= 12 ? n : Math.ceil(n / Math.ceil(n / 12));
  const rows: number[][] = [];
  for (let i = 0; i < n; i += perRow) rows.push(Array.from({ length: Math.min(perRow, n - i) }, (_, k) => i + k));
  const rowY = rows.length === 1 ? [96] : rows.length === 2 ? [90, 101] : [86, 95, 104];
  const STRIPES = ['#F2A93B', color, '#FFFFFF'];

  return (
    <svg viewBox="0 0 320 270" className={className} role="img" aria-label={`Gâteau avec ${age} bougies`}>
      <defs>
        <linearGradient id={`${p}t`} x1="0" x2="1"><stop offset="0" stopColor="#FFF7F2" /><stop offset=".7" stopColor="#F6E3DA" /><stop offset="1" stopColor="#E8CDBF" /></linearGradient>
        <linearGradient id={`${p}b`} x1="0" x2="1"><stop offset="0" stopColor={color} stopOpacity=".85" /><stop offset=".6" stopColor={color} /><stop offset="1" stopColor="#000" stopOpacity=".25" /></linearGradient>
        <linearGradient id={`${p}f`} x1="0" y1="1" x2="0" y2="0"><stop offset="0" stopColor="#F27A1A" /><stop offset=".55" stopColor="#FFC94A" /><stop offset="1" stopColor="#FFF4C2" /></linearGradient>
        <radialGradient id={`${p}g`}><stop offset="0" stopColor="#FFD36B" stopOpacity=".55" /><stop offset="1" stopColor="#FFD36B" stopOpacity="0" /></radialGradient>
      </defs>

      <ellipse cx="160" cy="246" rx="150" ry="16" fill="#14112B" opacity=".1" />
      <ellipse cx="160" cy="238" rx="138" ry="14" fill="#fff" stroke="#14112B" strokeOpacity=".08" />

      {/* étage du bas */}
      <rect x="28" y="152" width="264" height="84" rx="10" fill={`url(#${p}b)`} />
      <rect x="28" y="152" width="264" height="84" rx="10" fill={color} opacity=".25" />
      <path d={drip(28, 292, 150, 172, 14)} fill={`url(#${p}t)`} />
      <g fill="#F2A93B" opacity=".9">{[58, 98, 140, 180, 222, 262].map((x) => <circle key={x} cx={x} cy={210} r="3.2" />)}</g>

      {/* étage du haut */}
      <rect x="58" y="96" width="204" height="62" rx="8" fill={`url(#${p}t)`} />
      <path d={drip(58, 262, 96, 114, 11)} fill={color} />
      <ellipse cx="160" cy="97" rx="102" ry="11" fill="#FFF7F2" />

      {/* bougies */}
      {rows.map((row, ri) =>
        row.map((idx, ci) => {
          const span = 176;
          const x = 160 - span / 2 + (row.length === 1 ? span / 2 : (span / (row.length - 1)) * ci) + (ri % 2 ? 4 : 0);
          const y = rowY[ri];
          const h = 26;
          return (
            <motion.g key={idx} initial={{ opacity: 0, y: -18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + idx * 0.05, type: 'spring', stiffness: 220, damping: 16 }}>
              <rect x={x - 3} y={y - h} width="6" height={h} rx="2" fill={STRIPES[idx % 3]} stroke="#14112B" strokeOpacity=".12" />
              <line x1={x} y1={y - h} x2={x} y2={y - h - 4} stroke="#22306B" strokeWidth="1.2" />
              <motion.g initial={{ opacity: 0, scale: 0.2 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5 + n * 0.05 + idx * 0.03 }} style={{ transformOrigin: `${x}px ${y - h - 4}px` }}>
                <circle cx={x} cy={y - h - 10} r="11" fill={`url(#${p}g)`} />
                <path className="flame" style={{ animationDelay: `${(idx % 5) * 0.13}s` }}
                  d={`M${x} ${y - h - 18} C ${x + 5} ${y - h - 11}, ${x + 4.5} ${y - h - 4}, ${x} ${y - h - 3.5} C ${x - 4.5} ${y - h - 4}, ${x - 5} ${y - h - 11}, ${x} ${y - h - 18}Z`}
                  fill={`url(#${p}f)`} />
              </motion.g>
            </motion.g>
          );
        })
      )}
    </svg>
  );
}
