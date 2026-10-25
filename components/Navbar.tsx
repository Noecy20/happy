'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Menu, X, UserRound } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Logo from './Logo';

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [space, setSpace] = useState<string | null>(null);
  useEffect(() => {
    // Utilisateur connecté : on affiche « Mon espace » au lieu de « Connexion »
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data: p } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
      setSpace(p?.role === 'admin' ? '/admin' : p?.role === 'vendor' ? '/vendeur' : '/dashboard');
    });
  }, []);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on(); window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  const links = [
    { href: '/#comment', label: 'Comment ça marche' },
    { href: '/boutiques', label: 'Boutiques' },
    { href: '/suivi', label: 'Suivre une commande' },
  ];
  return (
    <header className={`sticky top-0 z-40 transition-all ${scrolled || open ? 'border-b border-ink/[0.06] bg-paper/90 backdrop-blur-md' : 'bg-transparent'}`}>
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
        <Logo />
        <div className="hidden items-center gap-8 text-[15px] font-medium text-ink/75 md:flex">
          {links.map((l) => <Link key={l.href} href={l.href} className="transition hover:text-ink">{l.label}</Link>)}
          {space ? (
            <Link href={space} className="btn-primary py-2"><UserRound size={16} />Mon espace</Link>
          ) : (
            <>
              <Link href="/connexion" className="transition hover:text-ink">Connexion</Link>
              <Link href="/inscription" className="btn-primary py-2">Créer mon compte</Link>
            </>
          )}
        </div>
        <button className="grid h-10 w-10 place-items-center rounded-full md:hidden" onClick={() => setOpen(!open)} aria-label="Menu" aria-expanded={open}>
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </nav>
      {open && (
        <div className="flex flex-col gap-1 px-5 pb-6 text-lg font-medium md:hidden">
          {links.map((l) => <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="border-b border-ink/5 py-3">{l.label}</Link>)}
          {space ? <Link href={space} className="btn-candy mt-4 py-3.5">Mon espace</Link> : (
            <>
              <Link href="/connexion" className="border-b border-ink/5 py-3">Connexion</Link>
              <Link href="/inscription" className="btn-candy mt-4 py-3.5">Créer mon compte</Link>
            </>
          )}
        </div>
      )}
    </header>
  );
}
