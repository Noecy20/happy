'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Package } from 'lucide-react';
import Navbar from '@/components/Navbar';

export default function SuiviSearch() {
  const [code, setCode] = useState('');
  const router = useRouter();
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-lg px-5 py-20">
        <Package size={40} />
        <h1 className="mt-4 text-3xl font-bold">Suivre ma commande</h1>
        <p className="mt-2 text-ink/70">Saisissez le code reçu après avoir réservé un cadeau.</p>
        <form onSubmit={(e) => { e.preventDefault(); if (code.trim()) router.push(`/suivi/${code.trim().toUpperCase()}`); }} className="mt-8 flex gap-2">
          <input className="input text-lg font-bold uppercase tracking-widest" placeholder="EX. 4F2A9C1B" value={code} onChange={(e) => setCode(e.target.value)} aria-label="Code de suivi" />
          <button className="btn-primary shrink-0">Suivre</button>
        </form>
      </main>
    </>
  );
}
