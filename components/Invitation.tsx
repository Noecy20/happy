'use client';
import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Clock, MapPin, MailOpen, X } from 'lucide-react';
import { formatDate, readableOn } from '@/lib/utils';

/** Tons de l'invitation tirés de la couleur de la fête : encre foncée lisible, papier légèrement teinté. */
export function themeTones(color: string) {
  const dark = readableOn(color) === '#fff';
  return {
    deep: dark ? `color-mix(in srgb, ${color} 82%, #14112B)` : `color-mix(in srgb, ${color} 35%, #2B1D12)`,
    paper: `color-mix(in srgb, ${color} 7%, #FFFDF8)`,
    line: `color-mix(in srgb, ${color} 30%, #E8DFD3)`,
  };
}

type Props = {
  title?: string | null; name: string; age?: number; color: string; date: string; time?: string | null;
  place?: string | null; details?: string | null; dressCode?: string | null; images?: string[]; palette?: string[];
};

/** Photos d'exemple du thème : miniatures qui défilent, agrandies au clic. */
function ThemeCarousel({ images, deep }: { images: string[]; deep: string }) {
  const [zoom, setZoom] = useState<number | null>(null);
  const moving = images.length > 3;
  const row = moving ? [...images, ...images] : images; // doublées pour un défilement continu
  return (
    <>
      <div className={`relative mt-8 overflow-hidden ${moving ? '[mask-image:linear-gradient(90deg,transparent,#000_12%,#000_88%,transparent)]' : ''}`}>
        <div className={`flex w-max gap-3 ${moving ? 'animate-[defile_32s_linear_infinite] hover:[animation-play-state:paused]' : 'mx-auto'}`}>
          {row.map((src, i) => (
            <button key={i} type="button" onClick={() => setZoom(i % images.length)} aria-label={`Voir la photo ${(i % images.length) + 1} du thème`}
              className="h-24 w-[76px] shrink-0 overflow-hidden rounded-xl ring-2 ring-white transition hover:-translate-y-0.5" style={{ boxShadow: `0 8px 18px -10px ${deep}` }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      </div>
      <AnimatePresence>
        {zoom !== null && (
          <motion.div className="fixed inset-0 z-[80] grid place-items-center bg-ink/85 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setZoom(null)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={images[zoom]} alt="" className="max-h-[82vh] max-w-full rounded-2xl object-contain" onClick={(e) => e.stopPropagation()} />
            <button aria-label="Fermer" className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white" onClick={() => setZoom(null)}><X size={22} /></button>
            {images.length > 1 && (
              <>
                <button aria-label="Photo précédente" className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white" onClick={(e) => { e.stopPropagation(); setZoom((zoom - 1 + images.length) % images.length); }}><ChevronLeft size={26} /></button>
                <button aria-label="Photo suivante" className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white" onClick={(e) => { e.stopPropagation(); setZoom((zoom + 1) % images.length); }}><ChevronRight size={26} /></button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/** Carte d'invitation dans une enveloppe qui s'ouvre. */
export default function Invitation({ title, name, age, color, date, time, place, details, dressCode, images = [], palette = [] }: Props) {
  const [open, setOpen] = useState(false);
  const ink = readableOn(color);
  const { deep, paper, line } = themeTones(color);
  const heading = title?.trim() || (age ? `Les ${age} ans de ${name}` : `L’anniversaire de ${name}`);
  const sub = title?.trim() ? (age ? `Les ${age} ans de ${name}` : `L’anniversaire de ${name}`) : null;
  const facts = [
    { i: CalendarDays, l: 'Date', v: formatDate(date, { weekday: 'long', day: 'numeric', month: 'long' }) },
    time ? { i: Clock, l: 'Heure', v: time } : null,
    place ? { i: MapPin, l: 'Lieu', v: place } : null,
  ].filter(Boolean) as { i: typeof Clock; l: string; v: string }[];

  return (
    <div className="relative mx-auto w-full max-w-[640px]" style={{ perspective: 1200 }}>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ y: 120, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 120, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 90, damping: 16, delay: 0.25 }}
            className="relative z-10 overflow-hidden rounded-[24px] px-6 py-10 text-center shadow-pop sm:px-12 sm:py-12"
            style={{ background: paper, color: deep, border: `1px solid ${line}` }}
          >
            <div className="pointer-events-none absolute inset-3 rounded-[16px]" style={{ border: `1px solid ${line}` }} />
            <p className="font-book text-xl italic opacity-80">Vous êtes invité(e)</p>
            <h3 className="mt-3 font-book text-[clamp(2.3rem,7vw,3.6rem)] font-semibold leading-[0.98]" style={{ color: deep }}>{heading}</h3>
            {sub && <p className="mt-3 font-book text-xl italic opacity-80">{sub}</p>}

            <div className="mx-auto my-7 flex max-w-[220px] items-center gap-3" aria-hidden>
              <span className="h-px flex-1" style={{ background: line }} /><span className="h-2 w-2 rotate-45" style={{ background: color }} /><span className="h-px flex-1" style={{ background: line }} />
            </div>

            <dl className={`mx-auto grid max-w-lg gap-4 ${facts.length === 3 ? 'sm:grid-cols-3' : facts.length === 2 ? 'sm:grid-cols-2' : ''}`}>
              {facts.map((f) => (
                <div key={f.l} className="flex flex-col items-center">
                  <f.i size={20} style={{ color }} />
                  <dt className="mt-1.5 text-xs font-semibold opacity-60">{f.l}</dt>
                  <dd className="mt-0.5 font-book text-lg font-semibold leading-snug first-letter:uppercase">{f.v}</dd>
                </div>
              ))}
            </dl>

            {images.length > 0 && <ThemeCarousel images={images} deep={deep} />}

            {details && <p className="mx-auto mt-8 max-w-md whitespace-pre-line font-book text-[1.15rem] leading-relaxed" style={{ color: deep }}>{details}</p>}

            {(dressCode || palette.length > 0) && (
              <div className="mx-auto mt-8 max-w-md rounded-2xl px-5 py-4" style={{ background: `color-mix(in srgb, ${color} 10%, #FFFFFF)` }}>
                <p className="text-xs font-semibold opacity-60">Dress code</p>
                {dressCode && <p className="mt-1 font-book text-lg font-semibold">{dressCode}</p>}
                {palette.length > 0 && (
                  <div className="mt-2.5 flex justify-center gap-2">
                    {palette.map((c) => <span key={c} className="h-7 w-7 rounded-full ring-2 ring-white" style={{ background: c, boxShadow: '0 0 0 1px rgba(0,0,0,.08)' }} title={c} />)}
                  </div>
                )}
              </div>
            )}

            {place && (
              <a href={`https://www.google.com/maps/search/${encodeURIComponent(place)}`} target="_blank" rel="noreferrer"
                className="mt-7 inline-flex items-center gap-1.5 text-sm font-bold underline underline-offset-4" style={{ color: deep }}>
                <MapPin size={15} />Voir sur la carte
              </a>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* enveloppe */}
      <AnimatePresence>
        {!open && (
          <motion.button
            key="env" onClick={() => setOpen(true)} aria-label="Ouvrir l’invitation"
            exit={{ opacity: 0, y: 40, transition: { duration: 0.35 } }}
            whileHover={{ y: -4 }}
            className="relative mx-auto block aspect-[3/2] w-full max-w-[520px] overflow-hidden rounded-[22px] shadow-pop"
            style={{ background: color }}
          >
            <div className="absolute inset-0" style={{ background: 'linear-gradient(160deg, rgba(255,255,255,.18), rgba(0,0,0,.12))' }} />
            <svg viewBox="0 0 300 200" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
              <path d="M0 200 L150 95 L300 200Z" fill="#000" opacity=".08" />
              <path d="M0 0 L150 120 L300 0Z" fill="#fff" opacity=".16" />
              <path d="M0 0 L150 120 L300 0" fill="none" stroke="#000" strokeOpacity=".1" />
            </svg>
            <span className="absolute left-1/2 top-[58%] grid h-20 w-20 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-4 border-white/40 bg-[#F2A93B] text-white shadow-pop">
              <MailOpen size={28} />
            </span>
            <span className="absolute inset-x-0 bottom-5 text-center text-sm font-bold" style={{ color: ink }}>
              Touchez pour ouvrir l’invitation
            </span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
