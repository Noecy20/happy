/**
 * Admin · Tarifs et paiement (table `settings`, une seule ligne id = 1).
 * Prix de l'accès par jour + minimum, frais boutique + libellé, numéros Wave / Orange / MTN / Moov, instructions.
 * Seuls les numéros renseignés sont proposés aux utilisateurs.
 */
import { router } from 'expo-router';
import { LogOut } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Text } from 'react-native';
import AdminHeader from '@/components/admin/AdminHeader';
import PushButton from '@/components/PushButton';
import { Button, Card, Field, Loading, Screen, Title } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { useFx } from '@/providers/FxProvider';

export default function AdminSettings() {
  const fx = useFx();
  const { signOut } = useAuth();
  const [f, setF] = useState<Record<string, string> | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    supabase.from('settings').select('*').eq('id', 1).maybeSingle().then(({ data }) => {
      const d: any = data || {};
      // Les valeurs numériques sont converties en texte pour les champs de saisie
      setF(Object.fromEntries(Object.entries(d).map(([k, v]) => [k, v == null ? '' : String(v)])));
    });
  }, []);
  if (!f) return <Loading />;
  const set = (k: string) => (v: string) => setF((x) => ({ ...x!, [k]: v }));
  const num = (k: string) => (v: string) => set(k)(v.replace(/\D/g, ''));

  const save = async () => {
    setBusy(true);
    const { error } = await supabase.from('settings').update({
      access_price_per_day: Number(f.access_price_per_day) || 0, access_min_price: Number(f.access_min_price) || 0,
      vendor_fee: Number(f.vendor_fee) || 0, vendor_fee_label: f.vendor_fee_label || 'Frais d’ouverture de boutique',
      wave_number: f.wave_number || null, orange_number: f.orange_number || null, mtn_number: f.mtn_number || null, moov_number: f.moov_number || null,
      payment_instructions: f.payment_instructions || null, updated_at: new Date().toISOString(),
    }).eq('id', 1);
    setBusy(false);
    fx.toast(error ? error.message : 'Réglages enregistrés', error ? 'err' : 'ok');
  };

  return (
    <Screen>
      <AdminHeader title="Réglages" />
      <Card className="mt-5">
        <Title className="mb-4 text-[28px]">Tarifs</Title>
        <Field label="Accès célébrant : prix par jour (FCFA)" keyboardType="number-pad" value={f.access_price_per_day} onChangeText={num('access_price_per_day')} />
        <Field label="Accès célébrant : prix minimum (FCFA)" keyboardType="number-pad" value={f.access_min_price} onChangeText={num('access_min_price')} />
        <Field label="Boutique : montant (FCFA)" keyboardType="number-pad" value={f.vendor_fee} onChangeText={num('vendor_fee')} />
        <Field label="Boutique : libellé" value={f.vendor_fee_label} onChangeText={set('vendor_fee_label')} />
        <Title className="mb-1 mt-2 text-[28px]">Numéros de paiement</Title>
        <Text className="mb-4 font-body text-[13px] text-ink/55">Seuls les numéros renseignés sont proposés aux utilisateurs.</Text>
        <Field label="Wave" keyboardType="phone-pad" value={f.wave_number} onChangeText={set('wave_number')} />
        <Field label="Orange Money" keyboardType="phone-pad" value={f.orange_number} onChangeText={set('orange_number')} />
        <Field label="MTN MoMo" keyboardType="phone-pad" value={f.mtn_number} onChangeText={set('mtn_number')} />
        <Field label="Moov Money" keyboardType="phone-pad" value={f.moov_number} onChangeText={set('moov_number')} />
        <Field label="Instructions de paiement" multiline placeholder="Indiquez votre nom en motif de paiement…" value={f.payment_instructions} onChangeText={set('payment_instructions')} />
        <Button variant="candy" loading={busy} title="Enregistrer" onPress={save} />
      </Card>
      <PushButton className="mt-6" small={false} label="Être prévenu des nouvelles demandes" />
      <Button variant="danger" icon={LogOut} title="Se déconnecter" className="mt-3" onPress={async () => { await signOut(); router.replace('/'); }} />
    </Screen>
  );
}
