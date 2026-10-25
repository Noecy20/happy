/**
 * Choix du moyen de paiement (Wave, Orange Money, MTN MoMo, Moov Money) parmi ceux
 * que l'admin a renseignés dans « Tarifs et paiement », avec le numéro à utiliser.
 * Suivi de la saisie de la référence de transaction et d'une capture facultative.
 */
import * as Clipboard from 'expo-clipboard';
import { Check, Upload } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { colors } from '@/lib/theme';
import type { Settings } from '@/lib/types';
import { pickAndUpload } from '@/lib/upload';
import { paymentMethods } from '@/lib/utils';
import { useFx } from '@/providers/FxProvider';
import { Button, Field, Label, cn } from './ui';

export default function PaymentPicker({ cfg, method, setMethod, payRef, setPayRef, proof, setProof }: {
  cfg: Settings | null; method: string; setMethod: (m: string) => void;
  payRef: string; setPayRef: (r: string) => void; proof: string; setProof: (u: string) => void;
}) {
  const fx = useFx();
  const [busy, setBusy] = useState(false);
  const methods = paymentMethods(cfg);
  return (
    <View>
      <Label>Payer par</Label>
      {methods.length === 0 ? (
        <Text className="mb-3 rounded-2xl bg-lilac/60 p-3 font-body text-[14px] text-ink">Les numéros de paiement ne sont pas encore configurés. Contactez l’administrateur.</Text>
      ) : (
        <View className="mb-2 gap-2">
          {methods.map(([m, n]) => {
            const on = method === m;
            return (
              <Pressable key={m} onPress={() => setMethod(m)} onLongPress={() => { Clipboard.setStringAsync(n); fx.toast('Numéro copié'); }}
                accessibilityState={{ selected: on }}
                className={cn('min-h-[56px] flex-row items-center rounded-2xl border p-3', on ? 'border-candy bg-candy/5' : 'border-ink/10 bg-white')}>
                <View className="flex-1">
                  <Text className="font-bold2 text-[14px] text-ink">{m}</Text>
                  <Text className="font-body text-[14px] text-ink/65">{n}</Text>
                </View>
                {on && <Check size={18} color={colors.candy} />}
              </Pressable>
            );
          })}
          <Text className="font-body text-[11px] text-ink/45">Appui long sur un numéro pour le copier.</Text>
        </View>
      )}
      {!!cfg?.payment_instructions && <Text className="mb-3 font-body text-[12px] leading-[18px] text-ink/60">{cfg.payment_instructions}</Text>}
      <Field label="Référence de la transaction" placeholder="Ex. ID Wave" value={payRef} onChangeText={setPayRef} autoCapitalize="characters" />
      <Button variant="ghost" small icon={proof ? Check : Upload} loading={busy} className="mb-4"
        title={proof ? 'Capture ajoutée' : 'Joindre une capture (facultatif)'}
        onPress={async () => {
          setBusy(true);
          try { const u = await pickAndUpload('paiement'); if (u) setProof(u); } catch (e: any) { fx.toast(e.message, 'err'); }
          setBusy(false);
        }} />
    </View>
  );
}
