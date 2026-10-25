'use client';
import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { CalendarDays, Clock, MapPin, Shirt, MailOpen } from 'lucide-react';
import { formatDate, readableOn } from '@/lib/utils';

type Props = {
  name: string; age?: number; color: string; date: string; time?: string | null;
  place?: string | null; details?: string | null; dressCode?: string | null;
};

/** Carte d'invitation dans une enveloppe qui s'ouvre. */
export default function Invitation({ name, age, color, date, time, place, details, dressCode }: Props) {
  const [open, setOpen] = useState(false);
  const ink = readableOn(color);
  return (
    <div className="relative mx-auto w-full max-w-[520px]" style={{ perspective: 1200 }}>
      <div className="relative" style={{ paddingTop: open ? 0 : 0 }}>
        {/* carte */}
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ y: 120, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 120, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 90, damping: 16, delay: 0.25 }}
              className="relative z-10 overflow-hidden rounded-[28px] border border-ink/[0.07] bg-white p-8 text-center shadow-pop sm:p-10"
            >
              <div className="pointer-events-none absolute inset-x-0 top-0 h-2" style={{ background: color }} />
              <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full opacity-20 blur-2xl" style={{ background: color }} />
              <p className="text-sm font-semibold text-ink/55">Vous êtes invité(e)</p>
              <h3 className="mt-4 text-[clamp(2rem,6vw,3rem)] leading-[1.02]">
                {age ? <>Les {age} ans<br />de {name}</> : <>L’anniversaire<br />de {name}</>}
              </h3>
              <div className="mx-auto my-6 h-px w-16 bg-ink/15" />
              <ul className="mx-auto max-w-sm space-y-3 text-left text-[15px]">
                <li className="flex gap-3"><CalendarDays size={18} className="mt-0.5 shrink-0" style={{ color }} /><span className="first-letter:uppercase">{formatDate(date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span></li>
                {time && <li className="flex gap-3"><Clock size={18} className="mt-0.5 shrink-0" style={{ color }} /><span>{time}</span></li>}
                {place && <li className="flex gap-3"><MapPin size={18} className="mt-0.5 shrink-0" style={{ color }} /><span>{place}</span></li>}
                {dressCode && <li className="flex gap-3"><Shirt size={18} className="mt-0.5 shrink-0" style={{ color }} /><span>Dress code : {dressCode}</span></li>}
              </ul>
              {details && <p className="mx-auto mt-6 max-w-sm rounded-2xl bg-lilac/50 p-4 text-sm leading-relaxed text-ink/75">{details}</p>}
              {place && (
                <a href={`https://www.google.com/maps/search/${encodeURIComponent(place)}`} target="_blank" rel="noreferrer" className="btn-ghost mt-6 text-sm">
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
              className="relative block aspect-[3/2] w-full overflow-hidden rounded-[22px] shadow-pop"
              style={{ background: color }}
            >
              <div className="absolute inset-0" style={{ background: 'linear-gradient(160deg, rgba(255,255,255,.18), rgba(0,0,0,.12))' }} />
              {/* rabat inférieur */}
              <svg viewBox="0 0 300 200" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
                <path d="M0 200 L150 95 L300 200Z" fill="#000" opacity=".08" />
                <path d="M0 0 L150 120 L300 0Z" fill="#fff" opacity=".16" />
                <path d="M0 0 L150 120 L300 0" fill="none" stroke="#000" strokeOpacity=".1" />
              </svg>
              {/* cachet */}
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
    </div>
  );
}
