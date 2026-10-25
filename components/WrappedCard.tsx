'use client';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { Store, ExternalLink, Lock, Heart, Ribbon } from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import GiftVisual, { PackItem } from './GiftVisual';

export type GiftItem = {
  id: string; name: string; description?: string; image_url?: string; price?: number;
  product_link?: string; external_contact?: string; claimed: boolean;
  vendor?: { id?: string; name: string; address?: string; phone?: string } | null;
  wrap_available?: boolean; wrap_price?: number | null; stock?: number | null; options?: Record<string, string>; vendor_name?: string; vendor_id?: string; product_id?: string;
  friend_name?: string; friend_message?: string;
  multiple?: boolean; participants?: number; // cadeau commun : plusieurs personnes peuvent participer
  items?: PackItem[]; // pack : 2 ou 3 articles réservés ensemble
};

const TONES = ['rose', 'plum', 'cream'] as const;
const toneOf = (id: string) => TONES[[...id].reduce((a, c) => a + c.charCodeAt(0), 0) % 3];

/** Carte cadeau : quand un cadeau est réservé, il s'emballe sous nos yeux. */
export default function WrappedCard({ gift, onClaim, mine = false, footer, closed = false }: {
  gift: GiftItem; onClaim?: (g: GiftItem) => void; mine?: boolean; footer?: React.ReactNode; closed?: boolean;
}) {
  const vendorName = gift.vendor?.name || gift.vendor_name;
  const vendorId = gift.vendor?.id || gift.vendor_id;
  const opts = Object.entries(gift.options || {});
  // Cadeau commun : jamais fermé complètement, à moitié dès la première participation
  const half = !!gift.multiple && (gift.participants || 0) > 0;
  const wrapped = gift.claimed && !gift.multiple;
  return (
    <motion.article layout className="group relative flex flex-col overflow-hidden rounded-[24px] border border-ink/[0.07] bg-white shadow-popsm transition-shadow hover:shadow-pop">
      <div className="relative aspect-[4/3] overflow-hidden bg-lilac">
        <GiftVisual name={gift.name} image_url={gift.image_url} items={gift.items} tone={toneOf(gift.id)} />

        <AnimatePresence>
          {/* Cadeau commun avec déjà des participants : emballé à moitié, toujours ouvert aux autres */}
          {half && (
            <motion.div
              key="half" className="wrap-paper absolute inset-x-0 top-0 h-1/2 origin-top shadow-[0_8px_16px_-8px_rgba(30,20,40,.45)]"
              initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} exit={{ scaleY: 0 }}
              transition={{ duration: 0.75, ease: [0.7, 0, 0.2, 1] }}
            >
              <motion.span className="ribbon-v" initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ delay: 0.55, duration: 0.4 }} />
              <motion.span className="ribbon-h !top-auto bottom-0" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 0.75, duration: 0.4 }} />
            </motion.div>
          )}
          {wrapped && (
            <motion.div
              key="wrap" className="wrap-paper absolute inset-0 origin-top"
              initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} exit={{ scaleY: 0 }}
              transition={{ duration: 0.75, ease: [0.7, 0, 0.2, 1] }}
            >
              <motion.span className="ribbon-v" initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ delay: 0.55, duration: 0.4 }} />
              <motion.span className="ribbon-h" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 0.75, duration: 0.4 }} />
              <div className="absolute inset-0 grid place-items-center">
                <motion.div
                  className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-white px-4 py-2 text-sm font-bold text-ink shadow-pop"
                  initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 1, type: 'spring', stiffness: 260, damping: 18 }}
                >
                  {mine ? <><Heart size={15} className="text-candy" fill="currentColor" />Vous l’offrez</> : <><Lock size={14} />Déjà réservé</>}
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div>
          <h3 className="font-display text-[22px] leading-tight">{gift.name}</h3>
          {gift.price ? <p className="mt-1 text-sm font-bold text-ink/75">{formatPrice(gift.price)}</p> : null}
        </div>
        {gift.description && <p className="text-sm leading-relaxed text-ink/60">{gift.description}</p>}
        <div className="flex flex-wrap gap-2 text-xs font-semibold text-ink/60">
          {vendorName && (vendorId
            ? <Link href={`/boutiques/${vendorId}`} className="inline-flex items-center gap-1.5 rounded-full bg-lilac/70 px-2.5 py-1 hover:bg-lilac hover:text-candy"><Store size={13} />{vendorName}</Link>
            : <span className="inline-flex items-center gap-1.5 rounded-full bg-lilac/70 px-2.5 py-1"><Store size={13} />{vendorName}</span>)}
          {opts.map(([k, v]) => <span key={k} className="rounded-full bg-lilac/70 px-2.5 py-1">{k} : {v}</span>)}
          {gift.wrap_available && <span className="inline-flex items-center gap-1 rounded-full bg-mango/15 px-2.5 py-1 text-[#8a5a0f]"><Ribbon size={12} />Emballage possible</span>}
          {gift.stock === 0 && !gift.claimed && <span className="rounded-full bg-candy/10 px-2.5 py-1 text-candy">Rupture de stock</span>}
          {gift.product_link && (
            <a href={gift.product_link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-lilac/70 px-2.5 py-1 hover:bg-lilac">
              <ExternalLink size={13} />Voir le produit
            </a>
          )}
        </div>
        <div className="mt-auto space-y-2 pt-1">
          {onClaim && !gift.claimed && !closed && gift.stock !== 0 && !(gift.multiple && mine) && (
            <button onClick={() => onClaim(gift)} className="btn w-full py-3 shadow-popsm hover:-translate-y-px" style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}>
              Je m’en charge
            </button>
          )}
          {footer}
        </div>
      </div>
    </motion.article>
  );
}
