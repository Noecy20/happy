'use client';
import { GiftPlaceholder } from './Illustrations';

export type PackItem = { name: string; image_url?: string | null; price?: number | null };

const TONES = ['rose', 'plum', 'cream'] as const;

/** Articles d'un pack (au moins 2 articles nommés), sinon liste vide. */
export const packItems = (items?: PackItem[] | null) => (items || []).filter((i) => i?.name?.trim()).slice(0, 3);

function Cell({ item, i, label }: { item: PackItem; i: number; label: boolean }) {
  return (
    <div className="relative min-h-0 min-w-0 overflow-hidden bg-lilac">
      {/* Image en absolu : sa taille réelle ne déforme jamais la mosaïque */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {item.image_url ? <img src={item.image_url} alt={item.name} className="absolute inset-0 h-full w-full object-cover" /> : <div className="absolute inset-0"><GiftPlaceholder tone={TONES[i % 3]} /></div>}
      {label && (
        <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-ink/70 to-transparent px-2 pb-1.5 pt-4 text-[11px] font-bold text-white">{item.name}</span>
      )}
    </div>
  );
}

/**
 * Image d'un cadeau : sa photo, ou pour un pack une mosaïque
 * (2 articles moitié-moitié, 3 articles : un grand + deux petits). Le parent doit être en position relative.
 */
export default function GiftVisual({ name, image_url, items, tone = 'rose', labels = true, badge = true }: {
  name: string; image_url?: string | null; items?: PackItem[] | null; tone?: (typeof TONES)[number]; labels?: boolean; badge?: boolean;
}) {
  const pack = packItems(items);
  if (pack.length < 2) {
    // eslint-disable-next-line @next/next/no-img-element
    return image_url ? <img src={image_url} alt={name} className="h-full w-full object-cover" /> : <GiftPlaceholder tone={tone} />;
  }
  return (
    <div className={`absolute inset-0 grid gap-[2px] bg-white ${pack.length === 3 ? 'grid-cols-2 grid-rows-2' : 'grid-cols-2 grid-rows-1'}`}>
      {pack.map((it, i) => (
        <div key={i} className={`grid min-h-0 min-w-0 ${pack.length === 3 && i === 0 ? 'row-span-2' : ''}`}><Cell item={it} i={i} label={labels} /></div>
      ))}
      {badge && <span className="absolute left-2 top-2 rounded-full bg-white/95 px-2.5 py-0.5 text-xs font-bold text-ink shadow-popsm">Pack de {pack.length}</span>}
    </div>
  );
}
