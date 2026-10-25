'use client';
import { Pencil, Trash2 } from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import { GiftPlaceholder } from './Illustrations';
import type { GiftItem } from './WrappedCard';

/** Carte compacte d'un cadeau (espace célébrant) : emballée dans le pagne quand elle est prise. */
export default function GiftCard({ g, editable, onEdit, onDelete }: { g: GiftItem; editable: boolean; onEdit: () => void; onDelete: () => void }) {
  const n = g.participants || 0;
  const half = !!g.multiple && n > 0;
  const wrapped = g.claimed && !g.multiple;
  const status = g.multiple
    ? n ? `Commun, ${n} participant${n > 1 ? 's' : ''}` : 'Commun, personne pour l’instant'
    : g.claimed ? 'Pris en charge' : 'Disponible';
  const details = [g.price ? formatPrice(g.price) : null, g.vendor_name].filter(Boolean);
  return (
    <li className="overflow-hidden rounded-2xl border border-ink/10 bg-white">
      <div className="relative aspect-[4/3] overflow-hidden bg-lilac">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {g.image_url ? <img src={g.image_url} alt="" className="h-full w-full object-cover" /> : <GiftPlaceholder />}
        {wrapped && <div className="wrap-paper absolute inset-0"><span className="ribbon-v" /><span className="ribbon-h" /></div>}
        {half && <div className="wrap-paper absolute inset-x-0 top-0 h-1/2"><span className="ribbon-v" /><span className="ribbon-h !top-auto bottom-0" /></div>}
        {editable && (
          <div className="absolute right-2 top-2 flex gap-1">
            <button onClick={onEdit} aria-label="Modifier" title="Modifier" className="grid h-8 w-8 place-items-center rounded-lg bg-white/95 text-ink/70 shadow-popsm hover:text-ink"><Pencil size={15} /></button>
            <button onClick={onDelete} aria-label="Retirer" title="Retirer" className="grid h-8 w-8 place-items-center rounded-lg bg-white/95 text-ink/70 shadow-popsm hover:text-candy"><Trash2 size={15} /></button>
          </div>
        )}
      </div>
      <div className="p-3">
        <p className="truncate font-bold leading-tight">{g.name}</p>
        {details.length > 0 && <p className="mt-0.5 truncate text-sm text-ink/60">{details.join(' · ')}</p>}
        <p className={`mt-1.5 text-xs font-bold ${g.claimed || n ? 'text-ink/70' : 'text-mint'}`}>{status}</p>
      </div>
    </li>
  );
}

