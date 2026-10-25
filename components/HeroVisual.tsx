'use client';
import { motion } from 'framer-motion';
import { Gift, Check, EyeOff } from 'lucide-react';
import { GiftStack } from './Illustrations';

/** Composition du hero : illustration + deux cartes d'interface qui racontent le concept */
export default function HeroVisual() {
  return (
    <div className="relative mx-auto w-full max-w-[520px]">
      <motion.div initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.9, ease: [0.2, 0.8, 0.2, 1] }}>
        <GiftStack className="w-full" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7, duration: 0.6 }}
        className="absolute -left-1 top-[4%] w-[190px] rounded-2xl sm:w-[230px] border border-ink/[0.06] bg-white/95 p-3.5 shadow-pop backdrop-blur sm:-left-8"
      >
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-lilac text-candy"><Gift size={17} /></span>
          <div>
            <p className="text-[13px] font-bold leading-snug">Un cadeau vient d’être pris en charge</p>
            <p className="mt-0.5 text-xs text-ink/55">3 sur 5 réservés · à l’instant</p>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.1, duration: 0.6 }}
        className="absolute -right-1 bottom-[6%] w-[190px] rounded-2xl sm:w-[220px] border border-ink/[0.06] bg-white/95 p-3.5 shadow-pop backdrop-blur sm:-right-6"
      >
        <p className="text-xs font-semibold text-ink/50">Parfum floral 50 ml</p>
        <div className="mt-2 flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 text-[13px] font-bold"><EyeOff size={14} className="text-candy" />Offert par…</span>
          <span className="inline-flex items-center gap-1 rounded-full bg-mint/10 px-2 py-0.5 text-[11px] font-bold text-mint"><Check size={12} />Réservé</span>
        </div>
      </motion.div>
    </div>
  );
}
