'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Lock, PartyPopper, Copy, Package, CalendarHeart, Gift, BookHeart, ImagePlus, X } from 'lucide-react';
import Cake from '@/components/Cake';
import Invitation, { themeTones } from '@/components/Invitation';
import Programme, { ProgramStep } from '@/components/Programme';
import OrderTracking from '@/components/OrderTracking';
import PushButton from '@/components/PushButton';
import { createClient } from '@/lib/supabase/client';
import Logo from '@/components/Logo';
import Countdown from '@/components/Countdown';
import Modal from '@/components/Modal';
import WrappedCard, { GiftItem } from '@/components/WrappedCard';
import GiftVisual, { packItems } from '@/components/GiftVisual';
import { useToast } from '@/components/Toast';
import { burst } from '@/components/confetti';
import { formatDate, formatPrice, readableOn } from '@/lib/utils';

type Data = {
  status: 'ok' | 'expired' | 'not_found'; closed?: boolean; celebrant_name?: string;
  event?: { id: string; title: string; celebrant_name: string; birthday_date: string; age: number; message?: string; dress_code?: string; theme_color?: string;
    has_party: boolean; party_date?: string; party_time?: string; party_place?: string; party_details?: string;
    theme_images?: string[]; palette?: string[]; program?: ProgramStep[]; reminders?: string[] };
  gifts?: GiftItem[];
};

const STORE_KEY = 'happy-mes-cadeaux';
type Mine = string | { code: string; claim?: string; phone?: string };
const readMine = (): Record<string, Mine> => { try { return JSON.parse(localStorage.getItem(STORE_KEY) || '{}'); } catch { return {}; } };
const codeOf = (m?: Mine) => (typeof m === 'string' ? m : m?.code || '');

export default function PublicList() {
  const params = useParams<{ token: string }>();
  const supabase = createClient();
  const toast = useToast();
  const [data, setData] = useState<Data | null>(null);
  const [mine, setMine] = useState<Record<string, Mine>>({});
  const [selected, setSelected] = useState<GiftItem | null>(null);
  const [success, setSuccess] = useState<{ code: string; gift: GiftItem } | null>(null);
  const [tracking, setTracking] = useState<string | null>(null);

  const load = async () => {
    const { data } = await supabase.rpc('get_public_event', { p_token: params.token });
    setData(data || { status: 'not_found' });
  };

  // Annuler sa participation à un cadeau commun (vérifiée avec le téléphone donné à la réservation)
  const cancel = async (g: GiftItem) => {
    const m = mine[g.id];
    if (typeof m !== 'object' || !m.claim) return;
    if (!confirm(`Annuler votre participation à « ${g.name} » ?`)) return;
    const { error } = await supabase.rpc('cancel_participation', { p_token: params.token, p_claim: m.claim, p_phone: m.phone || '' });
    if (error) return toast.show(error.message, 'err');
    const next = { ...readMine() }; delete next[g.id];
    localStorage.setItem(STORE_KEY, JSON.stringify(next)); setMine(next);
    toast.show('Participation annulée'); load();
  };

  useEffect(() => {
    load(); setMine(readMine());
    const t = setInterval(load, 15000); // rafraîchit les cadeaux emballés par les autres
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.token]);

  if (!data) return <div className="grid min-h-screen place-items-center"><div className="h-10 w-10 animate-spin rounded-full border-[3px] border-lilac border-t-candy" /></div>;

  if (data.status !== 'ok')
    return (
      <main className="grid min-h-screen place-items-center px-5">
        <div className="panel max-w-md p-8 text-center">
          <Lock className="mx-auto" size={40} />
          <h1 className="mt-4 text-3xl">{data.status === 'expired' ? 'Ce lien a expiré' : 'Liste introuvable'}</h1>
          <p className="mt-3 text-ink/70">
            {data.status === 'expired'
              ? `La liste de ${data.celebrant_name} n'est plus accessible. Si vous avez réservé un cadeau, votre suivi reste disponible.`
              : 'Vérifiez le lien reçu ou demandez-le à nouveau à la personne fêtée.'}
          </p>
          <Link href="/suivi" className="btn-primary mt-6">Suivre ma commande</Link>
        </div>
      </main>
    );

  const ev = data.event!;
  const accent = ev.theme_color || '#D6336C';
  const gifts = data.gifts || [];
  const taken = gifts.filter((g) => g.claimed).length;

  return (
    <div style={{ ['--accent' as any]: accent, ['--accent-ink' as any]: readableOn(accent) }}>
      <section className="relative overflow-hidden bg-ink text-white">
        <div className="pointer-events-none absolute -right-32 -top-32 h-[520px] w-[520px] rounded-full opacity-40 blur-3xl" style={{ background: accent }} />
        <div className="pointer-events-none absolute -bottom-40 -left-20 h-96 w-96 rounded-full bg-mango/20 blur-3xl" />
        <header className="relative mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
          <Logo light />
          {Object.keys(mine).length > 0 && (
            <button onClick={() => setTracking(codeOf(Object.values(mine)[0]))} className="btn border-white/20 bg-white/10 py-2 text-sm text-white hover:bg-white/20"><Package size={16} />Ma commande</button>
          )}
        </header>
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-5 pb-16 pt-6 md:grid-cols-[1.3fr_1fr] md:pb-20 md:pt-10">
          <div>
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-white/70"><CalendarHeart size={16} />{formatDate(ev.birthday_date, { weekday: 'long', day: 'numeric', month: 'long' })}</p>
            <motion.h1
              className="mt-3 text-[clamp(2.6rem,7vw,5rem)] leading-[0.98]"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}
            >
              {ev.title || `Les ${ev.age} ans de ${ev.celebrant_name}`}
            </motion.h1>
            {ev.message && <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/75">{ev.message}</p>}
            <div className="mt-7 flex flex-wrap gap-3">
              {ev.has_party && <a href="#invitation" className="btn bg-white text-ink hover:bg-lilac"><PartyPopper size={16} />Voir l’invitation</a>}
              <a href="#cadeaux" className="btn border-white/20 bg-white/10 text-white hover:bg-white/20"><Gift size={16} />Choisir un cadeau</a>
              <PushButton eventToken={params.token} label="Me rappeler l’anniversaire" className="btn border-white/20 bg-white/10 text-white hover:bg-white/20"
                onDone={(m, ok) => toast.show(m, ok ? 'ok' : 'err')} />
            </div>
            {ev.dress_code && (
              <p className="mt-7 inline-flex items-center gap-3 rounded-full border border-white/15 bg-white/10 py-2 pl-2 pr-5 text-sm font-semibold backdrop-blur">
                <span className="h-7 w-7 rounded-full ring-2 ring-white/40" style={{ background: accent }} />
                <span><span className="text-white/60">Dress code</span> · {ev.dress_code}</span>
              </p>
            )}
          </div>
          <div className="flex flex-col items-center gap-5">
            <div className="relative w-full max-w-[380px]">
              <div className="absolute inset-x-6 bottom-6 top-10 rounded-full bg-white/10 blur-2xl" />
              <Cake age={ev.age} color={accent} className="relative w-full" />
            </div>
            <p className="font-display text-3xl">{ev.age} ans</p>
            <Countdown date={ev.birthday_date} onDark color="#fff" />
          </div>
        </div>
      </section>

      {ev.has_party && (
        <>
          <section id="invitation" className="scroll-mt-6 px-5 py-16" style={{ background: themeTones(accent).paper }}>
            <Invitation title={ev.title} name={ev.celebrant_name} age={ev.age} color={accent} date={ev.party_date || ev.birthday_date}
              time={ev.party_time} place={ev.party_place} details={ev.party_details} dressCode={ev.dress_code}
              images={ev.theme_images} palette={ev.palette} />
            <Rsvp token={params.token} color={accent} onDone={(m, ok) => toast.show(m, ok ? 'ok' : 'err')} />
          </section>
          <Programme steps={ev.program || []} color={accent} palette={ev.palette} reminders={ev.reminders} />
        </>
      )}

      <main id="cadeaux" className="mx-auto max-w-6xl scroll-mt-6 px-5 py-12">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-3xl">Choisissez un cadeau</h2>
            <p className="mt-1 text-ink/65">
              {data.closed ? 'La fête est passée, la liste est close.' : `${taken} sur ${gifts.length} déjà emballés. ${ev.celebrant_name} ne saura pas qui a pris quoi avant la fin de son anniversaire.`}
            </p>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
          {gifts.map((g) => (
            <WrappedCard
              key={g.id} gift={g} mine={!!mine[g.id]} closed={data.closed} onClaim={setSelected}
              footer={mine[g.id] ? (
                <>
                  <button onClick={() => setTracking(codeOf(mine[g.id]))} className="btn-ghost w-full py-2 text-sm"><Package size={15} />Suivre</button>
                  {g.multiple && typeof mine[g.id] === 'object' && (mine[g.id] as any).claim && !data.closed && (
                    <button onClick={() => cancel(g)} className="w-full py-1 text-xs font-semibold text-ink/55 hover:text-candy hover:underline">Annuler ma participation</button>
                  )}
                </>
              ) : null}
            />
          ))}
        </div>
      </main>

      <Modal open={!!selected} onClose={() => setSelected(null)} title="Je m’en charge" wide>
        {selected && (
          <ClaimForm
            token={params.token} gift={selected} celebrant={ev.celebrant_name}
            onError={(m) => { toast.show(m, 'err'); load(); }}
            onDone={(code, claim, phone) => {
              const m = { ...readMine(), [selected.id]: selected.multiple && claim ? { code, claim, phone } : code };
              localStorage.setItem(STORE_KEY, JSON.stringify(m)); setMine(m);
              setSuccess({ code, gift: selected }); setSelected(null); load();
              burst([accent, '#F2A93B', '#ffffff']);
            }}
          />
        )}
      </Modal>

      <Modal open={!!success} onClose={() => setSuccess(null)}>
        {success && (
          <div className="text-center">
            <PartyPopper size={44} className="mx-auto" style={{ color: accent === '#F4F4F4' ? '#14112B' : accent }} />
            <h3 className="mt-3 text-3xl">C’est emballé !</h3>
            <p className="mt-2 text-ink/70">
              {success.gift.vendor ? `${success.gift.vendor.name} a reçu votre commande et vous contactera pour le paiement.` : 'Contactez le vendeur indiqué pour finaliser l’achat.'}
              {' '}{ev.celebrant_name} ne saura pas que c’est vous.
            </p>
            <div className="mt-6 rounded-2xl border border-ink/10 bg-paper p-4">
              <p className="text-sm font-semibold text-ink/60">Votre code de suivi</p>
              <p className="mt-1 text-3xl font-extrabold tracking-[0.2em]">{success.code}</p>
              <button onClick={() => { navigator.clipboard.writeText(success.code); toast.show('Code copié'); }} className="mt-2 inline-flex items-center gap-1 text-sm font-semibold underline"><Copy size={14} />Copier</button>
            </div>
            {!success.gift.vendor && success.gift.external_contact && (
              <p className="mt-4 rounded-2xl bg-lilac p-3 text-sm"><strong>Vendeur :</strong> {success.gift.external_contact}</p>
            )}
            <button onClick={() => { setTracking(success.code); setSuccess(null); }} className="btn-primary mt-6 w-full">Suivre ma commande</button>
          </div>
        )}
      </Modal>
      <Modal open={!!tracking} onClose={() => setTracking(null)} title="Suivi de ma commande" wide>
        {tracking && <OrderTracking code={tracking} compact onToast={(m, ok) => toast.show(m, ok ? 'ok' : 'err')} />}
      </Modal>
      {toast.node}
    </div>
  );
}

function ClaimForm({ token, gift, celebrant, onDone, onError }: {
  token: string; gift: GiftItem; celebrant: string; onDone: (code: string, claim?: string, phone?: string) => void; onError: (m: string) => void;
}) {
  const [f, setF] = useState({ name: '', phone: '', email: '', address: '', date: '', message: '' });
  const [wrap, setWrap] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });

  const addImages = (files: FileList | null) => {
    const ok = [...(files || [])].filter((x) => x.size <= 5 * 1024 * 1024);
    if (ok.length < (files?.length || 0)) onError('Image trop lourde : 5 Mo maximum.');
    setImages((cur) => [...cur, ...ok].slice(0, 3));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    // Images de la carte du livre d'or
    const urls: string[] = [];
    for (const file of images) {
      const path = `livre-dor/${crypto.randomUUID()}.${(file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '')}`;
      const { error } = await supabase.storage.from('gifts').upload(path, file);
      if (error) { setLoading(false); return onError("L'image n'a pas été envoyée : " + error.message); }
      urls.push(supabase.storage.from('gifts').getPublicUrl(path).data.publicUrl);
    }
    const { data, error } = await supabase.rpc('claim_gift', {
      p_token: token, p_gift_id: gift.id, p_name: f.name, p_phone: f.phone,
      p_email: f.email || null, p_message: f.message || null, p_address: f.address || null, p_delivery_date: f.date || null, p_wrap: wrap,
      p_images: urls,
    });
    setLoading(false);
    if (error) return onError(error.message);
    onDone(data.tracking_code, data.claim_id, f.phone);
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="flex items-center gap-4 rounded-2xl bg-paper p-3">
        {(gift.image_url || packItems(gift.items).length > 1) && (
          <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-ink/10">
            <GiftVisual name={gift.name} image_url={gift.image_url} items={gift.items} labels={false} badge={false} />
          </span>
        )}
        <div>
          <p className="font-bold">{gift.name}</p>
          <p className="text-sm text-ink/65">{formatPrice(gift.price)}{gift.vendor ? ` · ${gift.vendor.name}` : ''}</p>
        </div>
      </div>
      {packItems(gift.items).length > 1 && (
        <div>
          <p className="text-sm font-bold">Ce pack contient</p>
          <ul className="mt-1.5 divide-y divide-ink/10 rounded-xl border border-ink/10 text-sm">
            {packItems(gift.items).map((it, i) => (
              <li key={i} className="flex justify-between gap-3 px-3 py-2"><span>{it.name}</span>{it.price ? <span className="font-semibold text-ink/70">{formatPrice(it.price)}</span> : null}</li>
            ))}
          </ul>
        </div>
      )}
      <p className="text-sm text-ink/70">
        {gift.vendor
          ? 'Vos coordonnées sont transmises à la boutique pour préparer la commande. Le paiement se fait directement avec elle.'
          : 'Ce cadeau n’a pas de boutique partenaire : vous recevrez le contact du vendeur.'}
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label className="label" htmlFor="cn">Votre nom</label><input id="cn" required className="input" value={f.name} onChange={set('name')} /></div>
        <div><label className="label" htmlFor="cp">Téléphone / WhatsApp</label><input id="cp" required className="input" value={f.phone} onChange={set('phone')} /></div>
      </div>
      <div><label className="label" htmlFor="ce">Email (facultatif)</label><input id="ce" type="email" className="input" value={f.email} onChange={set('email')} /></div>
      <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
        <div><label className="label" htmlFor="ca">Lieu de livraison</label><input id="ca" className="input" placeholder="Vide = retrait en boutique" value={f.address} onChange={set('address')} /></div>
        <div><label className="label" htmlFor="cd">Livrer le</label><input id="cd" type="date" className="input" min={new Date().toISOString().slice(0, 10)} value={f.date} onChange={set('date')} /></div>
      </div>
      {gift.wrap_available && (
        <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-ink/[0.08] px-4 py-3">
          <span><span className="block text-sm font-bold">Emballage cadeau par la boutique</span><span className="block text-xs text-ink/55">{gift.wrap_price ? `+ ${formatPrice(gift.wrap_price)}` : 'Offert'}</span></span>
          <input type="checkbox" className="peer sr-only" checked={wrap} onChange={(e) => setWrap(e.target.checked)} />
          <span className="relative h-6 w-11 shrink-0 rounded-full bg-ink/15 transition peer-checked:bg-candy after:absolute after:left-1 after:top-1 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition peer-checked:after:translate-x-5" />
        </label>
      )}
      <fieldset className="rounded-3xl bg-[#FBF6EE] p-5 ring-1 ring-mango/30">
        <legend className="sr-only">Votre carte pour le livre d’or</legend>
        <p className="inline-flex items-center gap-2 font-display text-2xl"><BookHeart size={20} className="text-mango" />Votre carte pour le livre d’or</p>
        <p className="mt-1 text-xs text-ink/55">{celebrant} la découvrira avec votre nom le lendemain de son anniversaire, dans un livre à garder.</p>
        <textarea id="cm" rows={3} className="input mt-3 bg-white font-book text-lg italic" placeholder={`Un mot pour ${celebrant}…`} value={f.message} onChange={set('message')} aria-label={`Un mot pour ${celebrant}`} />
        <div className="mt-3 flex flex-wrap gap-2">
          {images.map((img, i) => (
            <span key={i} className="relative h-20 w-20 overflow-hidden rounded-xl bg-white shadow-popsm ring-4 ring-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={URL.createObjectURL(img)} alt="" className="h-full w-full object-cover" />
              <button type="button" aria-label="Retirer l’image" onClick={() => setImages(images.filter((_, j) => j !== i))}
                className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-ink/70 text-white"><X size={13} /></button>
            </span>
          ))}
          {images.length < 3 && (
            <label className="grid h-20 w-20 cursor-pointer place-items-center rounded-xl border-2 border-dashed border-mango/40 text-center text-[11px] font-semibold text-ink/55 hover:border-mango">
              <span><ImagePlus size={20} className="mx-auto mb-1 text-mango" />Photo</span>
              <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => { addImages(e.target.files); e.target.value = ''; }} />
            </label>
          )}
        </div>
        <p className="mt-2 text-xs text-ink/45">Jusqu’à 3 images (souvenirs, photos ensemble…), 5 Mo maximum chacune.</p>
      </fieldset>
      <button disabled={loading} className="btn w-full py-3.5 shadow-popsm" style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}>
        {loading ? 'Réservation…' : 'Réserver ce cadeau'}
      </button>
    </form>
  );
}

function Rsvp({ token, color, onDone }: { token: string; color: string; onDone: (m: string, ok: boolean) => void }) {
  const key = `happy-rsvp-${token}`;
  const [sent, setSent] = useState<{ label: string; id?: string } | null>(null);
  const [reply, setReply] = useState<string | null>(null);
  const [f, setF] = useState({ name: '', phone: '', attending: 'oui', guests: 1, message: '' });
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    const raw = localStorage.getItem(key);
    if (!raw) return;
    let v: { label: string; id?: string };
    try { v = JSON.parse(raw); } catch { v = { label: raw }; } // ancienne version : simple texte
    setSent(v);
    if (v.id) createClient().rpc('get_my_rsvp', { p_token: token, p_rsvp: v.id }).then(({ data }) => setReply(data?.host_reply || null));
  }, [key, token]);

  if (sent)
    return (
      <div className="mx-auto mt-6 max-w-[640px] space-y-3">
        <p className="rounded-2xl bg-white p-4 text-center text-sm font-semibold shadow-popsm">Merci, votre réponse a été envoyée : {sent.label}.</p>
        {reply && (
          <div className="rounded-2xl bg-white p-4 shadow-popsm">
            <p className="text-xs font-semibold text-ink/55">Réponse de la personne fêtée</p>
            <p className="mt-1 font-book text-lg italic">« {reply} »</p>
          </div>
        )}
      </div>
    );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await createClient().rpc('rsvp', { p_token: token, p_name: f.name, p_phone: f.phone || null, p_attending: f.attending, p_guests: f.guests, p_message: f.message || null });
    setLoading(false);
    if (error) return onDone(error.message, false);
    const label = f.attending === 'oui' ? (f.guests > 1 ? `je serai là, à ${f.guests}` : 'je serai là') : f.attending === 'non' ? 'je ne pourrai pas venir' : 'peut-être';
    const v = { label, id: typeof data === 'string' ? data : undefined };
    localStorage.setItem(key, JSON.stringify(v)); setSent(v); onDone('Réponse envoyée', true);
  };

  return (
    <form onSubmit={submit} className="mx-auto mt-6 max-w-[640px] space-y-4 rounded-[24px] bg-white p-6 shadow-popsm sm:p-8">
      <h3 className="text-center font-book text-3xl font-semibold">Serez-vous là ?</h3>
      <div className="grid grid-cols-3 gap-2">
        {[{ k: 'oui', l: 'Oui' }, { k: 'peut-etre', l: 'Peut-être' }, { k: 'non', l: 'Non' }].map((o) => (
          <button key={o.k} type="button" onClick={() => setF({ ...f, attending: o.k })}
            className={`rounded-xl border py-3 text-sm font-bold transition ${f.attending === o.k ? 'border-transparent text-white' : 'border-ink/10 bg-white'}`}
            style={f.attending === o.k ? { background: color === '#F7F5F2' ? '#14112B' : color, color: readableOn(color === '#F7F5F2' ? '#14112B' : color) } : undefined}>{o.l}</button>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
        <input required className="input" placeholder="Votre nom" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} aria-label="Votre nom" />
        {f.attending !== 'non' && (
          <select className="input" value={f.guests} onChange={(e) => setF({ ...f, guests: Number(e.target.value) })} aria-label="Nombre de personnes">
            {[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n === 1 ? 'Seul(e)' : `${n} personnes`}</option>)}
          </select>
        )}
      </div>
      <input className="input" type="tel" placeholder="Téléphone (pour recevoir une réponse sur WhatsApp)" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} aria-label="Téléphone" />
      <input className="input" placeholder="Un petit mot (facultatif)" value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} aria-label="Un petit mot" />
      <button disabled={loading} className="btn w-full py-3" style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}>{loading ? 'Envoi…' : 'Envoyer ma réponse'}</button>
    </form>
  );
}
