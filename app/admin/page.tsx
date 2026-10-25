'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { LayoutDashboard, Search, Users, Inbox, Store, ChevronRight, Phone, Mail, CalendarHeart, Trash2, Ban, Clock, Check, X, Settings, Plus, Receipt, ExternalLink } from 'lucide-react';
import AppShell, { NavItem } from '@/components/AppShell';
import Overview from '@/components/admin/Overview';
import { VENDOR_CATEGORIES, formatPrice } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import SignOut from '@/components/SignOut';
import NotificationBell from '@/components/NotificationBell';
import Modal from '@/components/Modal';
import { useToast } from '@/components/Toast';
import { daysUntil, formatDate } from '@/lib/utils';

type Profile = { id: string; email: string | null; full_name: string; phone: string; role: string; access_expires_at: string | null; created_at: string };
type Ext = { id: string; user_id: string; kind: 'acces' | 'prolongation'; days_requested: number; message: string; status: string; created_at: string;
  start_date?: string; end_date?: string; amount?: number; payment_method?: string; payment_ref?: string; proof_url?: string };
type Req = { id: string; full_name: string; email: string | null; phone: string; birthday_date: string | null; message: string; status: string; created_at: string };
type Vendor = { id: string; owner_id: string; name: string; category: string | null; email: string; phone: string; address: string; active: boolean;
  status: string; logo_url?: string; payment_method?: string; payment_ref?: string; proof_url?: string };
type Ev = { owner_id: string; title: string | null; celebrant_name: string; birthday_date: string; published: boolean; dress_code: string | null; theme_color: string | null };

const DURATIONS = [7, 15, 30, 60, 90];
const FILTERS = [
  { k: 'tous', l: 'Tous' }, { k: 'attente', l: 'En attente' }, { k: 'actifs', l: 'Actifs' },
  { k: 'expires', l: 'Expirés' }, { k: 'jamais', l: 'Jamais activés' },
];

const accessState = (p: Profile) =>
  !p.access_expires_at ? 'jamais' : new Date(p.access_expires_at) > new Date() ? 'actif' : 'expire';

const friendlyError = (m: string) =>
  m.includes('pas administrateur')
    ? 'Action refusée : ce navigateur est connecté avec un autre compte. Utilisez une fenêtre privée pour tester les autres rôles, puis reconnectez-vous en admin.'
    : m;

export default function AdminPage() {
  const supabase = createClient();
  const toast = useToast();
  const [me, setMe] = useState('');
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [tab, setTab] = useState<'apercu' | 'demandes' | 'users' | 'externes' | 'boutiques' | 'reglages'>('apercu');
  const [addVendor, setAddVendor] = useState(false);
  const [filter, setFilter] = useState('tous');
  const [q, setQ] = useState('');
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [exts, setExts] = useState<Ext[]>([]);
  const [reqs, setReqs] = useState<Req[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [events, setEvents] = useState<Ev[]>([]);
  const [selected, setSelected] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return (window.location.href = '/connexion?next=/admin');
    setMe(user.id);
    const { data: p } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (p?.role !== 'admin') return setAllowed(false);
    setAllowed(true);
    const [a, b, c, d, e] = await Promise.all([
      supabase.from('profiles').select('*').neq('role', 'admin').order('created_at', { ascending: false }),
      supabase.from('access_requests').select('*').order('created_at', { ascending: false }),
      supabase.from('contact_messages').select('*').order('created_at', { ascending: false }),
      supabase.from('vendors').select('*').order('name'),
      supabase.from('events').select('owner_id,title,celebrant_name,birthday_date,published,dress_code,theme_color'),
    ]);
    setProfiles(a.data || []); setExts(b.data || []); setReqs(c.data || []); setVendors(d.data || []); setEvents(e.data || []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
    // Si la session change (connexion à un autre compte dans un autre onglet), on recharge
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (me && session?.user?.id !== me) window.location.reload();
    });
    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load, me]);

  const pendingOf = useMemo(() => {
    const m: Record<string, Ext> = {};
    exts.filter((x) => x.status === 'en_attente').forEach((x) => { if (!m[x.user_id]) m[x.user_id] = x; });
    return m;
  }, [exts]);
  const eventOf = useMemo(() => Object.fromEntries(events.map((e) => [e.owner_id, e])), [events]);

  const act = async (fn: () => PromiseLike<{ error: any }>, ok: string) => {
    const { error } = await fn();
    if (error) return toast.show(friendlyError(error.message), 'err');
    toast.show(ok); load();
  };
  const grant = (userId: string, days: number) => act(() => supabase.rpc('admin_grant_access', { p_user: userId, p_days: days }), `Accès accordé pour ${days} jours`);
  const decide = (reqId: string, approve: boolean) => act(() => supabase.rpc('admin_handle_request', { p_request: reqId, p_approve: approve }), approve ? 'Demande accordée' : 'Demande refusée');
  const revoke = (userId: string) => { if (confirm('Couper l’accès maintenant ? Le lien de partage expirera immédiatement.')) act(() => supabase.rpc('admin_revoke_access', { p_user: userId }), 'Accès coupé'); };
  const remove = async (p: Profile) => {
    if (!confirm(`Supprimer définitivement ${p.full_name || 'cet utilisateur'} ? Son anniversaire, ses cadeaux et ses demandes seront effacés.`)) return;
    const res = await fetch(`/api/admin/users/${p.id}`, { method: 'DELETE' });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return toast.show(friendlyError(body.error || 'Suppression impossible.'), 'err');
    setSelected(null); toast.show('Utilisateur supprimé'); load();
  };

  if (allowed === null) return <div className="grid min-h-screen place-items-center"><div className="h-10 w-10 animate-spin rounded-full border-[3px] border-lilac border-t-candy" /></div>;
  if (!allowed)
    return (
      <main className="grid min-h-screen place-items-center px-5">
        <div className="panel max-w-md p-8 text-center">
          <p className="font-bold">Ce compte n’est pas administrateur.</p>
          <p className="mt-2 text-sm text-ink/60">Déconnectez-vous puis reconnectez-vous avec le compte admin.</p>
          <div className="mt-5 flex justify-center"><SignOut /></div>
        </div>
      </main>
    );

  const celebrants = profiles.filter((p) => p.role === 'celebrant');
  const pendingCount = Object.keys(pendingOf).length;
  const match = (s: string) => !q || s.toLowerCase().includes(q.toLowerCase());
  const list = celebrants
    .filter((p) => match(`${p.full_name} ${p.email || ''} ${p.phone || ''}`))
    .filter((p) => {
      const st = accessState(p);
      if (filter === 'attente') return !!pendingOf[p.id];
      if (filter === 'actifs') return st === 'actif';
      if (filter === 'expires') return st === 'expire';
      if (filter === 'jamais') return st === 'jamais';
      return true;
    })
    .sort((a, b) => Number(!!pendingOf[b.id]) - Number(!!pendingOf[a.id]));
  const sel = profiles.find((p) => p.id === selected) || null;

  const vendorRow = (v: Vendor) => {
    const owner = v.owner_id ? profiles.find((p) => p.id === v.owner_id) : undefined;
    return (
      <li key={v.id} className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center">
        <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-lilac font-bold text-plum">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {v.logo_url ? <img src={v.logo_url} alt="" className="h-full w-full object-cover" /> : v.name[0]?.toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-bold">{v.name}{v.category && <span className="ml-2 text-sm font-normal text-ink/55">{v.category}</span>}</p>
          <p className="truncate text-sm text-ink/60">{[v.phone, v.email, v.address].filter(Boolean).join(' · ')}</p>
          {v.payment_ref && (
            <p className="mt-1 inline-flex flex-wrap items-center gap-x-2 text-sm"><Receipt size={14} className="text-plum" />{v.payment_method}, réf. <strong>{v.payment_ref}</strong>
              {v.proof_url && <a href={v.proof_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-plum underline">capture <ExternalLink size={12} /></a>}</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {v.status === 'en_attente' ? (
            <>
              <button onClick={() => act(() => supabase.rpc('admin_validate_vendor', { p_vendor: v.id, p_approve: true }), 'Boutique validée')} className="btn-candy py-2 text-sm"><Check size={15} />Valider</button>
              <button onClick={() => act(() => supabase.rpc('admin_validate_vendor', { p_vendor: v.id, p_approve: false }), 'Boutique refusée')} className="btn-ghost py-2 text-sm">Refuser</button>
            </>
          ) : v.status === 'refusee' ? (
            <span className="rounded-full bg-ink/5 px-2.5 py-0.5 text-xs font-bold text-ink/60">Refusée</span>
          ) : (
            <>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${v.active ? 'bg-mint/15 text-mint' : 'bg-ink/5 text-ink/60'}`}>{v.active ? 'En ligne' : 'Masquée'}</span>
              <button onClick={() => act(() => supabase.from('vendors').update({ active: !v.active }).eq('id', v.id), v.active ? 'Boutique masquée' : 'Boutique en ligne')}
                className="px-2 py-2 text-sm font-bold text-plum hover:underline">{v.active ? 'Masquer' : 'Remettre en ligne'}</button>
            </>
          )}
          <a href={`/boutiques/${v.id}`} target="_blank" rel="noreferrer" className="btn-ghost py-2 text-sm">Voir</a>
          {owner && <button onClick={() => remove(owner)} className="grid h-9 w-9 place-items-center rounded-lg text-ink/50 hover:bg-candy/10 hover:text-candy" aria-label="Supprimer la boutique" title="Supprimer la boutique"><Trash2 size={16} /></button>}
        </div>
      </li>
    );
  };
  const pendingVendors = vendors.filter((v) => v.status === 'en_attente');
  const newMessages = reqs.filter((r) => r.status === 'en_attente').length;
  const pendingReqs = celebrants.filter((p) => pendingOf[p.id]);
  const nav: NavItem[] = [
    { key: 'apercu', label: 'Tableau de bord', icon: LayoutDashboard },
    { key: 'demandes', label: 'À traiter', icon: Inbox, badge: pendingCount + pendingVendors.length || undefined },
    { key: 'users', label: 'Utilisateurs', icon: Users },
    { key: 'boutiques', label: 'Boutiques', icon: Store },
    { key: 'externes', label: 'Messages', icon: Mail, badge: newMessages || undefined },
    { key: 'reglages', label: 'Paiement', icon: Settings },
  ];
  const search = (placeholder: string) => (
    <label className="relative block sm:w-72">
      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" />
      <input className="input py-2 pl-9" placeholder={placeholder} value={q} onChange={(e) => setQ(e.target.value)} />
    </label>
  );

  return (
    <>
      <AppShell nav={nav} active={tab} onNav={(k) => { setTab(k as any); setQ(''); }} user={{ name: 'Administrateur', sub: 'Happy' }}
        actions={me ? <NotificationBell userId={me} onNew={() => load()} /> : null}>

        {/* TABLEAU DE BORD */}
        {tab === 'apercu' && (
          <Overview profiles={profiles} celebrants={celebrants} exts={exts} vendors={vendors} events={events} pendingOf={pendingOf}
            onOpen={(id) => setSelected(id)} onNav={(k) => setTab(k as any)} />
        )}

        {/* À TRAITER */}
        {tab === 'demandes' && (
          <div className="space-y-10">
            <section>
              <h2 className="text-xl">Demandes d’accès</h2>
              <p className="mt-1 text-sm text-ink/60">Vérifiez le paiement reçu, puis accordez l’accès.</p>
              {pendingReqs.length === 0 ? <Empty t="Aucune demande en attente." /> : (
                <ul className="panel mt-4 divide-y divide-ink/10">
                  {pendingReqs.map((p) => {
                    const r = pendingOf[p.id];
                    return (
                      <li key={r.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                        <button onClick={() => setSelected(p.id)} className="min-w-0 flex-1 text-left">
                          <p className="font-bold hover:underline">{p.full_name || 'Sans nom'}</p>
                          <p className="text-sm text-ink/65">{r.kind === 'acces' ? 'Accès' : 'Prolongation'} de {r.days_requested} jours{r.amount ? `, ${formatPrice(r.amount)}` : ''} · {new Date(r.created_at).toLocaleDateString('fr-FR')}</p>
                          {r.payment_ref ? (
                            <p className="mt-1 inline-flex flex-wrap items-center gap-x-2 text-sm"><Receipt size={14} className="text-plum" />{r.payment_method}, réf. <strong>{r.payment_ref}</strong>
                              {r.proof_url && <a href={r.proof_url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1 font-semibold text-plum underline">capture <ExternalLink size={12} /></a>}</p>
                          ) : <p className="mt-1 text-sm font-semibold text-candy">Aucun paiement déclaré</p>}
                        </button>
                        <div className="flex gap-2">
                          <button onClick={() => decide(r.id, true)} className="btn-candy py-2 text-sm"><Check size={16} />Accorder</button>
                          <button onClick={() => decide(r.id, false)} className="btn-ghost py-2 text-sm">Refuser</button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
            <section>
              <h2 className="text-xl">Boutiques à valider</h2>
              <p className="mt-1 text-sm text-ink/60">La vitrine est en ligne dès que vous validez.</p>
              {pendingVendors.length === 0 ? <Empty t="Aucune boutique en attente." /> : (
                <ul className="panel mt-4 divide-y divide-ink/10">{pendingVendors.map((v) => vendorRow(v))}</ul>
              )}
            </section>
          </div>
        )}

        {/* UTILISATEURS */}
        {tab === 'users' && (
          <>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-1.5">
                {FILTERS.map((f) => (
                  <button key={f.k} onClick={() => setFilter(f.k)} className={`rounded-full px-3.5 py-1.5 text-sm font-semibold ${filter === f.k ? 'bg-ink text-white' : 'text-ink/70 hover:bg-lilac'}`}>
                    {f.l}{f.k === 'attente' && pendingCount ? ` (${pendingCount})` : ''}
                  </button>
                ))}
              </div>
              {search('Nom, email, téléphone…')}
            </div>
            {list.length === 0 ? <Empty t="Aucun utilisateur dans cette vue." /> : (
              <ul className="panel mt-5 divide-y divide-ink/10">
                {list.map((p) => {
                  const ev = eventOf[p.id];
                  return (
                    <li key={p.id}>
                      <button onClick={() => setSelected(p.id)} className="flex w-full items-center gap-4 p-4 text-left hover:bg-paper">
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-lilac font-bold text-plum">{(p.full_name || '?')[0].toUpperCase()}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-bold">{p.full_name || 'Sans nom'}</span>
                          <span className="block truncate text-sm text-ink/60">{[p.phone, p.email].filter(Boolean).join(' · ')}</span>
                        </span>
                        <span className="hidden w-40 shrink-0 text-sm text-ink/65 md:block">{ev ? formatDate(ev.birthday_date, { day: 'numeric', month: 'short', year: 'numeric' }) : 'Pas d’anniversaire'}</span>
                        <span className="shrink-0">{pendingOf[p.id] ? <span className="rounded-full bg-candy/10 px-2.5 py-0.5 text-xs font-bold text-candy">Demande en attente</span> : <StatusPill p={p} />}</span>
                        <ChevronRight size={18} className="hidden shrink-0 text-ink/30 sm:block" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}

        {/* BOUTIQUES */}
        {tab === 'boutiques' && (
          <>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button onClick={() => setAddVendor(true)} className="btn-primary self-start"><Plus size={16} />Ajouter une boutique</button>
              {search('Nom, téléphone…')}
            </div>
            {vendors.length === 0 ? <Empty t="Aucune boutique inscrite." /> : (
              <ul className="panel mt-5 divide-y divide-ink/10">
                {vendors.filter((v) => match(v.name + (v.email || '') + (v.phone || ''))).sort((a, b) => Number(b.status === 'en_attente') - Number(a.status === 'en_attente')).map((v) => vendorRow(v))}
              </ul>
            )}
          </>
        )}

        {/* MESSAGES DU SITE (formulaire public) */}
        {tab === 'externes' && (
          <>
            <div className="flex justify-end">{search('Nom, téléphone…')}</div>
            {reqs.length === 0 ? <Empty t="Aucun message reçu via le site." /> : (
              <ul className="panel mt-5 divide-y divide-ink/10">
                {reqs.filter((r) => match(`${r.full_name} ${r.email || ''} ${r.phone || ''}`)).map((r) => (
                  <li key={r.id} className={`flex flex-col gap-3 p-4 sm:flex-row sm:items-start ${r.status !== 'en_attente' ? 'opacity-55' : ''}`}>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold">{r.full_name} <span className="ml-2 text-xs font-normal text-ink/50">{new Date(r.created_at).toLocaleDateString('fr-FR')}</span></p>
                      <p className="text-sm text-ink/60">{[r.phone, r.email].filter(Boolean).join(' · ')}</p>
                      {r.message && <p className="mt-2 text-sm leading-relaxed">{r.message}</p>}
                    </div>
                    <div className="flex shrink-0 gap-2">
                      {r.phone && <a className="btn-ghost py-2 text-sm" href={`https://wa.me/${r.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer">WhatsApp</a>}
                      {r.status === 'en_attente' && (
                        <button onClick={() => act(() => supabase.from('contact_messages').update({ status: 'traitee' }).eq('id', r.id), 'Marqué comme traité')} className="btn-primary py-2 text-sm">Traité</button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        {tab === 'reglages' && <SettingsForm onDone={(m, ok) => toast.show(m, ok ? 'ok' : 'err')} />}
      </AppShell>

      {/* FICHE UTILISATEUR */}
      <Modal open={!!sel} onClose={() => setSelected(null)} title={sel?.full_name || 'Utilisateur'} wide>
        {sel && (
          <UserDetail
            p={sel} ev={eventOf[sel.id]} requests={exts.filter((x) => x.user_id === sel.id)}
            onGrant={(d) => grant(sel.id, d)} onDecide={decide} onRevoke={() => revoke(sel.id)} onDelete={() => remove(sel)}
          />
        )}
      </Modal>
      <Modal open={addVendor} onClose={() => setAddVendor(false)} title="Ajouter une boutique" wide>
        <AddVendorForm onDone={(err) => { if (err) return toast.show(err, 'err'); setAddVendor(false); toast.show('Boutique créée et en ligne'); load(); }} />
      </Modal>
      {toast.node}
    </>
  );
}

function StatusPill({ p }: { p: Profile }) {
  const st = accessState(p);
  if (st === 'jamais') return <span className="rounded-full bg-ink/5 px-2.5 py-0.5 text-xs font-bold text-ink/55">Jamais activé</span>;
  if (st === 'expire') return <span className="rounded-full bg-ink/5 px-2.5 py-0.5 text-xs font-bold text-ink/55">Expiré le {formatDate(p.access_expires_at!, { day: 'numeric', month: 'short' })}</span>;
  const left = daysUntil(p.access_expires_at!);
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${left <= 7 ? 'bg-mango/20 text-[#8a5a0f]' : 'bg-mint/15 text-mint'}`}>Actif · {left} j restants</span>;
}

function UserDetail({ p, ev, requests, onGrant, onDecide, onRevoke, onDelete }: {
  p: Profile; ev?: Ev; requests: Ext[]; onGrant: (d: number) => void; onDecide: (id: string, a: boolean) => void; onRevoke: () => void; onDelete: () => void;
}) {
  const pending = requests.find((r) => r.status === 'en_attente');
  const [days, setDays] = useState(pending?.days_requested || 30);
  const active = accessState(p) === 'actif';

  return (
    <div className="space-y-6">
      <div className="grid gap-3 text-sm sm:grid-cols-2">
        {p.phone && <a href={`https://wa.me/${p.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-2xl bg-lilac/50 p-3 font-semibold"><Phone size={16} className="text-candy" />{p.phone}</a>}
        {p.email && <a href={`mailto:${p.email}`} className="flex items-center gap-2 rounded-2xl bg-lilac/50 p-3 font-semibold"><Mail size={16} className="text-candy" /><span className="truncate">{p.email}</span></a>}
        <div className="flex items-center gap-2 rounded-2xl bg-lilac/50 p-3"><Clock size={16} className="text-candy" /><StatusPill p={p} /></div>
        <div className="flex items-center gap-2 rounded-2xl bg-lilac/50 p-3 text-ink/70">Inscrit le {new Date(p.created_at).toLocaleDateString('fr-FR')}</div>
      </div>

      {ev ? (
        <div className="flex items-center gap-3 rounded-2xl border border-ink/[0.07] p-4">
          <span className="h-10 w-10 shrink-0 rounded-xl" style={{ background: ev.theme_color || '#D6336C' }} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-bold">{ev.title || `Anniversaire de ${ev.celebrant_name}`}</p>
            <p className="text-sm text-ink/60"><CalendarHeart size={13} className="mr-1 inline" />{formatDate(ev.birthday_date)} · {ev.published ? 'publiée' : 'brouillon'}{ev.dress_code ? ` · ${ev.dress_code}` : ''}</p>
          </div>
        </div>
      ) : <p className="text-sm text-ink/55">Anniversaire pas encore créé.</p>}

      {pending && (
        <div className="rounded-2xl border border-candy/20 bg-candy/5 p-4">
          <p className="font-bold">{pending.kind === 'acces' ? 'Demande d’accès' : 'Demande de prolongation'} · {pending.days_requested} jours</p>
          <p className="text-sm text-ink/60">
            Envoyée le {new Date(pending.created_at).toLocaleDateString('fr-FR')}
            {pending.end_date ? ` · jusqu’au ${formatDate(pending.end_date)}` : ''}
          </p>
          {pending.payment_ref ? (
            <div className="mt-3 rounded-xl bg-white p-3 text-sm">
              <p className="flex flex-wrap items-center gap-2"><Receipt size={15} className="text-candy" /><strong>{formatPrice(pending.amount)}</strong> par {pending.payment_method} · réf. <strong>{pending.payment_ref}</strong></p>
              {pending.proof_url && <a href={pending.proof_url} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 underline">Voir la capture du paiement <ExternalLink size={12} /></a>}
            </div>
          ) : <p className="mt-2 text-sm font-semibold text-candy">Aucun paiement déclaré.</p>}
          {pending.message && <p className="mt-2 text-sm">{pending.message}</p>}
          <div className="mt-4 flex gap-2">
            <button onClick={() => onDecide(pending.id, true)} className="btn-candy flex-1"><Check size={16} />Accorder</button>
            <button onClick={() => onDecide(pending.id, false)} className="btn-ghost">Refuser</button>
          </div>
        </div>
      )}

      <div>
        <p className="label">{active ? 'Prolonger l’accès' : 'Accorder un accès'}</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <select className="input sm:w-44" value={days} onChange={(e) => setDays(Number(e.target.value))}>
            {DURATIONS.map((d) => <option key={d} value={d}>{d} jours</option>)}
          </select>
          <button onClick={() => onGrant(days)} className="btn-primary flex-1 py-3"><Check size={16} />Oui, accorder</button>
        </div>
      </div>

      {requests.length > 0 && (
        <div>
          <p className="label">Historique des demandes</p>
          <ul className="space-y-1.5 text-sm">
            {requests.map((r) => (
              <li key={r.id} className="flex justify-between gap-3 border-b border-ink/5 py-1.5">
                <span>{r.kind === 'acces' ? 'Accès' : 'Prolongation'} · {r.days_requested} j · {new Date(r.created_at).toLocaleDateString('fr-FR')}</span>
                <span className="font-semibold text-ink/60">{r.status === 'en_attente' ? 'En attente' : r.status === 'acceptee' ? 'Accordée' : 'Refusée'}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-col gap-2 border-t border-ink/[0.07] pt-5 sm:flex-row">
        {active && <button onClick={onRevoke} className="btn-ghost flex-1"><Ban size={16} />Couper l’accès</button>}
        <button onClick={onDelete} className="btn flex-1 border-candy/30 bg-white text-candy hover:bg-candy hover:text-white"><Trash2 size={16} />Supprimer l’utilisateur</button>
      </div>
    </div>
  );
}

function Empty({ t }: { t: string }) {
  return <p className="mt-4 rounded-2xl border border-dashed border-ink/20 p-8 text-center text-sm text-ink/60">{t}</p>;
}


// Opérateurs Mobile Money proposés aux utilisateurs (couleur de marque pour les reconnaître d'un coup d'œil)
const OPERATORS = [
  { k: 'wave_number', l: 'Wave', c: '#1DC8F1' },
  { k: 'orange_number', l: 'Orange Money', c: '#FF7900' },
  { k: 'mtn_number', l: 'MTN MoMo', c: '#FFCB05' },
  { k: 'moov_number', l: 'Moov Money', c: '#0066B3' },
];

function SettingRow({ label, hint, htmlFor, children }: { label: string; hint?: string; htmlFor?: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-2 p-5 sm:grid-cols-[1fr_260px] sm:items-center sm:gap-6">
      <div><label htmlFor={htmlFor} className="font-bold">{label}</label>{hint && <p className="mt-0.5 text-sm text-ink/60">{hint}</p>}</div>
      <div>{children}</div>
    </div>
  );
}

function MoneyInput({ id, value, onChange }: { id: string; value: any; onChange: (e: any) => void }) {
  return (
    <div className="relative">
      <input id={id} type="number" min="0" inputMode="numeric" className="input pr-16 text-right font-bold tabular-nums" value={value ?? ''} onChange={onChange} />
      <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-ink/50">FCFA</span>
    </div>
  );
}

function SettingsForm({ onDone }: { onDone: (m: string, ok: boolean) => void }) {
  const supabase = createClient();
  const [f, setF] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => { supabase.from('settings').select('*').eq('id', 1).maybeSingle().then(({ data }) => setF(data || {})); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);
  if (!f) return <div className="mt-10 grid place-items-center"><div className="h-9 w-9 animate-spin rounded-full border-[3px] border-lilac border-t-candy" /></div>;
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });
  const example = Math.max(Number(f.access_min_price) || 0, 30 * (Number(f.access_price_per_day) || 0));
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from('settings').update({
      access_price_per_day: Number(f.access_price_per_day) || 0, access_min_price: Number(f.access_min_price) || 0,
      vendor_fee: Number(f.vendor_fee) || 0, vendor_fee_label: f.vendor_fee_label || 'Frais d’ouverture de boutique',
      wave_number: f.wave_number || null, orange_number: f.orange_number || null, mtn_number: f.mtn_number || null, moov_number: f.moov_number || null,
      payment_instructions: f.payment_instructions || null, updated_at: new Date().toISOString(),
    }).eq('id', 1);
    setSaving(false);
    onDone(error ? error.message : 'Réglages enregistrés', !error);
  };
  return (
    <form onSubmit={save} className="max-w-3xl space-y-10 pb-24">
      <section>
        <h2 className="text-xl">Prix de l’accès célébrant</h2>
        <p className="mt-1 text-sm text-ink/60">Le célébrant paie un prix par jour, jamais moins que le minimum. Exemple pour 30 jours : <strong className="text-ink">{formatPrice(example)}</strong>.</p>
        <div className="panel mt-4 divide-y divide-ink/10">
          <SettingRow label="Prix par jour" htmlFor="s1"><MoneyInput id="s1" value={f.access_price_per_day} onChange={set('access_price_per_day')} /></SettingRow>
          <SettingRow label="Prix minimum" hint="Appliqué aux demandes courtes." htmlFor="s2"><MoneyInput id="s2" value={f.access_min_price} onChange={set('access_min_price')} /></SettingRow>
        </div>
      </section>

      <section>
        <h2 className="text-xl">Ouverture d’une boutique</h2>
        <p className="mt-1 text-sm text-ink/60">Payé une fois par la boutique avant la mise en ligne de sa vitrine.</p>
        <div className="panel mt-4 divide-y divide-ink/10">
          <SettingRow label="Montant" htmlFor="s3"><MoneyInput id="s3" value={f.vendor_fee} onChange={set('vendor_fee')} /></SettingRow>
          <SettingRow label="Nom affiché" hint="Ce que la boutique lit avant de payer." htmlFor="s4"><input id="s4" className="input" value={f.vendor_fee_label ?? ''} onChange={set('vendor_fee_label')} /></SettingRow>
        </div>
      </section>

      <section>
        <h2 className="text-xl">Numéros qui reçoivent les paiements</h2>
        <p className="mt-1 text-sm text-ink/60">Seuls les opérateurs avec un numéro sont proposés aux utilisateurs.</p>
        <div className="panel mt-4 divide-y divide-ink/10">
          {OPERATORS.map((o) => (
            <div key={o.k} className="flex items-center gap-4 p-4 sm:px-5">
              <span className="h-9 w-9 shrink-0 rounded-full ring-1 ring-ink/10" style={{ background: o.c }} aria-hidden />
              <label htmlFor={o.k} className="w-32 shrink-0 font-bold">{o.l}</label>
              <input id={o.k} type="tel" className="input flex-1 tabular-nums" placeholder="Non utilisé" value={f[o.k] ?? ''} onChange={set(o.k)} />
            </div>
          ))}
        </div>
        <label htmlFor="pi" className="mt-6 block font-bold">Consignes de paiement</label>
        <p className="text-sm text-ink/60">Affichées sous les numéros, par exemple le motif à indiquer.</p>
        <textarea id="pi" rows={3} className="input mt-2" placeholder="Indiquez votre nom en motif de paiement." value={f.payment_instructions ?? ''} onChange={set('payment_instructions')} />
      </section>

      <div className="sticky bottom-4 flex justify-end">
        <button disabled={saving} className="btn-candy px-6 py-3 shadow-pop">{saving ? 'Enregistrement…' : 'Enregistrer les réglages'}</button>
      </div>
    </form>
  );
}

function AddVendorForm({ onDone }: { onDone: (err?: string) => void }) {
  const [f, setF] = useState({ shop_name: '', category: '', phone: '', email: '', address: '', full_name: '', password: '' });
  const [loading, setLoading] = useState(false);
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await fetch('/api/admin/vendors', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(f) });
    const body = await res.json().catch(() => ({}));
    setLoading(false);
    onDone(res.ok ? undefined : body.error || 'Création impossible.');
  };
  return (
    <form onSubmit={submit} className="space-y-4" autoComplete="off">
      <p className="text-sm text-ink/60">La boutique est créée validée et en ligne. Communiquez-lui son téléphone et son mot de passe pour qu’elle se connecte.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label className="label" htmlFor="a1">Nom de la boutique</label><input id="a1" required className="input" value={f.shop_name} onChange={set('shop_name')} /></div>
        <div><label className="label" htmlFor="a2">Catégorie</label><select id="a2" className="input" value={f.category} onChange={set('category')}><option value="">Choisir…</option>{VENDOR_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></div>
        <div><label className="label" htmlFor="a3">Responsable</label><input id="a3" className="input" value={f.full_name} onChange={set('full_name')} /></div>
        <div><label className="label" htmlFor="a4">Téléphone (identifiant)</label><input id="a4" required type="tel" className="input" value={f.phone} onChange={set('phone')} /></div>
        <div><label className="label" htmlFor="a5">Email (facultatif)</label><input id="a5" type="email" className="input" value={f.email} onChange={set('email')} /></div>
        <div><label className="label" htmlFor="a6">Adresse</label><input id="a6" className="input" value={f.address} onChange={set('address')} /></div>
      </div>
      <div><label className="label" htmlFor="a7">Mot de passe provisoire</label><input id="a7" required minLength={6} className="input" autoComplete="new-password" value={f.password} onChange={set('password')} /></div>
      <button disabled={loading} className="btn-candy w-full py-3.5">{loading ? 'Création…' : 'Créer la boutique'}</button>
    </form>
  );
}
