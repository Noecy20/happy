/**
 * Boutique pas encore validée : frais d'ouverture (settings.vendor_fee), numéros de paiement,
 * puis référence + capture enregistrées dans les colonnes payment_* de `vendors`.
 * La boutique ne peut PAS s'auto-valider : le trigger SQL guard_vendor ignore toute modification
 * de `status` ou `active` venant d'un compte non admin.
 */
import { Hourglass } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import PaymentPicker from '@/components/PaymentPicker';
import { Button, ErrorText } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { colors, shadow } from '@/lib/theme';
import type { Settings, Vendor } from '@/lib/types';
import { formatPrice } from '@/lib/utils';

export default function PendingPayment({ vendor, onSent }: { vendor: Vendor; onSent: () => void }) {
  const [cfg, setCfg] = useState<Settings | null>(null);
  const [method, setMethod] = useState(vendor.payment_method || '');
  const [payRef, setPayRef] = useState(vendor.payment_ref || '');
  const [proof, setProof] = useState(vendor.proof_url || '');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { supabase.from('settings').select('*').eq('id', 1).maybeSingle().then(({ data }) => setCfg(data as Settings)); }, []);

  const sent = !!vendor.payment_ref;
  const refused = vendor.status === 'refusee';

  const send = async () => {
    setErr('');
    if (!method || !payRef.trim()) return setErr('Indiquez le moyen de paiement et la référence.');
    setBusy(true);
    const { error } = await supabase.from('vendors').update({ payment_method: method, payment_ref: payRef.trim(), proof_url: proof || null }).eq('id', vendor.id);
    setBusy(false);
    if (error) return setErr(error.message);
    onSent();
  };

  return (
    <View className="mt-4 rounded-[28px] border border-candy/20 bg-white p-5" style={shadow.sm}>
      <View className="flex-row">
        <View className="h-11 w-11 items-center justify-center rounded-2xl bg-candy/10"><Hourglass size={20} color={colors.candy} /></View>
        <View className="ml-3 flex-1">
          <Text className="font-bold2 text-[16px] text-ink">
            {refused ? 'Boutique non validée' : sent ? 'Paiement envoyé, en cours de vérification' : 'Votre vitrine attend sa validation'}
          </Text>
          <Text className="mt-1 font-body text-[13px] leading-[19px] text-ink/65">
            {sent && !refused
              ? 'L’administrateur vérifie votre paiement. Vous pouvez déjà ajouter vos articles : ils seront visibles dès la validation.'
              : `${cfg?.vendor_fee_label || 'Frais d’ouverture'} : ${cfg ? formatPrice(cfg.vendor_fee) : '…'}. Payez puis envoyez la référence de la transaction.`}
          </Text>
        </View>
      </View>
      {(!sent || refused) && (
        <View className="mt-5">
          <PaymentPicker cfg={cfg} method={method} setMethod={setMethod} payRef={payRef} setPayRef={setPayRef} proof={proof} setProof={setProof} />
          <ErrorText text={err} />
          <Button variant="candy" loading={busy} title="J’ai payé, envoyer" onPress={send} />
        </View>
      )}
    </View>
  );
}
