/** « Nous contacter » : message enregistré dans contact_messages (lu par l'admin, onglet Messages). */
import { useState } from 'react';
import TopBar from '@/components/TopBar';
import { Button, ErrorText, Field, Screen, Title, Txt } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { useFx } from '@/providers/FxProvider';

export default function Contact() {
  const fx = useFx();
  const [f, setF] = useState({ full_name: '', phone: '', email: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');
  const set = (k: keyof typeof f) => (v: string) => setF((x) => ({ ...x, [k]: v }));
  const submit = async () => {
    setErr('');
    if (!f.full_name.trim()) return setErr('Indiquez votre nom.');
    setLoading(true);
    const { error } = await supabase.from('contact_messages').insert({ full_name: f.full_name, phone: f.phone || null, email: f.email || null, message: f.message || null });
    setLoading(false);
    if (error) return setErr("La demande n'a pas été envoyée. Vérifiez votre connexion et réessayez.");
    setDone(true); fx.confetti();
  };
  return (
    <Screen>
      <TopBar />
      <Title>Nous contacter</Title>
      {done ? <Txt className="mt-4 text-ink/70">Merci, votre message a bien été envoyé. Nous vous répondons rapidement.</Txt> : (
        <>
          <Txt className="mb-6 mt-1 text-ink/60">Une question, une boutique à proposer ? Écrivez-nous.</Txt>
          <Field label="Nom complet" value={f.full_name} onChangeText={set('full_name')} />
          <Field label="Téléphone / WhatsApp" keyboardType="phone-pad" value={f.phone} onChangeText={set('phone')} />
          <Field label="Email (facultatif)" keyboardType="email-address" autoCapitalize="none" value={f.email} onChangeText={set('email')} />
          <Field label="Message" multiline value={f.message} onChangeText={set('message')} />
          <ErrorText text={err} />
          <Button variant="candy" loading={loading} title="Envoyer" onPress={submit} />
        </>
      )}
    </Screen>
  );
}
