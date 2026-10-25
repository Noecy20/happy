'use client';
import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { daysUntil, formatDate, formatPrice } from '@/lib/utils';

// Types minimaux des données chargées par la page admin
type Profile = { id: string; full_name: string; created_at: string; access_expires_at: string | null };
type Ext = { id: string; user_id: string; kind: string; days_requested: number; status: string; created_at: string; amount?: number };
type Vendor = { id: string; name: string; active: boolean; status: string };
type Ev = { owner_id: string; title: string | null; celebrant_name: string; birthday_date: string; published: boolean; theme_color: string | null };

const accessState = (p: Profile) =>
  !p.access_expires_at ? 'jamais' : new Date(p.access_expires_at) > new Date() ? 'actif' : 'expire';

/* ------------------------------ Tableau de bord ------------------------------ */

const CHART = '#4A5BB5'; // indigo moyen, validé (luminosité, chroma, contraste sur blanc)

/** Inscriptions des 8 dernières semaines (semaines commençant le lundi). */
function weeklySignups(profiles: Profile[]) {
  const monday = new Date(); monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return Array.from({ length: 8 }, (_, i) => {
    const start = new Date(monday); start.setDate(start.getDate() - (7 - i) * 7);
    const end = new Date(start); end.setDate(end.getDate() + 7);
    const v = profiles.filter((p) => { const d = new Date(p.created_at); return d >= start && d < end; }).length;
    return { start, v, label: start.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) };
  });
}

function WeeklyChart({ data }: { data: { label: string; v: number }[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 560, H = 200, L = 30, R = 8, T = 14, B = 28;
  const top = Math.max(4, Math.ceil(Math.max(...data.map((d) => d.v)) / 2) * 2);
  const y = (v: number) => T + (H - T - B) * (1 - v / top);
  const band = (W - L - R) / data.length;
  const bw = Math.min(24, band * 0.5);
  const bar = (x: number, v: number) => {
    const yt = y(v), h = H - B - yt, r = Math.min(4, h);
    return `M${x} ${H - B}V${yt + r}Q${x} ${yt} ${x + r} ${yt}H${x + bw - r}Q${x + bw} ${yt} ${x + bw} ${yt + r}V${H - B}Z`;
  };
  const last = data.length - 1;
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Inscriptions par semaine, 8 dernières semaines">
        {[0, top / 2, top].map((t) => (
          <g key={t}>
            <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="#14112B" strokeOpacity=".08" />
            <text x={L - 8} y={y(t)} textAnchor="end" dominantBaseline="middle" fontSize="11" fill="#14112B" fillOpacity=".5">{t}</text>
          </g>
        ))}
        {data.map((d, i) => {
          const x = L + band * i + (band - bw) / 2;
          return (
            <g key={i}>
              {d.v > 0 && <path d={bar(x, d.v)} fill={CHART} opacity={hover === null || hover === i ? 1 : 0.45} />}
              {i === last && <text x={x + bw / 2} y={y(d.v) - 6} textAnchor="middle" fontSize="12" fontWeight="700" fill="#14112B">{d.v}</text>}
              <text x={x + bw / 2} y={H - 8} textAnchor="middle" fontSize="11" fill="#14112B" fillOpacity=".55">{d.label}</text>
              {/* Zone de survol plus large que la barre */}
              <rect x={L + band * i} y={T} width={band} height={H - T - B} fill="transparent"
                onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} />
            </g>
          );
        })}
      </svg>
      {hover !== null && (
        <div className="pointer-events-none absolute -translate-x-1/2 rounded-lg bg-ink px-3 py-2 text-xs text-white shadow-pop"
          style={{ left: `${((L + band * hover + band / 2) / W) * 100}%`, top: 0 }}>
          <p className="font-semibold text-white/70">Semaine du {data[hover].label}</p>
          <p className="mt-0.5 flex items-center gap-1.5 font-bold"><span className="h-2 w-2 rounded-full" style={{ background: CHART }} />{data[hover].v} inscription{data[hover].v > 1 ? 's' : ''}</p>
        </div>
      )}
      <table className="sr-only">
        <caption>Inscriptions par semaine</caption>
        <thead><tr><th>Semaine du</th><th>Inscriptions</th></tr></thead>
        <tbody>{data.map((d) => <tr key={d.label}><td>{d.label}</td><td>{d.v}</td></tr>)}</tbody>
      </table>
    </div>
  );
}

export default function Overview({ profiles, celebrants, exts, vendors, events, pendingOf, onOpen, onNav }: {
  profiles: Profile[]; celebrants: Profile[]; exts: Ext[]; vendors: Vendor[]; events: Ev[];
  pendingOf: Record<string, Ext>; onOpen: (id: string) => void; onNav: (tab: string) => void;
}) {
  const pendingVendors = vendors.filter((v) => v.status === 'en_attente');
  const toDo = Object.keys(pendingOf).length + pendingVendors.length;
  const active = celebrants.filter((p) => accessState(p) === 'actif').length;
  const online = vendors.filter((v) => v.active && v.status !== 'refusee').length;
  const now = new Date();
  const paidMonth = exts.filter((x) => x.status === 'acceptee' && x.amount && new Date(x.created_at).getMonth() === now.getMonth() && new Date(x.created_at).getFullYear() === now.getFullYear())
    .reduce((a, x) => a + Number(x.amount || 0), 0);
  const weeks = weeklySignups(profiles);
  const nameOf = (id: string) => profiles.find((p) => p.id === id)?.full_name || 'Sans nom';
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = events.filter((e) => e.birthday_date >= today).sort((a, b) => a.birthday_date.localeCompare(b.birthday_date)).slice(0, 6);
  const queue = [
    ...Object.values(pendingOf).map((r) => ({ id: r.id, who: nameOf(r.user_id), what: `${r.kind === 'acces' ? 'Accès' : 'Prolongation'}, ${r.days_requested} jours${r.amount ? `, ${formatPrice(r.amount)}` : ''}`, open: () => onOpen(r.user_id) })),
    ...pendingVendors.map((v) => ({ id: v.id, who: v.name, what: 'Boutique à valider', open: () => onNav('demandes') })),
  ].slice(0, 5);

  const kpis = [
    { v: toDo, l: 'À traiter', h: 'demandes d’accès et boutiques', alert: toDo > 0, go: 'demandes' },
    { v: active, l: 'Accès actifs', h: `sur ${celebrants.length} célébrant${celebrants.length > 1 ? 's' : ''}`, go: 'users' },
    { v: online, l: 'Boutiques en ligne', h: `sur ${vendors.length} inscrite${vendors.length > 1 ? 's' : ''}`, go: 'boutiques' },
    { v: formatPrice(paidMonth), l: 'Paiements validés', h: now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) },
  ];

  return (
    <div className="space-y-6">
      <section className="panel grid grid-cols-2 lg:grid-cols-4">
        {kpis.map((k, i) => (
          <button key={k.l} onClick={() => k.go && onNav(k.go)} disabled={!k.go}
            className={`p-5 text-left enabled:hover:bg-paper ${i % 2 ? 'border-l border-ink/10' : ''} ${i > 1 ? 'border-t border-ink/10 lg:border-t-0' : ''} ${i === 2 ? 'lg:border-l' : ''}`}>
            <p className="flex items-center gap-2 text-sm font-semibold text-ink/65">
              {k.alert && <span className="h-2 w-2 rounded-full bg-candy" aria-hidden />}{k.l}
            </p>
            <p className="mt-1 font-display text-3xl tabular-nums">{k.v}</p>
            <p className="mt-0.5 text-xs text-ink/55">{k.h}</p>
          </button>
        ))}
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
        <section className="panel p-5">
          <h2 className="text-lg">Inscriptions par semaine</h2>
          <p className="text-sm text-ink/60">Célébrants et boutiques, 8 dernières semaines</p>
          <div className="mt-4"><WeeklyChart data={weeks} /></div>
        </section>

        <section className="panel flex flex-col">
          <div className="flex items-baseline justify-between border-b border-ink/10 p-5">
            <h2 className="text-lg">À traiter</h2>
            <button onClick={() => onNav('demandes')} className="text-sm font-bold text-candy hover:underline">Tout voir</button>
          </div>
          {queue.length === 0 ? <p className="p-5 text-sm text-ink/60">Rien à traiter pour l’instant.</p> : (
            <ul className="divide-y divide-ink/10">
              {queue.map((q) => (
                <li key={q.id}><button onClick={q.open} className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-paper">
                  <span className="min-w-0 flex-1"><span className="block truncate font-bold">{q.who}</span><span className="block truncate text-sm text-ink/60">{q.what}</span></span>
                  <ChevronRight size={16} className="shrink-0 text-ink/30" />
                </button></li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="panel">
        <div className="border-b border-ink/10 p-5"><h2 className="text-lg">Prochains anniversaires</h2></div>
        {upcoming.length === 0 ? <p className="p-5 text-sm text-ink/60">Aucun anniversaire à venir.</p> : (
          <ul className="divide-y divide-ink/10">
            {upcoming.map((e) => {
              const d = daysUntil(e.birthday_date);
              return (
                <li key={e.owner_id}><button onClick={() => onOpen(e.owner_id)} className="flex w-full items-center gap-4 px-5 py-3 text-left hover:bg-paper">
                  <span className="h-8 w-8 shrink-0 rounded-full ring-1 ring-ink/10" style={{ background: e.theme_color || '#D6336C' }} aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold">{e.title || `Anniversaire de ${e.celebrant_name}`}</span>
                    <span className="block text-sm text-ink/60">{formatDate(e.birthday_date, { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                  </span>
                  <span className="hidden text-sm font-semibold text-ink/65 sm:block">{d <= 0 ? 'Aujourd’hui' : `Dans ${d} jour${d > 1 ? 's' : ''}`}</span>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${e.published ? 'bg-mint/15 text-mint' : 'bg-ink/5 text-ink/60'}`}>{e.published ? 'Publiée' : 'Brouillon'}</span>
                </button></li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

