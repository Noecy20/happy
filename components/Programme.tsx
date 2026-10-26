'use client';
import { Cake, Check, Clock, Crown, Gift, Moon, Music, Shirt, Sparkles, Sun, Wine } from 'lucide-react';
import { themeTones } from './Invitation';

export type ProgramStep = {
  time?: string; label?: string; tagline?: string; title?: string; text?: string; image_url?: string; dress?: string; icon?: string;
};

/** Icônes proposées pour chaque étape du déroulé. */
export const STEP_ICONS = { lune: Moon, horloge: Clock, couronne: Crown, musique: Music, soleil: Sun, gateau: Cake, verre: Wine, etoile: Sparkles, cadeau: Gift };
export type StepIcon = keyof typeof STEP_ICONS;

/** Déroulé de la soirée : une frise, une étape par ligne (heure, photo, programme, tenue). */
export default function Programme({ steps, color, palette = [], reminders = [] }: {
  steps: ProgramStep[]; color: string; palette?: string[]; reminders?: string[];
}) {
  const { deep, paper, line } = themeTones(color);
  const list = steps.filter((s) => s.title?.trim() || s.time?.trim());
  if (!list.length && !palette.length && !reminders.length) return null;
  return (
    <section className="px-5 py-16" style={{ background: paper, color: deep }}>
      <div className="mx-auto max-w-5xl">
        <h2 className="flex items-center gap-4 font-book text-4xl font-semibold sm:text-5xl" style={{ color: deep }}>
          <span className="h-px flex-1" style={{ background: line }} />Le programme<span className="h-px flex-1" style={{ background: line }} />
        </h2>

        {list.length > 0 && (
          <ol className="mt-10">
            {list.map((s, i) => {
              const Icon = STEP_ICONS[(s.icon as StepIcon) || 'horloge'] || Clock;
              const last = i === list.length - 1;
              return (
                <li key={i} className={`relative grid gap-5 py-7 pl-16 md:gap-7 md:pl-0 ${s.image_url ? 'md:grid-cols-[210px_220px_1fr_190px]' : 'md:grid-cols-[210px_1fr_190px]'}`}
                  style={{ borderTop: i ? `1px solid ${line}` : undefined }}>
                  {/* Frise : pastille + trait vers l'étape suivante */}
                  {!last && <span className="absolute -bottom-7 left-[19px] top-[68px] z-0 w-px" style={{ background: line }} aria-hidden />}
                  <div className="md:flex md:gap-4">
                    <span className="absolute left-0 top-7 z-10 grid h-10 w-10 place-items-center rounded-full md:relative md:top-0 md:shrink-0" style={{ background: deep, color: paper }}><Icon size={18} /></span>
                    <div>
                      {s.time && <p className="font-book text-[1.7rem] font-bold leading-none">{s.time}</p>}
                      {s.label && <p className="mt-1.5 text-sm font-bold opacity-80">{s.label}</p>}
                      {s.tagline && <p className="mt-1 font-book text-xl italic" style={{ color }}>{s.tagline}</p>}
                    </div>
                  </div>
                  {s.image_url && (
                    <div className="aspect-[4/3] overflow-hidden rounded-xl">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={s.image_url} alt="" className="h-full w-full object-cover" />
                    </div>
                  )}
                  <div>
                    {s.title && <h3 className="font-book text-2xl font-semibold leading-tight" style={{ color: deep }}>{s.title}</h3>}
                    {s.text && <p className="mt-2 whitespace-pre-line leading-relaxed opacity-85">{s.text}</p>}
                  </div>
                  {s.dress ? (
                    <div className="md:border-l md:pl-5" style={{ borderColor: line }}>
                      <p className="flex items-center gap-2 text-sm font-bold"><Shirt size={16} />Tenue</p>
                      <p className="mt-1 whitespace-pre-line text-sm leading-relaxed opacity-85">{s.dress}</p>
                    </div>
                  ) : <div className="hidden md:block" />}
                </li>
              );
            })}
          </ol>
        )}

        {(palette.length > 0 || reminders.length > 0) && (
          <div className="mt-10 grid gap-8 rounded-2xl p-6 sm:p-8 md:grid-cols-2" style={{ background: `color-mix(in srgb, ${color} 10%, #FFFFFF)` }}>
            {palette.length > 0 && (
              <div>
                <p className="font-book text-2xl font-semibold">Les couleurs officielles</p>
                <div className="mt-4 flex flex-wrap gap-3">
                  {palette.map((c) => <span key={c} className="h-12 w-12 rounded-full ring-4 ring-white" style={{ background: c, boxShadow: '0 0 0 1px rgba(0,0,0,.08)' }} title={c} />)}
                </div>
              </div>
            )}
            {reminders.length > 0 && (
              <div>
                <p className="font-book text-2xl font-semibold">À ne pas oublier</p>
                <ul className="mt-4 space-y-2">
                  {reminders.map((r) => <li key={r} className="flex gap-2.5"><Check size={18} className="mt-0.5 shrink-0" style={{ color }} />{r}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
