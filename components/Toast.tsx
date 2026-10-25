'use client';
import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useState } from 'react';
import { CheckCircle2, AlertCircle } from 'lucide-react';

export function useToast() {
  const [msg, setMsg] = useState<{ text: string; tone: 'ok' | 'err' } | null>(null);
  const show = useCallback((text: string, tone: 'ok' | 'err' = 'ok') => {
    setMsg({ text, tone });
    setTimeout(() => setMsg(null), 3800);
  }, []);
  const node = (
    <AnimatePresence>
      {msg && (
        <motion.div
          role="status"
          initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
          className={`fixed bottom-6 left-1/2 z-[70] -translate-x-1/2 inline-flex max-w-[92vw] items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold shadow-pop ${msg.tone === 'ok' ? 'bg-ink text-white' : 'bg-candy text-white'}`}
        >
          {msg.tone === 'ok' ? <CheckCircle2 size={17} className="shrink-0 text-mango" /> : <AlertCircle size={17} className="shrink-0" />}
          {msg.text}
        </motion.div>
      )}
    </AnimatePresence>
  );
  return { show, node };
}
