'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Download, X } from 'lucide-react';
import { formatDate } from '@/lib/utils';

export type GuestCard = { id: string; name: string; message?: string | null; images: string[]; gift?: string; created_at: string };

// Les pages sont dessinées à taille fixe puis mises à l'échelle (écran comme impression A5)
const DW = 420;
const DH = 596;

/** Livre d'or : couverture, une carte par page, pages qui se tournent, export PDF (A5). */
export default function GuestBook({ celebrant, age, date, color = '#22306B', photo, cards, onClose }: {
  celebrant: string; age?: number; date?: string; color?: string; photo?: string | null; cards: GuestCard[]; onClose: () => void;
}) {
  const faces = useMemo(() => {
    const list: React.ReactNode[] = [
      <Cover key="cover" celebrant={celebrant} age={age} color={color} photo={photo} />,
      <TitlePage key="title" celebrant={celebrant} age={age} date={date} count={cards.length} color={color} />,
      // Faces paires = pages de droite (recto), impaires = pages de gauche (verso)
      ...cards.map((c, i) => <CardPage key={c.id} card={c} page={i + 2} color={color} side={i % 2 === 0 ? 'right' : 'left'} />),
      <EndPage key="end" color={color} side={cards.length % 2 === 0 ? 'right' : 'left'} />,
    ];
    if (list.length % 2 === 0) list.push(<Paper key="blank" side="left" />);
    list.push(<BackCover key="back" color={color} />);
    return list;
  }, [celebrant, age, date, color, photo, cards]);

  const sheets = useMemo(() => Array.from({ length: faces.length / 2 }, (_, i) => ({ front: faces[2 * i], back: faces[2 * i + 1] })), [faces]);
  // Faces lisibles une à une sur téléphone (sans la page blanche)
  const single = useMemo(() => faces.filter((f: any) => f.key !== 'blank'), [faces]);

  const [size, setSize] = useState({ w: 380, h: 539, mobile: false });
  const [current, setCurrent] = useState(0); // nombre de feuilles tournées (livre) ou index de page (téléphone)
  const [turning, setTurning] = useState<number | null>(null);
  const [dir, setDir] = useState(1);
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    const fit = () => {
      const vw = window.innerWidth, vh = window.innerHeight;
      const mobile = vw < 760;
      let w = mobile ? Math.min(vw - 32, 420) : Math.min((vw - 120) / 2, 480);
      let h = w * (DH / DW);
      const maxH = vh - (mobile ? 170 : 190);
      if (h > maxH) { h = maxH; w = h * (DW / DH); }
      setSize({ w, h, mobile });
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);

  const last = size.mobile ? single.length - 1 : sheets.length;
  const go = useCallback((d: 1 | -1) => {
    setCurrent((c) => {
      const n = Math.max(0, Math.min(last, c + d));
      if (n !== c) { setDir(d); if (!size.mobile) setTurning(d > 0 ? c : n); }
      return n;
    });
  }, [last, size.mobile]);

  useEffect(() => { setCurrent(0); }, [size.mobile]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [go, onClose]);

  // Téléchargement : impression du livre seul, page par page, « Enregistrer au format PDF »
  const download = async () => {
    setPrinting(true);
    await new Promise((r) => setTimeout(r, 50));
    const imgs = [...document.querySelectorAll<HTMLImageElement>('.livre-print img')];
    await Promise.all(imgs.map((i) => (i.complete ? null : i.decode().catch(() => null))));
    const done = () => { document.body.classList.remove('printing-livre'); setPrinting(false); window.removeEventListener('afterprint', done); };
    window.addEventListener('afterprint', done);
    document.body.classList.add('printing-livre');
    window.print();
  };

  const scale = size.w / DW;
  const pageLabel = size.mobile
    ? `${current + 1} / ${single.length}`
    : current === 0 ? 'Couverture' : current === sheets.length ? 'Fin' : `Pages ${2 * current - 1}–${2 * current}`;

  return (
    <motion.div className="fixed inset-0 z-50 flex flex-col bg-[radial-gradient(ellipse_at_center,#2a3470_0%,#14112B_70%)] text-white"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="dialog" aria-modal="true" aria-label="Livre d’or">
      <header className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <p className="truncate font-book text-2xl text-[#E9CF9C]">Livre d’or</p>
        <div className="flex items-center gap-2">
          <button onClick={download} disabled={printing} className="btn border-white/15 bg-white/10 py-2 text-sm text-white hover:bg-white/20" title="Choisissez « Enregistrer au format PDF »">
            <Download size={16} />{printing ? 'Préparation…' : 'Télécharger (PDF)'}
          </button>
          <button onClick={onClose} aria-label="Fermer" className="rounded-full p-2 hover:bg-white/10"><X size={22} /></button>
        </div>
      </header>

      <div className="flex flex-1 items-center justify-center overflow-hidden px-4">
        {size.mobile ? (
          <div className="relative" style={{ width: size.w, height: size.h, perspective: 1600 }}>
            <AnimatePresence mode="wait" custom={dir} initial={false}>
              <motion.div key={current} className="absolute inset-0 overflow-hidden rounded-md shadow-[0_30px_60px_-20px_rgba(0,0,0,.7)]"
                style={{ transformOrigin: 'left center' }}
                initial={{ rotateY: dir > 0 ? 70 : -70, opacity: 0 }} animate={{ rotateY: 0, opacity: 1 }} exit={{ rotateY: dir > 0 ? -70 : 70, opacity: 0 }}
                transition={{ duration: 0.32, ease: 'easeInOut' }}>
                <Scaled scale={scale}>{single[current]}</Scaled>
              </motion.div>
            </AnimatePresence>
            <button aria-label="Page précédente" onClick={() => go(-1)} className="absolute inset-y-0 left-0 w-1/3" />
            <button aria-label="Page suivante" onClick={() => go(1)} className="absolute inset-y-0 right-0 w-2/3" />
          </div>
        ) : (
          <motion.div className="relative" style={{ width: size.w * 2, height: size.h, perspective: 2400 }}
            animate={{ x: current === 0 ? -size.w / 2 : current === sheets.length ? size.w / 2 : 0 }}
            transition={{ duration: 0.7, ease: [0.6, 0, 0.3, 1] }}>
            {/* Ombre du livre ouvert */}
            {current > 0 && current < sheets.length && <div className="absolute inset-0 rounded-md shadow-[0_40px_80px_-24px_rgba(0,0,0,.75)]" />}
            {sheets.map((s, i) => {
              const flipped = i < current;
              const z = turning === i ? sheets.length + 5 : flipped ? i + 1 : sheets.length - i;
              return (
                <motion.div key={i} className="absolute top-0 [transform-style:preserve-3d]"
                  style={{ left: size.w, width: size.w, height: size.h, transformOrigin: 'left center', zIndex: z }}
                  initial={false} animate={{ rotateY: flipped ? -180 : 0 }}
                  transition={{ duration: 0.9, ease: [0.45, 0.05, 0.25, 1] }}
                  onAnimationComplete={() => setTurning((t) => (t === i ? null : t))}
                  onClick={() => go(flipped ? -1 : 1)}>
                  <div className="absolute inset-0 cursor-pointer overflow-hidden rounded-r-md [backface-visibility:hidden]">
                    <Scaled scale={scale}>{s.front}</Scaled>
                  </div>
                  <div className="absolute inset-0 cursor-pointer overflow-hidden rounded-l-md [backface-visibility:hidden] [transform:rotateY(180deg)]">
                    <Scaled scale={scale}>{s.back}</Scaled>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>

      <footer className="flex items-center justify-center gap-4 px-4 pb-5 pt-3">
        <button onClick={() => go(-1)} disabled={current === 0} aria-label="Page précédente" className="grid h-11 w-11 place-items-center rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30"><ChevronLeft size={20} /></button>
        <span className="min-w-[120px] text-center text-sm font-semibold text-white/70">{pageLabel}</span>
        <button onClick={() => go(1)} disabled={current === last} aria-label="Page suivante" className="grid h-11 w-11 place-items-center rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30"><ChevronRight size={20} /></button>
      </footer>

      {/* Version à imprimer : une page A5 par face, hors écran */}
      {printing && createPortal(
        <div className="livre-print">
          {faces.filter((f: any) => f.key !== 'blank').map((f, i) => (
            <div key={i} className="livre-sheet"><Scaled scale={559 / DW}>{f}</Scaled></div>
          ))}
        </div>,
        document.body,
      )}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */

function Scaled({ scale, children }: { scale: number; children: React.ReactNode }) {
  return (
    <div style={{ width: DW, height: DH, transform: `scale(${scale})`, transformOrigin: 'top left' }}>{children}</div>
  );
}

const leather = (color: string) => ({
  background: `radial-gradient(ellipse at 30% 20%, rgba(255,255,255,.12), transparent 55%),
    repeating-radial-gradient(circle at 20% 30%, rgba(0,0,0,.05) 0 1px, transparent 1px 3px),
    linear-gradient(150deg, color-mix(in srgb, ${color} 72%, #14112B), color-mix(in srgb, ${color} 38%, #0c0a1c))`,
});

function Cover({ celebrant, age, color, photo }: { celebrant: string; age?: number; color: string; photo?: string | null }) {
  return (
    <div className="relative h-full w-full text-center" style={leather(color)}>
      <div className="absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-black/45 via-black/15 to-transparent" />
      <div className="absolute inset-6 rounded-sm border-2 border-[#D9B977]/75" />
      <div className="absolute inset-[34px] rounded-sm border border-[#D9B977]/45" />
      {photo ? (
        <div className="relative flex h-full flex-col items-center justify-center px-14">
          {/* Portrait en arche, cerclé d'or comme un médaillon */}
          <div className="rounded-t-full rounded-b-[14px] bg-gradient-to-b from-[#F1DDAE] via-[#C9A25E] to-[#9C7A3E] p-[5px] shadow-[0_14px_28px_-10px_rgba(0,0,0,.6)]">
            <div className="rounded-t-full rounded-b-[10px] bg-[#14112B] p-[3px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo} alt="" className="block h-[228px] w-[176px] rounded-t-full rounded-b-[8px] object-cover" />
            </div>
          </div>
          <p className="mt-7 font-book text-[54px] font-semibold italic leading-none text-[#E9CF9C] [text-shadow:0_2px_0_rgba(0,0,0,.35)]">Livre d’or</p>
          <div className="my-4 h-px w-36 bg-gradient-to-r from-transparent via-[#D9B977] to-transparent" />
          <p className="font-book text-[30px] leading-tight text-white/95">{celebrant}{age ? <span className="text-[#E9CF9C]/85">, {age} ans</span> : null}</p>
        </div>
      ) : (
        <div className="relative flex h-full flex-col items-center justify-center px-14">
          <Ornament />
          <p className="mt-6 font-book text-[64px] font-semibold italic leading-none text-[#E9CF9C] [text-shadow:0_2px_0_rgba(0,0,0,.35)]">Livre d’or</p>
          <div className="my-7 h-px w-40 bg-gradient-to-r from-transparent via-[#D9B977] to-transparent" />
          <p className="font-book text-[34px] leading-tight text-white/95">{celebrant}</p>
          {age ? <p className="mt-1 font-book text-2xl italic text-[#E9CF9C]/90">{age} ans</p> : null}
          <div className="mt-8"><Ornament flip /></div>
        </div>
      )}
    </div>
  );
}

function BackCover({ color }: { color: string }) {
  return (
    <div className="relative grid h-full w-full place-items-center" style={leather(color)}>
      <div className="absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-black/45 via-black/15 to-transparent" />
      <div className="absolute inset-6 rounded-sm border border-[#D9B977]/45" />
      <p className="font-book text-xl italic text-[#E9CF9C]/80">Happy</p>
    </div>
  );
}

function Paper({ side, page, children }: { side: 'left' | 'right'; page?: number; children?: React.ReactNode }) {
  return (
    <div className="relative h-full w-full overflow-hidden text-ink"
      style={{ background: 'radial-gradient(ellipse at 50% 40%, #FFFDF8 0%, #FBF4E8 60%, #F3E8D6 100%)' }}>
      {/* Pli central du livre */}
      <div className={`absolute inset-y-0 w-10 ${side === 'left' ? 'right-0 bg-gradient-to-l' : 'left-0 bg-gradient-to-r'} from-black/[0.13] to-transparent`} />
      <div className="relative h-full">{children}</div>
      {page ? <p className="absolute bottom-5 left-0 right-0 text-center font-book text-sm text-ink/40">— {page} —</p> : null}
    </div>
  );
}

function TitlePage({ celebrant, age, date, count, color }: { celebrant: string; age?: number; date?: string; count: number; color: string }) {
  return (
    <Paper side="left">
      <div className="flex h-full flex-col items-center justify-center px-14 text-center">
        <p className="font-book text-lg italic text-ink/55">Ce livre appartient à</p>
        <p className="mt-4 font-book text-[44px] leading-tight" style={{ color: `color-mix(in srgb, ${color} 75%, #14112B)` }}>{celebrant}</p>
        <div className="my-6 h-px w-32 bg-gradient-to-r from-transparent via-mango to-transparent" />
        <p className="font-book text-xl italic leading-relaxed text-ink/70">
          Les mots doux de celles et ceux qui ont fêté {age ? `vos ${age} ans` : 'votre anniversaire'}
        </p>
        {date && <p className="mt-6 text-sm font-semibold text-ink/50">{formatDate(date, { day: 'numeric', month: 'long', year: 'numeric' })}</p>}
        <p className="mt-10 text-sm text-ink/45">{count ? `${count} carte${count > 1 ? 's' : ''}` : 'Pas encore de carte'}</p>
      </div>
    </Paper>
  );
}

function EndPage({ color, side }: { color: string; side: 'left' | 'right' }) {
  return (
    <Paper side={side}>
      <div className="flex h-full flex-col items-center justify-center px-14 text-center">
        <Ornament dark />
        <p className="mt-6 font-book text-[34px] italic leading-tight" style={{ color: `color-mix(in srgb, ${color} 75%, #14112B)` }}>Joyeux anniversaire</p>
        <p className="mt-3 font-book text-lg text-ink/55">et à l’année prochaine</p>
      </div>
    </Paper>
  );
}

function CardPage({ card, page, color, side }: { card: GuestCard; page: number; color: string; side: 'left' | 'right' }) {
  const msg = card.message?.trim() || '';
  const n = card.images.length;
  const fontSize = !msg ? 0 : msg.length < 110 ? (n ? 25 : 30) : msg.length < 240 ? (n ? 20 : 24) : msg.length < 420 ? (n ? 16.5 : 19) : 15;
  const ink = `color-mix(in srgb, ${color} 70%, #14112B)`;
  return (
    <Paper side={side} page={page}>
      <div className="flex h-full flex-col px-11 pb-14 pt-10">
        {n > 0 && <Photos images={card.images} />}
        <div className={`flex min-h-0 flex-1 flex-col ${n ? 'mt-7' : ''}`}>
          {msg && (
            <div className={`min-h-0 overflow-hidden ${n ? '' : 'flex flex-1 items-center'}`}>
              <blockquote className="relative pt-4">
                <span className="absolute -left-1 -top-3 font-book text-[72px] leading-[1] text-mango/55" aria-hidden>“</span>
                <p className="whitespace-pre-line pl-7 font-book italic leading-snug text-ink/85" style={{ fontSize }}>{msg}</p>
              </blockquote>
            </div>
          )}
          <div className="mt-auto pt-5 text-right">
            <p className="font-book text-[28px] italic leading-none" style={{ color: ink }}>{card.name}</p>
            {card.gift && <p className="mt-1 font-book text-base italic text-ink/50">a offert {card.gift.charAt(0).toLowerCase() + card.gift.slice(1)}</p>}
          </div>
        </div>
      </div>
    </Paper>
  );
}

/** Photos façon polaroïd, scotchées sur la page. */
function Photos({ images }: { images: string[] }) {
  const layouts: Record<number, { w: number; h: number; x: number; y: number; r: number }[]> = {
    1: [{ w: 290, h: 220, x: 24, y: 0, r: -2.5 }],
    2: [{ w: 190, h: 160, x: 0, y: 10, r: -5 }, { w: 190, h: 160, x: 148, y: 30, r: 4 }],
    3: [{ w: 150, h: 128, x: 0, y: 6, r: -6 }, { w: 150, h: 128, x: 108, y: 34, r: 3 }, { w: 150, h: 128, x: 190, y: 0, r: 7 }],
  };
  const pos = layouts[Math.min(images.length, 3)];
  const height = Math.max(...pos.map((p) => p.y + p.h + 34));
  return (
    <div className="relative shrink-0" style={{ height }}>
      {images.slice(0, 3).map((src, i) => (
        <div key={i} className="absolute bg-white p-2.5 pb-7 shadow-[0_10px_20px_-8px_rgba(30,20,40,.45)]"
          style={{ left: pos[i].x, top: pos[i].y, transform: `rotate(${pos[i].r}deg)` }}>
          <span className="absolute -top-3 left-1/2 h-6 w-20 -translate-x-1/2 rotate-[-3deg] bg-[#EADBB8]/80 shadow-sm" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt="" className="block object-cover" style={{ width: pos[i].w, height: pos[i].h }} />
        </div>
      ))}
    </div>
  );
}

function Ornament({ flip = false, dark = false }: { flip?: boolean; dark?: boolean }) {
  const c = dark ? '#C8A26A' : '#E9CF9C';
  return (
    <svg width="120" height="22" viewBox="0 0 120 22" aria-hidden style={{ transform: flip ? 'scaleY(-1)' : undefined }}>
      <path d="M2 11h40M78 11h40" stroke={c} strokeWidth="1.2" />
      <path d="M60 2l4 9-4 9-4-9z" fill={c} />
      <circle cx="47" cy="11" r="2" fill={c} /><circle cx="73" cy="11" r="2" fill={c} />
    </svg>
  );
}
