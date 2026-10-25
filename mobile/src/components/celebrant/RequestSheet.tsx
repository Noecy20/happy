/**
 * Demande d'accès ou de prolongation, avec paiement mobile money.
 * - Période : par durée (7, 15, 30, 60, 90 jours) ou par dates « du … au … ».
 * - Prix = max(prix minimum, jours × prix par jour), valeurs lues dans `settings` (réglées par l'admin).
 * - L'utilisateur paie sur le numéro affiché, saisit la référence et peut joindre une capture.
 * - Insertion dans `access_requests` ; un trigger SQL prévient les administrateurs.
 * L'accès est activé par l'admin après vérification (admin_handle_request).
 */
import { CalendarRange, Hourglass } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import DateField from '@/components/DateField';
import PaymentPicker from '@/components/PaymentPicker';
import { Button, ErrorText, Field, Pills, Segmented, Sheet } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import type { Settings } from '@/lib/types';
import { formatDate, formatPrice, todayIso } from '@/lib/utils';

export default function RequestSheet({ kind, userId, onClose, onSent }: {
  kind: null | 'acces' | 'prolongation'; userId: string; onClose: () => void; onSent: () => void;
}) {
  const today = todayIso();
  const [mode, setMode] = useState<'duree' | 'dates'>('duree');
  const [days, setDays] = useState(30);
  const [start, setStart] = useState(today);
  const [end, setEnd] = useState('');
  const [cfg, setCfg] = useState<Settings | null>(null);
  const [method, setMethod] = useState('');
  const [payRef, setPayRef] = useState('');
  const [proof, setProof] = useState('');
  const [message, setMessage] = useState('');
  const [err, setErr] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (kind) supabase.from('settings').select('*').eq('id', 1).maybeSingle().then(({ data }) => setCfg(data as Settings));
  }, [kind]);

  // Nombre de jours et date de fin selon le mode choisi
  const span = mode === 'duree' ? days
    : end && start ? Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86400000) + 1 : 0;
  const endDate = mode === 'duree' ? new Date(Date.now() + (days - 1) * 86400000).toISOString().slice(0, 10) : end;
  const price = cfg ? Math.max(Number(cfg.access_min_price) || 0, span * (Number(cfg.access_price_per_day) || 0)) : 0;

  const send = async () => {
    setErr('');
    if (span < 1) return setErr('Choisissez une période valide.');
    if (!method || !payRef.trim()) return setErr('Indiquez le moyen de paiement et la référence de la transaction.');
    setSending(true);
    const { error } = await supabase.from('access_requests').insert({
      user_id: userId, kind, days_requested: Math.min(span, 365),
      start_date: mode === 'dates' ? start : today, end_date: endDate,
      amount: price, payment_method: method, payment_ref: payRef.trim(), proof_url: proof || null, message: message.trim() || null,
    });
    setSending(false);
    if (error) return setErr(error.message);
    setPayRef(''); setMessage(''); setProof(''); onSent();
  };

  return (
    <Sheet open={!!kind} onClose={onClose} title={kind === 'prolongation' ? 'Demander une prolongation' : 'Demander l’accès'}>
      <Segmented value={mode} onChange={setMode} options={[
        { key: 'duree', label: 'Une durée', icon: Hourglass },
        { key: 'dates', label: 'Du … au …', icon: CalendarRange },
      ]} />
      {mode === 'duree' ? (
        <Pills className="mb-4" value={days} onChange={setDays} options={[7, 15, 30, 60, 90].map((d) => ({ key: d, label: `${d} jours` }))} />
      ) : (
        <>
          <DateField label="Du" value={start} onChange={setStart} min={today} />
          <DateField label="Au" value={end} onChange={setEnd} min={start || today} />
        </>
      )}

      {/* Récapitulatif du prix */}
      <View className="mb-5 flex-row items-center justify-between rounded-2xl bg-ink p-4">
        <Text className="flex-1 pr-2 font-body text-[13px] text-white/70">
          {span > 0 ? `${span} jour${span > 1 ? 's' : ''}${endDate ? ` · jusqu’au ${formatDate(endDate)}` : ''}` : 'Choisissez une période'}
        </Text>
        <Text className="font-display text-[28px] text-white">{formatPrice(price)}</Text>
      </View>

      <PaymentPicker cfg={cfg} method={method} setMethod={setMethod} payRef={payRef} setPayRef={setPayRef} proof={proof} setProof={setProof} />
      <Field multiline placeholder="Un mot pour l’administrateur (facultatif)" value={message} onChangeText={setMessage} accessibilityLabel="Message" />
      <ErrorText text={err} />
      <Button variant="candy" loading={sending} title="J’ai payé, envoyer la demande" onPress={send} />
      <Text className="mt-2 text-center font-body text-[12px] text-ink/50">L’accès est activé dès que l’administrateur a vérifié votre paiement.</Text>
    </Sheet>
  );
}
