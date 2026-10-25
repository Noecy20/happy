'use client';
import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, ArrowRight, Cake, Store, Upload } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import AuthShell from '@/components/AuthShell';
import ConfigWarning from '@/components/ConfigWarning';
import PasswordInput from '@/components/PasswordInput';
import { VENDOR_CATEGORIES, authError, phoneToEmail } from '@/lib/utils';

function SignupForm() {
  const params = useSearchParams();
  const [type, setType] = useState<'celebrant' | 'vendor'>(params.get('type') === 'boutique' ? 'vendor' : 'celebrant');
  const [f, setF] = useState({ full_name: '', phone: '', email: '', password: '', shop_name: '', category: '', description: '', address: '' });
  const [loading, setLoading] = useState(false);
  const [logo, setLogo] = useState<File | null>(null);
  const [msg, setMsg] = useState<{ t: string; ok: boolean } | null>(null);
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });

  const [step, setStep] = useState(1);
  const vendor = type === 'vendor';

  // Étape 1 : compte. On vérifie le numéro tout de suite (un numéro = un seul compte).
  const next = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setMsg(null);
    const { data: free } = await createClient().rpc('phone_available', { p_phone: f.phone });
    setLoading(false);
    if (free === false) return setMsg({ t: 'Ce numéro a déjà un compte. Connectez-vous avec votre téléphone ou l’email utilisé à l’inscription.', ok: false });
    if (vendor) return setStep(2);
    create();
  };

  const create = async () => {
    setLoading(true); setMsg(null);
    const supabase = createClient();
    let data: any, error: any;
    try {
      ({ data, error } = await supabase.auth.signUp({
        email: f.email.trim() || phoneToEmail(f.phone),
        password: f.password,
        options: {
          data: {
            account_type: type, full_name: f.full_name.trim(), phone: f.phone.trim(),
            ...(vendor ? { shop_name: f.shop_name.trim(), category: f.category, description: f.description.trim(), address: f.address.trim() } : {}),
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      }));
    } catch (err: any) { error = err; }
    setLoading(false);
    if (error) {
      const m = String(error.message || '');
      return setMsg({ t: m.includes('registered') ? (f.email ? 'Cet email a déjà un compte. Connectez-vous.' : 'Ce numéro a déjà un compte. Connectez-vous.') : authError(m), ok: false });
    }
    if (data?.session) {
      // Logo de la boutique, envoyé une fois le compte créé
      if (vendor && logo) {
        const path = `${data.user.id}/logo-${Date.now()}-${logo.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
        const up = await supabase.storage.from('gifts').upload(path, logo);
        if (!up.error) await supabase.from('vendors').update({ logo_url: supabase.storage.from('gifts').getPublicUrl(path).data.publicUrl }).eq('owner_id', data.user.id);
      }
      window.location.href = vendor ? '/vendeur' : '/dashboard';
      return;
    }
    setMsg({ t: 'Compte créé. Confirmez votre email via le lien reçu, puis connectez-vous.', ok: true });
  };

  const message = msg && <p className={`text-sm font-semibold ${msg.ok ? 'text-mint' : 'text-candy'}`}>{msg.t}</p>;

  // Étape 2 (boutique) : la vitrine
  if (step === 2)
    return (
      <form onSubmit={(e) => { e.preventDefault(); create(); }} className="space-y-4" autoComplete="off">
        <p className="text-sm font-bold text-ink/60">Étape 2 sur 2 · Votre boutique</p>
        <div><label className="label" htmlFor="sn">Nom de la boutique</label><input id="sn" required autoFocus className="input" autoComplete="organization" value={f.shop_name} onChange={set('shop_name')} /></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="sc">Ce que vous vendez</label>
            <select id="sc" required className="input" value={f.category} onChange={set('category')}>
              <option value="">Choisir…</option>
              {VENDOR_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div><label className="label" htmlFor="sa">Quartier / adresse</label><input id="sa" className="input" placeholder="Cocody, Riviera 2…" value={f.address} onChange={set('address')} /></div>
        </div>
        <label className="flex cursor-pointer items-center gap-4 rounded-xl border border-dashed border-ink/20 p-3 hover:border-candy/40">
          <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-lilac text-candy">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {logo ? <img src={URL.createObjectURL(logo)} alt="" className="h-full w-full object-cover" /> : <Upload size={18} />}
          </span>
          <span className="text-sm"><span className="block font-bold">Logo de la boutique</span><span className="text-ink/60">Facultatif, affiché sur votre vitrine</span></span>
          <input type="file" accept="image/*" className="sr-only" onChange={(e) => setLogo(e.target.files?.[0] || null)} />
        </label>
        <div><label className="label" htmlFor="sd">Présentation (facultatif)</label><textarea id="sd" rows={2} className="input" placeholder="Vos produits, vos délais de livraison…" value={f.description} onChange={set('description')} /></div>
        {message}
        <div className="flex gap-3">
          <button type="button" onClick={() => { setStep(1); setMsg(null); }} className="btn-ghost"><ArrowLeft size={16} />Retour</button>
          <button disabled={loading} className="btn-candy flex-1 py-3.5">{loading ? 'Création…' : 'Créer ma boutique'}</button>
        </div>
      </form>
    );

  // Étape 1 : le compte
  return (
    <form onSubmit={next} className="space-y-4" autoComplete="off">
      <ConfigWarning />
      <div className="grid grid-cols-2 gap-2 rounded-2xl bg-lilac/60 p-1.5" role="tablist">
        {[{ k: 'celebrant', l: 'Mon anniversaire', i: Cake }, { k: 'vendor', l: 'Ma boutique', i: Store }].map((t) => (
          <button key={t.k} type="button" role="tab" aria-selected={type === t.k} onClick={() => setType(t.k as any)}
            className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition ${type === t.k ? 'bg-white text-ink shadow-popsm' : 'text-ink/80 hover:bg-white/60'}`}>
            <t.i size={16} />{t.l}
          </button>
        ))}
      </div>
      {vendor && <p className="text-sm font-bold text-ink/60">Étape 1 sur 2 · Votre compte</p>}
      <div><label className="label" htmlFor="n">{vendor ? 'Votre nom (responsable)' : 'Nom complet'}</label><input id="n" required className="input" autoComplete="name" value={f.full_name} onChange={set('full_name')} /></div>
      <div><label className="label" htmlFor="p">Téléphone / WhatsApp</label><input id="p" required type="tel" className="input" autoComplete="tel" value={f.phone} onChange={set('phone')} /></div>
      <div><label className="label" htmlFor="e">Email (facultatif)</label><input id="e" type="email" className="input" autoComplete="email" placeholder="Sans email, connexion avec votre téléphone" value={f.email} onChange={set('email')} /></div>
      <div><label className="label" htmlFor="w">Mot de passe</label><PasswordInput id="w" name="new-password" minLength={6} required className="input" autoComplete="new-password" placeholder="6 caractères minimum" value={f.password} onChange={set('password')} /></div>
      {message}
      <button disabled={loading} className="btn-candy w-full py-3.5">
        {loading ? 'Vérification…' : vendor ? <>Suivant<ArrowRight size={16} /></> : 'Créer mon compte'}
      </button>
      <p className="text-center text-sm text-ink/70">Déjà inscrit ? <Link href="/connexion" className="font-bold underline">Se connecter</Link></p>
    </form>
  );
}

export default function SignupPage() {
  return (
    <AuthShell image="plage" title="Créer mon compte" subtitle="Préparez votre liste d’anniversaire, ou ouvrez votre boutique.">
      <Suspense><SignupForm /></Suspense>
    </AuthShell>
  );
}
