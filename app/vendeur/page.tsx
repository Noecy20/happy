'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Phone, Mail, MapPin, Search, Check, Package, Store, ShoppingBag, Plus, Upload, Pencil, Trash2,
  CalendarDays, Gift, EyeOff, Ribbon, MessageSquareText, ExternalLink, Cake, Boxes, Hourglass, X,
} from 'lucide-react';
import PushButton from '@/components/PushButton';
import Decor, { seedOf } from '@/components/Decor';
import { createClient } from '@/lib/supabase/client';
import Logo from '@/components/Logo';
import { GiftPlaceholder } from '@/components/Illustrations';
import NotificationBell from '@/components/NotificationBell';
import SignOut from '@/components/SignOut';
import Modal from '@/components/Modal';
import { useToast } from '@/components/Toast';
import { ORDER_STEPS, VENDOR_CATEGORIES, formatDate, formatPrice, statusLabel } from '@/lib/utils';

type Vendor = { id: string; name: string; category: string; description: string; phone: string; email: string; address: string; active: boolean;
  status: string; logo_url?: string; cover_url?: string; payment_method?: string; payment_ref?: string; proof_url?: string };
type Order = {
  id: string; tracking_code: string; status: string; paid: boolean; vendor_note?: string;
  item_name: string; item_image?: string; unit_price?: number; quantity: number;
  buyer_name: string; buyer_phone: string; buyer_email?: string; recipient_name?: string;
  delivery_date?: string; delivery_address?: string; is_gift: boolean; is_surprise: boolean; gift_wrap: boolean; gift_message?: string;
  event_id?: string; celebrant_name?: string; birthday_date?: string; created_at: string;
};
type Product = { id: string; name: string; description?: string; price?: number; image_url?: string; active: boolean;
  category_id?: string | null; options: { name: string; values: string[] }[]; stock: number | null; wrap_available: boolean; wrap_price?: number | null };
type Category = { id: string; name: string };

const FILTERS = [{ k: 'actives', l: 'À traiter' }, { k: 'livree', l: 'Livrées' }, { k: 'annulee', l: 'Annulées' }, { k: 'toutes', l: 'Toutes' }];

export default function VendorPage() {
  const supabase = createClient();
  const toast = useToast();
  const [userId, setUserId] = useState('');
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [stockModal, setStockModal] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'commandes' | 'articles' | 'boutique'>('commandes');
  const [filter, setFilter] = useState('actives');
  const [q, setQ] = useState('');
  const [productModal, setProductModal] = useState<{ open: boolean; p?: Product }>({ open: false });

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return (window.location.href = '/connexion');
    setUserId(user.id);
    const { data } = await supabase.rpc('get_vendor_orders');
    setVendor(data?.vendor || null); setOrders(data?.orders || []);
    if (data?.vendor) {
      const [{ data: ps }, { data: cs }] = await Promise.all([
        supabase.from('products').select('*').eq('vendor_id', data.vendor.id).order('created_at', { ascending: false }),
        supabase.from('product_categories').select('id,name').eq('vendor_id', data.vendor.id).order('name'),
      ]);
      setProducts(ps || []); setCategories(cs || []);
    }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { load(); }, [load]);

  const update = async (o: Order, patch: Partial<Order>) => {
    const next = { ...o, ...patch };
    setOrders((all) => all.map((x) => (x.id === o.id ? next : x)));
    const { error } = await supabase.rpc('vendor_update_order', { p_order: o.id, p_status: next.status, p_paid: next.paid, p_note: next.vendor_note || null });
    if (error) { toast.show(error.message, 'err'); load(); return; }
    toast.show('Commande mise à jour');
    fetch('/api/push/order', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: o.tracking_code }) }).catch(() => null);
    if (patch.status) load(); // le stock a pu changer
  };

  // Regroupement : par anniversaire, puis commandes directes
  const groups = useMemo(() => {
    const list = orders
      .filter((o) => (filter === 'toutes' ? true : filter === 'actives' ? !['livree', 'annulee'].includes(o.status) : o.status === filter))
      .filter((o) => !q || [o.tracking_code, o.buyer_name, o.item_name, o.celebrant_name].join(' ').toLowerCase().includes(q.toLowerCase()));
    const map = new Map<string, { key: string; title: string; sub?: string; orders: Order[] }>();
    for (const o of list) {
      const key = o.event_id || 'direct';
      if (!map.has(key)) map.set(key, {
        key,
        title: o.event_id ? `Anniversaire de ${o.celebrant_name}` : 'Commandes directes',
        sub: o.event_id && o.birthday_date ? formatDate(o.birthday_date, { weekday: 'long', day: 'numeric', month: 'long' }) : 'Passées depuis la section Boutiques',
        orders: [],
      });
      map.get(key)!.orders.push(o);
    }
    return [...map.values()].sort((a, b) => (a.key === 'direct' ? 1 : b.key === 'direct' ? -1 : 0));
  }, [orders, filter, q]);

  if (loading) return <div className="grid min-h-screen place-items-center"><div className="h-10 w-10 animate-spin rounded-full border-[3px] border-lilac border-t-candy" /></div>;

  if (!vendor)
    return (
      <main className="grid min-h-screen place-items-center px-5">
        <div className="panel max-w-md p-8 text-center">
          <Store className="mx-auto text-candy" size={36} />
          <h1 className="mt-4 text-3xl">Ce compte n’a pas de boutique</h1>
          <p className="mt-2 text-ink/65">Créez un compte « Ma boutique » pour vendre sur Happy.</p>
          <div className="mt-6 flex justify-center gap-3"><Link href="/inscription?type=boutique" className="btn-candy">Créer ma boutique</Link><SignOut /></div>
        </div>
      </main>
    );

  const active = orders.filter((o) => !['livree', 'annulee'].includes(o.status)).length;
  const unpaid = orders.filter((o) => !o.paid && o.status !== 'annulee').length;
  const birthdays = new Set(orders.filter((o) => o.event_id).map((o) => o.event_id)).size;

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-ink/[0.06] bg-paper/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
          <Logo />
          <div className="flex items-center gap-3">
            <Link href={`/boutiques/${vendor.id}`} className="btn-ghost hidden py-2 text-sm sm:inline-flex"><ExternalLink size={15} />Ma vitrine</Link>
            <PushButton label="Notifications" className="btn-ghost hidden py-2 text-sm md:inline-flex" onDone={(m, ok) => toast.show(m, ok ? 'ok' : 'err')} />
            {userId && <NotificationBell userId={userId} onNew={(n) => { toast.show(n.title); load(); }} />}
            <SignOut />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-10">
        <div className="relative overflow-hidden rounded-[32px] bg-plum p-7 text-white sm:p-10">
          {vendor.cover_url
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={vendor.cover_url} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" />
            : <Decor seed={seedOf(vendor.id)} opacity={0.35} />}
          <div className="relative flex items-center gap-5">
            <span className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-3xl bg-white/15 font-display text-4xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {vendor.logo_url ? <img src={vendor.logo_url} alt="" className="h-full w-full object-cover" /> : vendor.name[0]?.toUpperCase()}
            </span>
            <div>
              <p className="text-sm font-semibold text-white/65">{vendor.category}</p>
              <h1 className="text-4xl leading-tight sm:text-5xl">{vendor.name}</h1>
            </div>
          </div>
        </div>
        {vendor.status !== 'validee' ? (
          <PendingPayment vendor={vendor} onSent={() => { toast.show('Paiement envoyé à l’administrateur'); load(); }} />
        ) : !vendor.active && <p className="mt-4 rounded-2xl bg-lilac p-3 text-sm font-semibold text-candy">Votre boutique est désactivée par l’administrateur : elle n’apparaît plus dans la section Boutiques.</p>}

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { l: 'À traiter', v: active, hi: active > 0 },
            { l: 'Paiements en attente', v: unpaid },
            { l: 'Anniversaires', v: birthdays },
            { l: 'Articles en ligne', v: products.filter((p) => p.active).length },
          ].map((s) => (
            <div key={s.l} className={`rounded-3xl p-5 ${s.hi ? 'bg-candy text-white' : 'border border-ink/[0.07] bg-white shadow-popsm'}`}>
              <p className="font-display text-5xl leading-none">{s.v}</p>
              <p className={`mt-2 text-sm font-semibold ${s.hi ? 'text-white/85' : 'text-ink/55'}`}>{s.l}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap gap-2" role="tablist">
          {[{ k: 'commandes', l: 'Commandes', i: ShoppingBag }, { k: 'articles', l: 'Mes articles', i: Package }, { k: 'boutique', l: 'Ma boutique', i: Store }].map((t) => (
            <button key={t.k} role="tab" aria-selected={tab === t.k} onClick={() => setTab(t.k as any)}
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold ${tab === t.k ? 'border-ink bg-ink text-white' : 'border-ink/10 bg-white'}`}>
              <t.i size={16} />{t.l}
            </button>
          ))}
        </div>

        {/* COMMANDES */}
        {tab === 'commandes' && (
          <>
            <div className="mt-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-wrap gap-1.5">
                {FILTERS.map((f) => (
                  <button key={f.k} onClick={() => setFilter(f.k)} className={`rounded-full px-3.5 py-1.5 text-sm font-semibold ${filter === f.k ? 'bg-lilac text-candy' : 'text-ink/55 hover:bg-lilac/50'}`}>{f.l}</button>
                ))}
              </div>
              <label className="relative md:w-72">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" />
                <input className="input py-2 pl-9" placeholder="Code, client, article…" value={q} onChange={(e) => setQ(e.target.value)} />
              </label>
            </div>

            {groups.length === 0 && <p className="mt-6 rounded-3xl border-2 border-dashed border-ink/15 p-10 text-center text-ink/55">Aucune commande dans cette vue.</p>}
            <div className="mt-6 space-y-10">
              {groups.map((g) => (
                <section key={g.key}>
                  <div className="mb-3 flex items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-2xl bg-lilac text-candy">{g.key === 'direct' ? <ShoppingBag size={18} /> : <Cake size={18} />}</span>
                    <div>
                      <h2 className="text-2xl leading-tight">{g.title}</h2>
                      <p className="text-sm text-ink/55 first-letter:uppercase">{g.sub} · {g.orders.length} commande{g.orders.length > 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <div className="space-y-3">{g.orders.map((o) => <OrderCard key={o.id} o={o} onUpdate={update} />)}</div>
                </section>
              ))}
            </div>
          </>
        )}

        {/* ARTICLES */}
        {tab === 'articles' && (
          <div className="mt-6">
            <button onClick={() => setProductModal({ open: true })} className="btn-candy"><Plus size={18} />Ajouter un article</button>
            {products.length === 0 && <p className="mt-6 rounded-3xl border-2 border-dashed border-ink/15 p-10 text-center text-ink/55">Ajoutez vos articles : les célébrants pourront les mettre dans leur liste, et tout le monde pourra les commander.</p>}
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((p) => (
                <motion.article layout key={p.id} className={`overflow-hidden rounded-[24px] border border-ink/[0.07] bg-white shadow-popsm ${p.active ? '' : 'opacity-60'}`}>
                  <div className="aspect-[4/3] bg-lilac">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {p.image_url ? <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" /> : <GiftPlaceholder />}
                  </div>
                  <div className="space-y-2 p-5">
                    {p.category_id && <p className="text-xs font-bold text-candy">{categories.find((c) => c.id === p.category_id)?.name}</p>}
                    <h3 className="font-display text-2xl leading-tight">{p.name}</h3>
                    <p className="text-sm font-bold">{formatPrice(p.price)}</p>
                    <div className="flex flex-wrap gap-1.5 text-xs font-bold">
                      <span className={`rounded-full px-2.5 py-1 ${p.stock == null ? 'bg-ink/5 text-ink/55' : p.stock > 0 ? 'bg-mint/15 text-mint' : 'bg-candy/10 text-candy'}`}>
                        {p.stock == null ? 'Stock non suivi' : p.stock > 0 ? `${p.stock} en stock` : 'Rupture'}
                      </span>
                      {p.wrap_available && <span className="rounded-full bg-mango/20 px-2.5 py-1 text-[#8a5a0f]">Emballage {p.wrap_price ? formatPrice(p.wrap_price) : 'offert'}</span>}
                      {(p.options || []).map((o) => <span key={o.name} className="rounded-full bg-lilac px-2.5 py-1">{o.name} : {o.values.join(', ')}</span>)}
                    </div>
                    {p.description && <p className="line-clamp-2 text-sm text-ink/60">{p.description}</p>}
                    <div className="flex gap-2 pt-2">
                      <button onClick={() => setProductModal({ open: true, p })} className="btn-ghost flex-1 py-2 text-sm"><Pencil size={14} />Modifier</button>
                      <button onClick={() => setStockModal(p)} className="btn-ghost px-3 py-2 text-sm" aria-label="Inventaire" title="Inventaire"><Boxes size={15} /></button>
                      <button onClick={async () => { await supabase.from('products').update({ active: !p.active }).eq('id', p.id); load(); }} className="btn-ghost py-2 text-sm">{p.active ? 'Masquer' : 'Afficher'}</button>
                      <button aria-label="Supprimer" className="btn-ghost px-3 py-2 text-sm" onClick={async () => {
                        if (!confirm(`Supprimer « ${p.name} » ?`)) return;
                        const { error } = await supabase.from('products').delete().eq('id', p.id);
                        if (error) toast.show(error.message, 'err'); else { toast.show('Article supprimé'); load(); }
                      }}><Trash2 size={14} /></button>
                    </div>
                  </div>
                </motion.article>
              ))}
            </div>
          </div>
        )}

        {/* BOUTIQUE */}
        {tab === 'boutique' && <ShopForm vendor={vendor} onSaved={() => { toast.show('Boutique enregistrée'); load(); }} onError={(m) => toast.show(m, 'err')} />}
      </main>

      <Modal open={productModal.open} onClose={() => setProductModal({ open: false })} title={productModal.p ? 'Modifier l’article' : 'Nouvel article'} wide>
        {productModal.open && (
          <ProductForm key={productModal.p?.id || 'new'} vendorId={vendor.id} userId={userId} product={productModal.p} categories={categories}
            onSaved={() => { setProductModal({ open: false }); toast.show('Article enregistré'); load(); }} />
        )}
      </Modal>
      <Modal open={!!stockModal} onClose={() => setStockModal(null)} title="Inventaire">
        {stockModal && <StockForm product={stockModal} onSaved={() => { setStockModal(null); toast.show('Stock mis à jour'); load(); }} />}
      </Modal>
      {toast.node}
    </>
  );
}

/* ------------------------------------------------------------------ */

function OrderCard({ o, onUpdate }: { o: Order; onUpdate: (o: Order, p: Partial<Order>) => void }) {
  const total = (o.unit_price || 0) * o.quantity + (o.gift_wrap ? Number((o as any).wrap_price) || 0 : 0);
  const opts = Object.entries((o as any).options || {}) as [string, string][];
  return (
    <article className="panel grid gap-5 p-5 md:grid-cols-[auto_1fr_220px] md:items-start">
      <div className="h-20 w-20 overflow-hidden rounded-2xl bg-lilac">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {o.item_image ? <img src={o.item_image} alt="" className="h-full w-full object-cover" /> : <Gift className="m-6 text-candy/50" size={30} />}
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="rounded-full bg-lilac/70 px-2.5 py-0.5 font-bold tracking-wider">{o.tracking_code}</span>
          <span className="text-ink/45">reçue le {new Date(o.created_at).toLocaleDateString('fr-FR')}</span>
        </div>
        <h3 className="mt-1 font-display text-2xl leading-tight">{o.item_name}{o.quantity > 1 ? ` × ${o.quantity}` : ''} <span className="font-sans text-base font-semibold text-ink/55">{formatPrice(total)}</span></h3>

        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm">
          <span className="font-bold">{o.buyer_name}</span>
          <a className="inline-flex items-center gap-1 underline" href={`tel:${o.buyer_phone}`}><Phone size={14} />{o.buyer_phone}</a>
          <a className="inline-flex items-center gap-1 underline" href={`https://wa.me/${o.buyer_phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer">WhatsApp</a>
          {o.buyer_email && <a className="inline-flex items-center gap-1 underline" href={`mailto:${o.buyer_email}`}><Mail size={14} />{o.buyer_email}</a>}
        </div>

        <div className="mt-3 grid gap-1.5 text-sm text-ink/75 sm:grid-cols-2">
          <span className="inline-flex items-center gap-1.5"><CalendarDays size={14} className="text-candy" />{o.delivery_date ? `Livrer le ${formatDate(o.delivery_date)}` : 'Date de livraison non précisée'}</span>
          <span className="inline-flex items-center gap-1.5"><MapPin size={14} className="text-candy" />{o.delivery_address || 'Retrait en boutique'}</span>
          {o.recipient_name && <span className="inline-flex items-center gap-1.5"><Gift size={14} className="text-candy" />Pour {o.recipient_name}</span>}
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5 text-xs font-bold">
          {o.is_gift && <span className="inline-flex items-center gap-1 rounded-full bg-candy/10 px-2.5 py-1 text-candy"><Gift size={12} />Cadeau</span>}
          {o.is_surprise && <span className="inline-flex items-center gap-1 rounded-full bg-plum/10 px-2.5 py-1 text-plum"><EyeOff size={12} />Surprise : ne pas révéler l’acheteur</span>}
          {o.gift_wrap && <span className="inline-flex items-center gap-1 rounded-full bg-mango/20 px-2.5 py-1 text-[#8a5a0f]"><Ribbon size={12} />Emballage cadeau{(o as any).wrap_price ? ` (${formatPrice((o as any).wrap_price)})` : ''}</span>}
          {opts.map(([k, v]) => <span key={k} className="rounded-full bg-lilac px-2.5 py-1">{k} : {v}</span>)}
        </div>
        {o.gift_message && <p className="mt-3 flex gap-2 rounded-2xl bg-lilac/50 p-3 text-sm"><MessageSquareText size={16} className="mt-0.5 shrink-0 text-candy" />« {o.gift_message} »</p>}

        <input className="input mt-3 py-2 text-sm" placeholder="Note visible par l’acheteur (ex. : livraison jeudi 15h)"
          defaultValue={o.vendor_note || ''} onBlur={(e) => e.target.value !== (o.vendor_note || '') && onUpdate(o, { vendor_note: e.target.value })} />
      </div>
      <div className="flex flex-col gap-2">
        <select className="input py-2.5 font-semibold" value={o.status} onChange={(e) => onUpdate(o, { status: e.target.value })} aria-label="Statut">
          {ORDER_STEPS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          <option value="annulee">{statusLabel('annulee')}</option>
        </select>
        <button onClick={() => onUpdate(o, { paid: !o.paid })} className={`btn py-2.5 text-sm ${o.paid ? 'bg-mint/15 text-mint' : 'border-ink/10 bg-white'}`}>
          {o.paid ? <><Check size={15} />Payé</> : 'Marquer comme payé'}
        </button>
      </div>
    </article>
  );
}

function ProductForm({ vendorId, userId, product, categories, onSaved }: { vendorId: string; userId: string; product?: Product; categories: Category[]; onSaved: () => void }) {
  const supabase = createClient();
  const [f, setF] = useState({
    name: product?.name || '', price: product?.price ? String(product.price) : '', description: product?.description || '', image_url: product?.image_url || '',
    category_id: product?.category_id || '', new_category: '',
    track: product ? product.stock != null : true, stock: product?.stock != null ? String(product.stock) : '1',
    wrap: product?.wrap_available || false, wrap_price: product?.wrap_price ? String(product.wrap_price) : '',
  });
  const [options, setOptions] = useState<{ name: string; values: string }[]>((product?.options || []).map((o) => ({ name: o.name, values: o.values.join(', ') })));
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });

  const upload = async (file?: File) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return setErr('Image trop lourde : 5 Mo maximum.');
    setUploading(true); setErr('');
    const path = `${userId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
    const { error } = await supabase.storage.from('gifts').upload(path, file);
    setUploading(false);
    if (error) return setErr("L'image n'a pas été envoyée : " + error.message);
    setF((x) => ({ ...x, image_url: supabase.storage.from('gifts').getPublicUrl(path).data.publicUrl }));
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setErr('');
    let category_id: string | null = f.category_id && f.category_id !== '__new' ? f.category_id : null;
    if (f.category_id === '__new' && f.new_category.trim()) {
      const name = f.new_category.trim();
      const existing = categories.find((c) => c.name.toLowerCase() === name.toLowerCase());
      if (existing) category_id = existing.id;
      else {
        const { data, error } = await supabase.from('product_categories').insert({ vendor_id: vendorId, name }).select('id').single();
        if (error) { setSaving(false); return setErr(error.message); }
        category_id = data.id;
      }
    }
    const payload: any = {
      name: f.name.trim(), price: f.price ? Number(f.price) : null, description: f.description.trim() || null, image_url: f.image_url || null,
      category_id, wrap_available: f.wrap, wrap_price: f.wrap && f.wrap_price ? Number(f.wrap_price) : null,
      options: options.filter((o) => o.name.trim() && o.values.trim()).map((o) => ({ name: o.name.trim(), values: o.values.split(',').map((v) => v.trim()).filter(Boolean) })),
    };
    // À la création, le stock initial est saisi ici ; ensuite il passe par l'inventaire
    if (!product) payload.stock = f.track ? Math.max(0, Number(f.stock) || 0) : null;
    else if (!f.track && product.stock != null) payload.stock = null;
    else if (f.track && product.stock == null) payload.stock = Math.max(0, Number(f.stock) || 0);
    const { error } = product
      ? await supabase.from('products').update(payload).eq('id', product.id)
      : await supabase.from('products').insert({ ...payload, vendor_id: vendorId });
    setSaving(false);
    if (error) return setErr(error.message);
    onSaved();
  };

  return (
    <form onSubmit={save} className="space-y-5">
      <label className="relative flex aspect-[16/9] cursor-pointer items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-ink/15 bg-paper hover:border-candy/40">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {f.image_url ? <img src={f.image_url} alt="" className="h-full w-full object-cover" /> : (
          <span className="flex flex-col items-center gap-2 text-sm font-semibold text-ink/55"><Upload size={26} />{uploading ? 'Envoi…' : 'Photo de l’article'}</span>
        )}
        <input type="file" accept="image/*" className="sr-only" onChange={(e) => upload(e.target.files?.[0])} />
      </label>
      <div className="grid gap-4 md:grid-cols-[2fr_1fr]">
        <div><label className="label" htmlFor="pn">Nom de l’article</label><input id="pn" required className="input" value={f.name} onChange={set('name')} /></div>
        <div><label className="label" htmlFor="pp">Prix (FCFA)</label><input id="pp" required type="number" min="0" className="input" value={f.price} onChange={set('price')} /></div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="label" htmlFor="pc">Catégorie</label>
          <select id="pc" className="input" value={f.category_id} onChange={set('category_id')}>
            <option value="">Sans catégorie</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            <option value="__new">+ Nouvelle catégorie…</option>
          </select>
        </div>
        {f.category_id === '__new' && <div><label className="label" htmlFor="pcn">Nom de la catégorie</label><input id="pcn" required className="input" placeholder="Robes, Parfums homme…" value={f.new_category} onChange={set('new_category')} /></div>}
      </div>
      <div><label className="label" htmlFor="pd">Description</label><textarea id="pd" rows={2} className="input" placeholder="Matière, délai de fabrication…" value={f.description} onChange={set('description')} /></div>

      <fieldset className="rounded-3xl border border-ink/[0.08] p-5">
        <legend className="px-1 text-sm font-bold">Variantes disponibles</legend>
        <p className="mb-3 text-xs text-ink/55">Ex. : Taille → S, M, L · Couleur → Rouge, Noir. Le client choisit au moment de commander.</p>
        <div className="space-y-2">
          {options.map((o, i) => (
            <div key={i} className="grid grid-cols-[1fr_2fr_auto] gap-2">
              <input className="input py-2" placeholder="Taille" value={o.name} onChange={(e) => setOptions(options.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
              <input className="input py-2" placeholder="S, M, L, XL" value={o.values} onChange={(e) => setOptions(options.map((x, j) => (j === i ? { ...x, values: e.target.value } : x)))} />
              <button type="button" aria-label="Retirer" onClick={() => setOptions(options.filter((_, j) => j !== i))} className="btn-ghost px-3"><X size={15} /></button>
            </div>
          ))}
        </div>
        <button type="button" onClick={() => setOptions([...options, { name: '', values: '' }])} className="btn-ghost mt-3 py-2 text-sm"><Plus size={15} />Ajouter une variante</button>
      </fieldset>

      <div className="grid gap-4 md:grid-cols-2">
        <fieldset className="rounded-3xl border border-ink/[0.08] p-5">
          <label className="flex items-center justify-between gap-3 text-sm font-bold">Suivre le stock
            <input type="checkbox" className="h-5 w-5 accent-[#D6336C]" checked={f.track} onChange={(e) => setF({ ...f, track: e.target.checked })} />
          </label>
          {f.track && (!product || product.stock == null) && (
            <div className="mt-3"><label className="label" htmlFor="ps">Quantité disponible</label><input id="ps" type="number" min="0" className="input" value={f.stock} onChange={set('stock')} /></div>
          )}
          {f.track && product && product.stock != null && <p className="mt-2 text-xs text-ink/55">{product.stock} en stock. Pour le modifier, utilisez le bouton Inventaire.</p>}
        </fieldset>
        <fieldset className="rounded-3xl border border-ink/[0.08] p-5">
          <label className="flex items-center justify-between gap-3 text-sm font-bold">Je peux l’emballer en cadeau
            <input type="checkbox" className="h-5 w-5 accent-[#D6336C]" checked={f.wrap} onChange={(e) => setF({ ...f, wrap: e.target.checked })} />
          </label>
          {f.wrap && <div className="mt-3"><label className="label" htmlFor="pw">Prix de l’emballage (0 = offert)</label><input id="pw" type="number" min="0" className="input" value={f.wrap_price} onChange={set('wrap_price')} /></div>}
        </fieldset>
      </div>

      {err && <p className="text-sm font-semibold text-candy">{err}</p>}
      <button disabled={saving || uploading} className="btn-candy w-full py-3.5">{saving ? 'Enregistrement…' : 'Enregistrer l’article'}</button>
    </form>
  );
}

function StockForm({ product, onSaved }: { product: Product; onSaved: () => void }) {
  const supabase = createClient();
  const [stock, setStock] = useState(product.stock != null ? String(product.stock) : '0');
  const [note, setNote] = useState('');
  const [history, setHistory] = useState<any[]>([]);
  const [err, setErr] = useState('');
  useEffect(() => {
    supabase.from('inventory_movements').select('*').eq('product_id', product.id).order('created_at', { ascending: false }).limit(8).then(({ data }) => setHistory(data || []));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id]);
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.rpc('vendor_set_stock', { p_product: product.id, p_stock: Math.max(0, Number(stock) || 0), p_note: note || null });
    if (error) return setErr(error.message);
    onSaved();
  };
  return (
    <form onSubmit={save} className="space-y-4">
      <p className="text-sm text-ink/65"><strong className="text-ink">{product.name}</strong> · stock actuel : {product.stock ?? 'non suivi'}. Comptez ce que vous avez réellement et saisissez le total.</p>
      <div className="grid grid-cols-[140px_1fr] gap-3">
        <input type="number" min="0" required className="input text-lg font-bold" value={stock} onChange={(e) => setStock(e.target.value)} aria-label="Nouveau stock" />
        <input className="input" placeholder="Note (ex. réassort du 12/10)" value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      {err && <p className="text-sm font-semibold text-candy">{err}</p>}
      <button className="btn-candy w-full py-3">Enregistrer l’inventaire</button>
      {history.length > 0 && (
        <div>
          <p className="label">Derniers mouvements</p>
          <ul className="space-y-1 text-sm">
            {history.map((h) => (
              <li key={h.id} className="flex justify-between gap-3 border-b border-ink/5 py-1.5">
                <span>{h.kind === 'vente' ? 'Vente' : h.kind === 'annulation' ? 'Annulation' : 'Inventaire'}{h.note ? ` · ${h.note}` : ''}</span>
                <span className="font-semibold">{h.quantity > 0 ? '+' : ''}{h.quantity} → {h.stock_after ?? '—'}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </form>
  );
}

function PendingPayment({ vendor, onSent }: { vendor: Vendor; onSent: () => void }) {
  const supabase = createClient();
  const [cfg, setCfg] = useState<any>(null);
  const [method, setMethod] = useState(vendor.payment_method || '');
  const [ref, setRef] = useState(vendor.payment_ref || '');
  const [proof, setProof] = useState(vendor.proof_url || '');
  const [err, setErr] = useState('');
  useEffect(() => { supabase.from('settings').select('*').eq('id', 1).maybeSingle().then(({ data }) => setCfg(data)); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);
  const methods = cfg ? [['Wave', cfg.wave_number], ['Orange Money', cfg.orange_number], ['MTN MoMo', cfg.mtn_number], ['Moov Money', cfg.moov_number]].filter(([, n]) => n) as [string, string][] : [];

  const upload = async (file?: File) => {
    if (!file) return;
    const { data: { user } } = await supabase.auth.getUser();
    const path = `${user!.id}/paiement-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
    const { error } = await supabase.storage.from('gifts').upload(path, file);
    if (error) return setErr(error.message);
    setProof(supabase.storage.from('gifts').getPublicUrl(path).data.publicUrl);
  };
  const send = async () => {
    if (!method || !ref.trim()) return setErr('Indiquez le moyen de paiement et la référence.');
    const { error } = await supabase.from('vendors').update({ payment_method: method, payment_ref: ref.trim(), proof_url: proof || null }).eq('id', vendor.id);
    if (error) return setErr(error.message);
    onSent();
  };

  const sent = !!vendor.payment_ref;
  return (
    <div className="mt-4 rounded-[28px] border border-candy/20 bg-white p-6 shadow-popsm sm:p-8">
      <div className="flex items-start gap-4">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-candy/10 text-candy"><Hourglass size={20} /></span>
        <div className="flex-1">
          <p className="text-lg font-bold">{vendor.status === 'refusee' ? 'Boutique non validée' : sent ? 'Paiement envoyé, en cours de vérification' : 'Votre vitrine attend sa validation'}</p>
          <p className="text-sm text-ink/65">
            {sent && vendor.status !== 'refusee'
              ? 'L’administrateur vérifie votre paiement. Vous pouvez déjà ajouter vos articles : ils seront visibles dès la validation.'
              : `${cfg?.vendor_fee_label || 'Frais d’ouverture'} : ${cfg ? formatPrice(cfg.vendor_fee) : '…'}. Payez puis envoyez la référence de la transaction.`}
          </p>
        </div>
      </div>
      {(!sent || vendor.status === 'refusee') && (
        <div className="mt-5 space-y-3">
          {methods.length === 0 ? <p className="rounded-2xl bg-lilac/60 p-3 text-sm">Les numéros de paiement ne sont pas encore configurés. Contactez l’administrateur.</p> : (
            <div className="grid gap-2 sm:grid-cols-2">
              {methods.map(([m, n]) => (
                <button key={m} type="button" onClick={() => setMethod(m)} className={`rounded-2xl border p-3 text-left ${method === m ? 'border-candy bg-candy/5 ring-2 ring-candy/20' : 'border-ink/10'}`}>
                  <span className="block text-sm font-bold">{m}</span><span className="text-sm text-ink/65">{n}</span>
                </button>
              ))}
            </div>
          )}
          {cfg?.payment_instructions && <p className="text-xs text-ink/60">{cfg.payment_instructions}</p>}
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <input className="input" placeholder="Référence de la transaction" value={ref} onChange={(e) => setRef(e.target.value)} />
            <label className="btn-ghost cursor-pointer justify-center"><Upload size={15} />{proof ? 'Capture ajoutée' : 'Capture (facultatif)'}
              <input type="file" accept="image/*" className="sr-only" onChange={(e) => upload(e.target.files?.[0])} /></label>
          </div>
          {err && <p className="text-sm font-semibold text-candy">{err}</p>}
          <button onClick={send} className="btn-candy w-full py-3">J’ai payé, envoyer</button>
        </div>
      )}
    </div>
  );
}

function ShopForm({ vendor, onSaved, onError }: { vendor: Vendor; onSaved: () => void; onError: (m: string) => void }) {
  const supabase = createClient();
  const [f, setF] = useState({ name: vendor.name || '', category: vendor.category || '', description: vendor.description || '', phone: vendor.phone || '', email: vendor.email || '', address: vendor.address || '', logo_url: vendor.logo_url || '', cover_url: vendor.cover_url || '' });
  const [busy, setBusy] = useState('');
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });
  const upload = async (k: 'logo_url' | 'cover_url', file?: File) => {
    if (!file) return;
    setBusy(k);
    const { data: { user } } = await supabase.auth.getUser();
    const path = `${user!.id}/${k}-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
    const { error } = await supabase.storage.from('gifts').upload(path, file);
    setBusy('');
    if (error) return onError(error.message);
    setF((x) => ({ ...x, [k]: supabase.storage.from('gifts').getPublicUrl(path).data.publicUrl }));
  };
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('vendors').update({
      name: f.name.trim(), category: f.category || null, description: f.description.trim() || null,
      phone: f.phone.trim() || null, email: f.email.trim() || null, address: f.address.trim() || null,
      logo_url: f.logo_url || null, cover_url: f.cover_url || null,
    }).eq('id', vendor.id);
    if (error) onError(error.message); else onSaved();
  };
  return (
    <form onSubmit={save} className="panel mt-6 grid max-w-3xl gap-5 p-6 sm:p-8">
      <div className="grid gap-4 sm:grid-cols-[140px_1fr]">
        <label className="relative grid aspect-square cursor-pointer place-items-center overflow-hidden rounded-3xl border-2 border-dashed border-ink/15 bg-lilac/40 text-center text-xs font-semibold text-ink/55 hover:border-candy/40">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {f.logo_url ? <img src={f.logo_url} alt="Logo" className="h-full w-full object-cover" /> : <span className="px-2"><Upload className="mx-auto mb-1" size={20} />{busy === 'logo_url' ? 'Envoi…' : 'Logo'}</span>}
          <input type="file" accept="image/*" className="sr-only" onChange={(e) => upload('logo_url', e.target.files?.[0])} />
        </label>
        <label className="relative grid cursor-pointer place-items-center overflow-hidden rounded-3xl border-2 border-dashed border-ink/15 bg-plum text-center text-xs font-semibold text-white/70">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {f.cover_url ? <img src={f.cover_url} alt="Couverture" className="absolute inset-0 h-full w-full object-cover" /> : <Decor seed={seedOf(vendor.id)} opacity={0.4} />}
          <span className="relative rounded-full bg-black/30 px-3 py-1.5"><Upload className="mr-1 inline" size={14} />{busy === 'cover_url' ? 'Envoi…' : 'Image de couverture (facultatif)'}</span>
          <input type="file" accept="image/*" className="sr-only" onChange={(e) => upload('cover_url', e.target.files?.[0])} />
        </label>
      </div>
      <div><label className="label" htmlFor="vn">Nom de la boutique</label><input id="vn" required className="input" value={f.name} onChange={set('name')} /></div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label className="label" htmlFor="vc">Ce que vous vendez</label>
          <select id="vc" className="input" value={f.category} onChange={set('category')}><option value="">Choisir…</option>{VENDOR_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
        </div>
        <div><label className="label" htmlFor="va">Adresse</label><input id="va" className="input" value={f.address} onChange={set('address')} /></div>
        <div><label className="label" htmlFor="vp">Téléphone</label><input id="vp" className="input" value={f.phone} onChange={set('phone')} /></div>
        <div><label className="label" htmlFor="ve">Email (facultatif)</label><input id="ve" type="email" className="input" value={f.email} onChange={set('email')} /></div>
      </div>
      <div><label className="label" htmlFor="vd">Présentation</label><textarea id="vd" rows={3} className="input" value={f.description} onChange={set('description')} /></div>
      <button disabled={!!busy} className="btn-candy py-3.5">Enregistrer</button>
    </form>
  );
}
