'use client';
import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import AuthShell from '@/components/AuthShell';
import { burst } from '@/components/confetti';

export default function ContactPage() {
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const set = (k: string) => (e: any) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    const { error } = await createClient().from('contact_messages').insert({ full_name: form.full_name, phone: form.phone, email: form.email || null, message: form.message || null });
    setLoading(false);
    if (error) return setError("La demande n'a pas été envoyée. Vérifiez votre connexion et réessayez.");
    setDone(true); burst();
  };

  if (done)
    return (
      <AuthShell title="Message envoyé" subtitle="L'administrateur vous recontacte rapidement.">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="panel space-y-4 p-6">
          <p className="leading-relaxed">Vous voulez créer votre liste ? Inscrivez-vous et demandez l’accès depuis votre espace.</p>
          <Link href="/inscription" className="btn-candy w-full">Créer mon compte</Link>
        </motion.div>
      </AuthShell>
    );

  return (
    <AuthShell title="Nous contacter" subtitle="Une question ? Laissez-nous un message. Pour créer votre liste ou votre boutique, inscrivez-vous directement.">
      <form onSubmit={submit} className="space-y-4">
        <div><label className="label" htmlFor="n">Nom complet</label><input id="n" required className="input" value={form.full_name} onChange={set('full_name')} /></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className="label" htmlFor="e">Email (facultatif)</label><input id="e" type="email" className="input" value={form.email} onChange={set('email')} /></div>
          <div><label className="label" htmlFor="p">Téléphone / WhatsApp</label><input id="p" required className="input" placeholder="+225 07 …" value={form.phone} onChange={set('phone')} /></div>
        </div>
        <div><label className="label" htmlFor="m">Message</label><textarea id="m" rows={3} className="input" placeholder="Durée souhaitée, questions…" value={form.message} onChange={set('message')} /></div>
        {error && <p className="text-sm font-semibold text-candy">{error}</p>}
        <button disabled={loading} className="btn-candy w-full py-3.5">{loading ? 'Envoi…' : 'Envoyer le message'}</button>
      </form>
    </AuthShell>
  );
}
