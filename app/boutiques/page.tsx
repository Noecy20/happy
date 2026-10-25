'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { MapPin, Search, Store, ChevronRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Navbar from '@/components/Navbar';
import Decor, { seedOf } from '@/components/Decor';

type Vendor = { id: string; name: string; category?: string; description?: string; address?: string; logo_url?: string; cover_url?: string };

export default function ShopsPage() {
  const [vendors, setVendors] = useState<Vendor[] | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [cat, setCat] = useState('');
  const [q, setQ] = useState('');

  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      supabase.from('vendors').select('id,name,category,description,address,logo_url,cover_url').eq('active', true).order('name'),
      supabase.from('products').select('vendor_id').eq('active', true),
    ]).then(([v, p]) => {
      setVendors(v.data || []);
      const c: Record<string, number> = {};
      (p.data || []).forEach((x: any) => { c[x.vendor_id] = (c[x.vendor_id] || 0) + 1; });
      setCounts(c);
    });
  }, []);

  const cats = useMemo(() => [...new Set((vendors || []).map((v) => v.category).filter(Boolean))] as string[], [vendors]);
  const list = (vendors || []).filter((v) => (!cat || v.category === cat) && (!q || `${v.name} ${v.category} ${v.address}`.toLowerCase().includes(q.toLowerCase())));

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-6xl px-5 pb-24 pt-10">
        <header className="relative overflow-hidden rounded-[20px] bg-ink">
          <Image src="/images/mains-levees.jpg" alt="" fill priority sizes="(max-width: 1152px) 100vw, 1152px" className="object-cover" style={{ objectPosition: 'center 35%' }} />
          <div className="absolute inset-0 bg-gradient-to-r from-ink/85 via-ink/50 to-transparent" />
          <div className="relative px-6 py-14 text-white sm:px-10 sm:py-20">
            <h1 className="text-[clamp(2.4rem,5.5vw,4rem)] leading-[1]">Les boutiques Happy</h1>
            <p className="mt-4 max-w-md text-lg text-white/85">Commandez directement un cadeau, faites-le emballer et livrer, en surprise si vous le souhaitez.</p>
          </div>
        </header>

        <div className="mt-8 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-1.5">
            <button onClick={() => setCat('')} className={`rounded-full px-3.5 py-1.5 text-sm font-semibold ${!cat ? 'bg-ink text-white' : 'bg-white text-ink/65 hover:bg-lilac/60'}`}>Toutes</button>
            {cats.map((c) => (
              <button key={c} onClick={() => setCat(c)} className={`rounded-full px-3.5 py-1.5 text-sm font-semibold ${cat === c ? 'bg-ink text-white' : 'bg-white text-ink/65 hover:bg-lilac/60'}`}>{c}</button>
            ))}
          </div>
          <label className="relative md:w-72">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" />
            <input className="input py-2 pl-9" placeholder="Boutique, quartier…" value={q} onChange={(e) => setQ(e.target.value)} />
          </label>
        </div>

        {vendors === null ? (
          <div className="mt-16 grid place-items-center"><div className="h-10 w-10 animate-spin rounded-full border-[3px] border-lilac border-t-candy" /></div>
        ) : list.length === 0 ? (
          <p className="mt-10 rounded-3xl border-2 border-dashed border-ink/15 p-12 text-center text-ink/55">Aucune boutique pour le moment.</p>
        ) : (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((v, i) => (
              <motion.div key={v.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <Link href={`/boutiques/${v.id}`} className="group flex h-full flex-col overflow-hidden rounded-[24px] border border-ink/[0.07] bg-white shadow-popsm transition hover:-translate-y-1 hover:shadow-pop">
                  <div className="relative h-28 overflow-hidden bg-plum">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {v.cover_url ? <img src={v.cover_url} alt="" className="h-full w-full object-cover" /> : <Decor seed={seedOf(v.id)} opacity={0.55} />}
                  </div>
                  <div className="flex flex-1 flex-col px-6 pb-6">
                  <span className="relative -mt-8 grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl border-4 border-white bg-lilac font-display text-3xl text-candy shadow-popsm">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {v.logo_url ? <img src={v.logo_url} alt="" className="h-full w-full object-cover" /> : v.name[0]?.toUpperCase()}
                  </span>
                  <h2 className="mt-3 truncate text-2xl leading-tight">{v.name}</h2>
                  {v.category && <p className="text-sm font-semibold text-ink/60">{v.category}</p>}
                  {v.description && <p className="mt-4 line-clamp-2 text-sm leading-relaxed text-ink/65">{v.description}</p>}
                  <div className="mt-auto flex items-center justify-between pt-5 text-sm">
                    <span className="inline-flex items-center gap-1.5 text-ink/55">{v.address ? <><MapPin size={14} />{v.address}</> : <><Store size={14} />Boutique</>}</span>
                    <span className="inline-flex items-center gap-1 font-bold text-candy">{counts[v.id] || 0} article{(counts[v.id] || 0) > 1 ? 's' : ''}<ChevronRight size={16} className="transition group-hover:translate-x-0.5" /></span>
                  </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
