'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Gift, MapPin, Minus, Phone, Plus, ShoppingBag, Copy, PartyPopper } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Navbar from '@/components/Navbar';
import { GiftPlaceholder } from '@/components/Illustrations';
import Decor, { seedOf } from '@/components/Decor';
import Modal from '@/components/Modal';
import { useToast } from '@/components/Toast';
import { burst } from '@/components/confetti';
import { formatPrice } from '@/lib/utils';

type Vendor = { id: string; name: string; category?: string; description?: string; address?: string; phone?: string; logo_url?: string; cover_url?: string };
type Product = { id: string; name: string; description?: string; price?: number; image_url?: string; category_id?: string | null;
  options?: { name: string; values: string[] }[]; stock?: number | null; wrap_available?: boolean; wrap_price?: number | null };

export default function ShopPage() {
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const [vendor, setVendor] = useState<Vendor | null | undefined>(undefined);
  const [products, setProducts] = useState<Product[]>([]);
  const [cats, setCats] = useState<{ id: string; name: string }[]>([]);
  const [cat, setCat] = useState('');
  const [selected, setSelected] = useState<Product | null>(null);
  const [done, setDone] = useState<{ code: string; product: Product } | null>(null);

  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      supabase.from('vendors').select('id,name,category,description,address,phone,logo_url,cover_url').eq('id', id).maybeSingle(),
      supabase.from('products').select('id,name,description,price,image_url,category_id,options,stock,wrap_available,wrap_price').eq('vendor_id', id).eq('active', true).order('created_at', { ascending: false }),
      supabase.from('product_categories').select('id,name').eq('vendor_id', id).order('name'),
    ]).then(([v, p, c]) => {
      setVendor(v.data); setProducts(p.data || []);
      const used = new Set((p.data || []).map((x: any) => x.category_id));
      setCats((c.data || []).filter((x: any) => used.has(x.id)));
    });
  }, [id]);

  if (vendor === undefined) return <><Navbar /><div className="grid h-[60vh] place-items-center"><div className="h-10 w-10 animate-spin rounded-full border-[3px] border-lilac border-t-candy" /></div></>;
  if (!vendor) return <><Navbar /><main className="mx-auto max-w-lg px-5 py-24 text-center"><h1 className="text-4xl">Boutique introuvable</h1><Link href="/boutiques" className="btn-primary mt-6">Voir les boutiques</Link></main></>;

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-6xl px-5 pb-24 pt-8">
        <Link href="/boutiques" className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink/55 hover:text-ink"><ArrowLeft size={16} />Toutes les boutiques</Link>
        <header className="relative mt-6 flex flex-col gap-6 overflow-hidden rounded-[32px] bg-plum p-8 text-white sm:flex-row sm:items-center sm:p-10">
          {vendor.cover_url
            // eslint-disable-next-line @next/next/no-img-element
            ? <><img src={vendor.cover_url} alt="" className="absolute inset-0 h-full w-full object-cover" /><div className="absolute inset-0 bg-gradient-to-r from-plum via-plum/80 to-plum/30" /></>
            : <Decor seed={seedOf(vendor.id)} opacity={0.4} />}
          <span className="relative grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-3xl bg-white/15 font-display text-5xl ring-4 ring-white/20">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {vendor.logo_url ? <img src={vendor.logo_url} alt={`Logo ${vendor.name}`} className="h-full w-full object-cover" /> : vendor.name[0]?.toUpperCase()}
          </span>
          <div className="relative flex-1">
            {vendor.category && <p className="text-sm font-semibold text-white/60">{vendor.category}</p>}
            <h1 className="text-[clamp(2.2rem,5vw,3.6rem)] leading-[1.02]">{vendor.name}</h1>
            {vendor.description && <p className="mt-3 max-w-2xl leading-relaxed text-white/75">{vendor.description}</p>}
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm text-white/70">
              {vendor.address && <span className="inline-flex items-center gap-1.5"><MapPin size={14} />{vendor.address}</span>}
              {vendor.phone && <a href={`https://wa.me/${vendor.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 underline"><Phone size={14} />{vendor.phone}</a>}
            </div>
          </div>
        </header>

        {cats.length > 0 && (
          <div className="mt-8 flex flex-wrap gap-1.5">
            <button onClick={() => setCat('')} className={`rounded-full px-3.5 py-1.5 text-sm font-semibold ${!cat ? 'bg-ink text-white' : 'bg-white text-ink/65 hover:bg-lilac/60'}`}>Tout</button>
            {cats.map((c) => <button key={c.id} onClick={() => setCat(c.id)} className={`rounded-full px-3.5 py-1.5 text-sm font-semibold ${cat === c.id ? 'bg-ink text-white' : 'bg-white text-ink/65 hover:bg-lilac/60'}`}>{c.name}</button>)}
          </div>
        )}
        {products.length === 0 ? (
          <p className="mt-10 rounded-3xl border-2 border-dashed border-ink/15 p-12 text-center text-ink/55">Cette boutique n’a pas encore d’article en ligne.</p>
        ) : (
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {products.filter((p) => !cat || p.category_id === cat).map((p) => (
              <article key={p.id} className="group flex flex-col overflow-hidden rounded-[24px] border border-ink/[0.07] bg-white shadow-popsm transition hover:shadow-pop">
                <div className="aspect-[4/3] overflow-hidden bg-lilac">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {p.image_url ? <img src={p.image_url} alt={p.name} className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.03]" /> : <GiftPlaceholder />}
                </div>
                <div className="flex flex-1 flex-col gap-2 p-5">
                  <h2 className="font-display text-2xl leading-tight">{p.name}</h2>
                  <p className="text-sm font-bold">{formatPrice(p.price)}</p>
                  {p.description && <p className="text-sm leading-relaxed text-ink/60">{p.description}</p>}
                  <div className="flex flex-wrap gap-1.5 text-xs font-bold">
                    {p.stock != null && <span className={`rounded-full px-2.5 py-1 ${p.stock > 0 ? 'bg-mint/15 text-mint' : 'bg-candy/10 text-candy'}`}>{p.stock > 0 ? (p.stock <= 3 ? `Plus que ${p.stock}` : 'En stock') : 'Rupture de stock'}</span>}
                    {p.wrap_available && <span className="rounded-full bg-mango/20 px-2.5 py-1 text-[#8a5a0f]">Emballage cadeau {p.wrap_price ? `+${formatPrice(p.wrap_price)}` : 'offert'}</span>}
                    {(p.options || []).map((o) => <span key={o.name} className="rounded-full bg-lilac px-2.5 py-1">{o.name} : {o.values.join(', ')}</span>)}
                  </div>
                  <button disabled={p.stock === 0} onClick={() => setSelected(p)} className="btn-candy mt-auto w-full py-3"><ShoppingBag size={16} />{p.stock === 0 ? 'Indisponible' : 'Commander'}</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      <Modal open={!!selected} onClose={() => setSelected(null)} title="Passer commande" wide>
        {selected && (
          <OrderForm product={selected} onError={(m) => toast.show(m, 'err')}
            onDone={(code) => { setDone({ code, product: selected }); setSelected(null); burst(); }} />
        )}
      </Modal>

      <Modal open={!!done} onClose={() => setDone(null)}>
        {done && (
          <div className="text-center">
            <PartyPopper size={42} className="mx-auto text-candy" />
            <h3 className="mt-3 text-3xl">Commande envoyée</h3>
            <p className="mt-2 text-ink/65">{vendor.name} a reçu votre commande et vous contactera pour le paiement et la livraison.</p>
            <div className="mt-6 rounded-2xl bg-lilac/50 p-4">
              <p className="text-sm font-semibold text-ink/55">Votre code de suivi</p>
              <p className="mt-1 text-3xl font-extrabold tracking-[0.2em]">{done.code}</p>
              <button onClick={() => { navigator.clipboard.writeText(done.code); toast.show('Code copié'); }} className="mt-2 inline-flex items-center gap-1 text-sm font-semibold underline"><Copy size={14} />Copier</button>
            </div>
            <Link href={`/suivi/${done.code}`} className="btn-primary mt-6 w-full">Suivre ma commande</Link>
          </div>
        )}
      </Modal>
      {toast.node}
    </>
  );
}

function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-ink/[0.08] px-4 py-3">
      <span><span className="block text-sm font-bold">{label}</span>{hint && <span className="block text-xs text-ink/55">{hint}</span>}</span>
      <input type="checkbox" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="relative h-6 w-11 shrink-0 rounded-full bg-ink/15 transition peer-checked:bg-candy after:absolute after:left-1 after:top-1 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition peer-checked:after:translate-x-5" />
    </label>
  );
}

function OrderForm({ product, onDone, onError }: { product: Product; onDone: (code: string) => void; onError: (m: string) => void }) {
  const [qty, setQty] = useState(1);
  const [choice, setChoice] = useState<Record<string, string>>({});
  const [f, setF] = useState({ name: '', phone: '', email: '', date: '', address: '', recipient: '', message: '' });
  const [gift, setGift] = useState(false);
  const [surprise, setSurprise] = useState(false);
  const [wrap, setWrap] = useState(false);
  const [loading, setLoading] = useState(false);
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const missing = (product.options || []).find((o) => o.values?.length && !choice[o.name]);
    if (missing) return onError(`Choisissez : ${missing.name}`);
    setLoading(true);
    const { data, error } = await createClient().rpc('place_order', {
      p_product: product.id, p_quantity: qty, p_name: f.name, p_phone: f.phone, p_email: f.email || null,
      p_delivery_date: f.date || null, p_address: f.address || null, p_recipient: gift ? f.recipient || null : null,
      p_is_gift: gift, p_surprise: gift && surprise, p_wrap: wrap, p_gift_message: gift ? f.message || null : null, p_options: choice,
    });
    setLoading(false);
    if (error) return onError(error.message);
    onDone(data.tracking_code);
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="flex items-center gap-4 rounded-2xl bg-lilac/50 p-3">
        <span className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {product.image_url ? <img src={product.image_url} alt="" className="h-full w-full object-cover" /> : <Gift className="m-5 text-candy/50" size={24} />}
        </span>
        <div className="flex-1">
          <p className="font-bold">{product.name}</p>
          <p className="text-sm text-ink/60">{formatPrice((product.price || 0) * qty + (wrap ? Number(product.wrap_price) || 0 : 0))}{product.stock != null ? ` · ${product.stock} dispo` : ''}</p>
        </div>
        <div className="flex items-center gap-1 rounded-full bg-white p-1">
          <button type="button" aria-label="Moins" onClick={() => setQty(Math.max(1, qty - 1))} className="grid h-8 w-8 place-items-center rounded-full hover:bg-lilac"><Minus size={14} /></button>
          <span className="w-6 text-center font-bold">{qty}</span>
          <button type="button" aria-label="Plus" onClick={() => setQty(Math.min(product.stock ?? 99, 99, qty + 1))} className="grid h-8 w-8 place-items-center rounded-full hover:bg-lilac"><Plus size={14} /></button>
        </div>
      </div>

      {(product.options || []).filter((o) => o.values?.length).map((o) => (
        <div key={o.name}>
          <p className="label">{o.name}</p>
          <div className="flex flex-wrap gap-2">
            {o.values.map((v) => (
              <button type="button" key={v} onClick={() => setChoice({ ...choice, [o.name]: v })}
                className={`rounded-full border px-4 py-1.5 text-sm font-semibold ${choice[o.name] === v ? 'border-ink bg-ink text-white' : 'border-ink/15 bg-white hover:border-ink/40'}`}>{v}</button>
            ))}
          </div>
        </div>
      ))}
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label className="label" htmlFor="on">Votre nom</label><input id="on" required className="input" autoComplete="name" value={f.name} onChange={set('name')} /></div>
        <div><label className="label" htmlFor="op">Téléphone / WhatsApp</label><input id="op" required type="tel" className="input" autoComplete="tel" value={f.phone} onChange={set('phone')} /></div>
      </div>
      <div><label className="label" htmlFor="oe">Email (facultatif)</label><input id="oe" type="email" className="input" value={f.email} onChange={set('email')} /></div>
      <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
        <div><label className="label" htmlFor="oa">Lieu de livraison</label><input id="oa" className="input" placeholder="Vide = retrait en boutique" value={f.address} onChange={set('address')} /></div>
        <div><label className="label" htmlFor="od">Livrer le</label><input id="od" type="date" className="input" min={new Date().toISOString().slice(0, 10)} value={f.date} onChange={set('date')} /></div>
      </div>

      <Toggle checked={gift} onChange={setGift} label="C’est un cadeau" hint="Pour quelqu’un d’autre que vous" />
      {gift && (
        <div className="space-y-4 rounded-2xl bg-lilac/40 p-4">
          <div><label className="label" htmlFor="or">Pour qui ?</label><input id="or" className="input" placeholder="Prénom du destinataire" value={f.recipient} onChange={set('recipient')} /></div>
          <Toggle checked={surprise} onChange={setSurprise} label="C’est une surprise" hint="La boutique ne révèlera pas qui l’offre" />
          <div><label className="label" htmlFor="om">Message sur la carte (facultatif)</label><textarea id="om" rows={2} className="input" value={f.message} onChange={set('message')} /></div>
        </div>
      )}
      {product.wrap_available && <Toggle checked={wrap} onChange={setWrap} label="Emballage cadeau" hint={product.wrap_price ? `La boutique emballe l’article · +${formatPrice(product.wrap_price)}` : 'La boutique emballe l’article · offert'} />}

      <p className="text-xs text-ink/55">Le paiement se règle directement avec la boutique, qui vous contacte après la commande.</p>
      <button disabled={loading} className="btn-candy w-full py-3.5">{loading ? 'Envoi…' : 'Envoyer la commande'}</button>
    </form>
  );
}
