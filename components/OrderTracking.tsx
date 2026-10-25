'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Check, Phone, MapPin, Store, XCircle, Ribbon } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import PushButton from './PushButton';
import { ORDER_STEPS, formatDate, formatPrice, statusLabel } from '@/lib/utils';

/** Suivi d'une commande. `compact` = version pour une fenêtre (page de l'ami). */
export default function OrderTracking({ code, compact = false, onToast }: { code: string; compact?: boolean; onToast?: (m: string, ok: boolean) => void }) {
  const [o, setO] = useState<any>(undefined);

  useEffect(() => {
    const supabase = createClient();
    const load = () => supabase.rpc('get_order_tracking', { p_code: code }).then(({ data }) => setO(data));
    load();
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, [code]);

  if (o === undefined) return <div className="grid h-40 place-items-center"><div className="h-9 w-9 animate-spin rounded-full border-[3px] border-lilac border-t-candy" /></div>;
  if (!o) return <p className="py-10 text-center text-ink/60">Code introuvable. Vérifiez les 8 caractères de votre code de suivi.</p>;

  const cancelled = o.status === 'annulee';
  const current = ORDER_STEPS.findIndex((s) => s.key === o.status);
  const opts = Object.entries(o.options || {}) as [string, string][];
  const total = (Number(o.item.price) || 0) * (o.quantity || 1) + (o.gift_wrap ? Number(o.wrap_price) || 0 : 0);

  return (
    <div>
      {!compact && (
        <>
          <p className="text-sm font-semibold text-ink/55">Commande {o.tracking_code}</p>
          <h1 className="mt-1 text-4xl sm:text-5xl">{o.celebrant_name ? `Pour l’anniversaire de ${o.celebrant_name}` : 'Suivi de votre commande'}</h1>
        </>
      )}
      <p className={`${compact ? '' : 'mt-2'} text-sm text-ink/60`}>
        {compact && <strong className="text-ink">Commande {o.tracking_code} · </strong>}
        {o.delivery_date ? `Livraison prévue le ${formatDate(o.delivery_date)}` : 'Date de livraison à convenir'}
        {o.delivery_address ? ` à ${o.delivery_address}` : ' · retrait en boutique'}
      </p>

      <div className="mt-6 flex items-center gap-4 rounded-2xl border border-ink/[0.07] bg-white p-4">
        <span className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-lilac">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {o.item.image_url && <img src={o.item.image_url} alt="" className="h-full w-full object-cover" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-2xl leading-tight">{o.item.name}{o.quantity > 1 ? ` × ${o.quantity}` : ''}</p>
          <p className="text-sm text-ink/60">{formatPrice(total)}{opts.length ? ' · ' + opts.map(([k, v]) => `${k} : ${v}`).join(', ') : ''}</p>
          {o.gift_wrap && <p className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-[#8a5a0f]"><Ribbon size={12} />Emballage cadeau</p>}
        </div>
        <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${o.paid ? 'bg-mint/15 text-mint' : 'bg-mango/20 text-[#8a5a0f]'}`}>{o.paid ? 'Payé' : 'À régler'}</span>
      </div>

      {cancelled ? (
        <div className="mt-6 flex items-center gap-3 rounded-2xl bg-candy p-4 font-bold text-white"><XCircle />Commande annulée par la boutique</div>
      ) : (
        <ol className="mt-8 grid grid-cols-5 gap-1">
          {ORDER_STEPS.map((s, i) => {
            const done = i <= current;
            return (
              <li key={s.key} className="flex flex-col items-center text-center">
                <div className="relative flex w-full items-center">
                  <div className={`h-1 flex-1 ${i === 0 ? 'invisible' : ''} ${i <= current ? 'bg-mint' : 'bg-ink/10'}`} />
                  <motion.div animate={{ scale: i === current ? [1, 1.12, 1] : 1 }} transition={{ repeat: i === current ? Infinity : 0, duration: 1.6 }}
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${done ? 'bg-mint text-white' : 'border border-ink/15 bg-white text-ink/50'}`}>
                    {done ? <Check size={16} /> : <span className="text-xs font-bold">{i + 1}</span>}
                  </motion.div>
                  <div className={`h-1 flex-1 ${i === ORDER_STEPS.length - 1 ? 'invisible' : ''} ${i < current ? 'bg-mint' : 'bg-ink/10'}`} />
                </div>
                <span className={`mt-2 text-[11px] font-semibold sm:text-xs ${done ? '' : 'text-ink/45'}`}>{s.label}</span>
              </li>
            );
          })}
        </ol>
      )}

      <div className={`mt-8 grid gap-4 ${compact ? '' : 'md:grid-cols-2'}`}>
        <div className="rounded-2xl bg-lilac/40 p-5">
          <h2 className="text-2xl">Boutique</h2>
          {o.vendor ? (
            <ul className="mt-3 space-y-2 text-sm">
              <li className="flex gap-2"><Store size={16} className="text-candy" /><Link href={`/boutiques/${o.vendor.id}`} className="font-semibold underline">{o.vendor.name}</Link></li>
              {o.vendor.phone && <li className="flex gap-2"><Phone size={16} className="text-candy" /><a className="underline" href={`https://wa.me/${o.vendor.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer">{o.vendor.phone}</a></li>}
              {o.vendor.address && <li className="flex gap-2"><MapPin size={16} className="text-candy" />{o.vendor.address}</li>}
            </ul>
          ) : <p className="mt-3 text-sm">{o.external_contact || 'Contact du vendeur non renseigné.'}</p>}
          <p className="mt-4 text-sm text-ink/65">{o.payment_note}</p>
          {o.vendor_note && <p className="mt-2 text-sm"><strong>Note de la boutique :</strong> {o.vendor_note}</p>}
        </div>
        <div className="rounded-2xl bg-lilac/40 p-5">
          <h2 className="text-2xl">Historique</h2>
          <ul className="mt-3 space-y-3">
            {o.history.slice().reverse().map((h: any, i: number) => (
              <li key={i} className="border-l-2 border-candy/40 pl-3 text-sm">
                <p className="font-bold">{statusLabel(h.status)}</p>
                {h.note && <p className="text-ink/65">{h.note}</p>}
                <p className="text-xs text-ink/40">{new Date(h.at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="mt-6"><PushButton orderCode={o.tracking_code} label="Être prévenu de l’avancement" onDone={onToast} /></div>
    </div>
  );
}
