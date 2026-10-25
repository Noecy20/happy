'use client';
import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import AuthShell from '@/components/AuthShell';
import ConfigWarning from '@/components/ConfigWarning';
import PasswordInput from '@/components/PasswordInput';
import { authError, isPhone, phoneToEmail } from '@/lib/utils';

function LoginForm() {
  const params = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    const supabase = createClient();
    let data: any, error: any;
    const login = isPhone(email) ? phoneToEmail(email) : email.trim();
    try { ({ data, error } = await supabase.auth.signInWithPassword({ email: login, password })); } catch (e: any) { error = e; }
    if (error) {
      setLoading(false);
      return setError(isPhone(email) && error.message?.toLowerCase().includes('invalid')
        ? 'Téléphone ou mot de passe incorrect. Si vous vous êtes inscrit avec un email, connectez-vous avec votre email.'
        : authError(error.message));
    }
    const { data: p } = await supabase.from('profiles').select('role').eq('id', data.user.id).single();
    const home = p?.role === 'admin' ? '/admin' : p?.role === 'vendor' ? '/vendeur' : '/dashboard';
    window.location.href = params.get('next') || home;
  };

  return (
    <form onSubmit={submit} className="space-y-4">
        <ConfigWarning />
      <div><label className="label" htmlFor="e">Email ou téléphone</label><input id="e" required className="input" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
      <div><label className="label" htmlFor="w">Mot de passe</label><PasswordInput id="w" required autoComplete="current-password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
      {error && <p className="text-sm font-semibold text-candy">{error}</p>}
      <button disabled={loading} className="btn-primary w-full py-3.5">{loading ? 'Connexion…' : 'Se connecter'}</button>
      <p className="text-center text-sm text-ink/70">Pas encore de compte ? <Link href="/inscription" className="font-bold underline">S'inscrire</Link></p>
    </form>
  );
}

export default function LoginPage() {
  return (
    <AuthShell title="Bon retour" subtitle="Célébrants, boutiques et administrateur se connectent ici.">
      <Suspense><LoginForm /></Suspense>
    </AuthShell>
  );
}
