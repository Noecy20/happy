'use client';
import { useEffect, useState } from 'react';
import { Cake, PartyPopper } from 'lucide-react';

export default function Countdown({ date, color = '#14112B', onDark = false, compact = false }: { date: string; color?: string; onDark?: boolean; compact?: boolean }) {
  const target = new Date(date + 'T00:00:00').getTime();
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => { setNow(Date.now()); const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  if (now === null) return <div className={compact ? 'h-6' : 'h-[74px]'} />;
  const diff = Math.max(0, target - now);
  if (diff === 0) {
    const today = now < target + 86400000;
    const Icon = today ? Cake : PartyPopper;
    return <p className={`inline-flex items-center gap-2 font-display ${compact ? 'text-base' : 'text-3xl'}`} style={{ color }}><Icon size={compact ? 16 : 28} />{today ? 'C’est aujourd’hui' : 'La fête est passée'}</p>;
  }
  const parts = [
    { v: Math.floor(diff / 86400000), l: 'jours' },
    { v: Math.floor((diff / 3600000) % 24), l: 'heures' },
    { v: Math.floor((diff / 60000) % 60), l: 'min' },
    { v: Math.floor((diff / 1000) % 60), l: 'sec' },
  ];
  // Version en ligne : « 55 j 11 h 16 min »
  if (compact)
    return <p className="font-bold tabular-nums" style={{ color }} aria-label="Compte à rebours">{parts[0].v} j {parts[1].v} h {parts[2].v} min</p>;
  return (
    <div className="flex gap-2 sm:gap-3" aria-label="Compte à rebours">
      {parts.map((p) => (
        <div key={p.l} className={`min-w-[62px] rounded-2xl px-2 py-2.5 text-center sm:min-w-[72px] ${onDark ? 'bg-white/10 text-white backdrop-blur' : 'border border-ink/[0.07] bg-white shadow-popsm'}`}>
          <div className="font-display text-3xl font-semibold tabular-nums leading-none" style={onDark ? undefined : { color }}>{String(p.v).padStart(2, '0')}</div>
          <div className={`mt-1 text-[11px] font-semibold ${onDark ? 'text-white/70' : 'text-ink/50'}`}>{p.l}</div>
        </div>
      ))}
    </div>
  );
}
