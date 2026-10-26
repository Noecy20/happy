'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BookHeart, CalendarHeart, Copy, MailOpen, ImagePlus, Layers, X, KeyRound, Lock, UserRound, MessageCircle, Pencil, Plus, Trash2, Upload, Clock, Check, Send, Eye, Palette, Phone, Mail,
  PartyPopper, Store, Gift as GiftIcon, Users, CalendarRange, Hourglass,
} from 'lucide-react';
import PushButton from '@/components/PushButton';
import { createClient } from '@/lib/supabase/client';
import NotificationBell from '@/components/NotificationBell';
import Countdown from '@/components/Countdown';
import Modal from '@/components/Modal';
import { GiftItem } from '@/components/WrappedCard';
import SignOut from '@/components/SignOut';
import AppShell, { NavItem } from '@/components/AppShell';
import GiftCard from '@/components/GiftCard';
import InvitationEditor from '@/components/celebrant/InvitationEditor';
import { GiftPlaceholder } from '@/components/Illustrations';
import GiftVisual, { packItems } from '@/components/GiftVisual';
import PasswordInput from '@/components/PasswordInput';
import GuestBook, { GuestCard } from '@/components/GuestBook';
import { useToast } from '@/components/Toast';
import { burst } from '@/components/confetti';
import { THEME_COLORS, colorName, daysUntil, formatDate, formatPrice, nextBirthday, readableOn, siteUrl } from '@/lib/utils';

type Profile = { id: string; full_name: string; email: string | null; phone: string | null; role: string; access_expires_at: string | null };
type EventRow = {
  id: string; title: string; celebrant_name: string; birth_date: string; birthday_date: string; message: string;
  dress_code: string; theme_color: string; share_token: string; published: boolean;
  has_party: boolean; party_date: string | null; party_time: string | null; party_place: string | null; party_details: string | null;
  photo_url?: string | null;
};
type Vendor = { id: string; name: string; address?: string; category?: string };
type Product = { id: string; vendor_id: string; name: string; description?: string; price?: number; image_url?: string; stock?: number | null; options?: { name: string; values: string[] }[] };

const ageOf = (ev: EventRow) => Number(ev.birthday_date.slice(0, 4)) - Number(ev.birth_date.slice(0, 4));

export default function Dashboard() {
  const supabase = createClient();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [event, setEvent] = useState<EventRow | null>(null);
  const [gifts, setGifts] = useState<GiftItem[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [guestbook, setGuestbook] = useState<{ cards: GuestCard[]; count: number }>({ cards: [], count: 0 });
  const [bookOpen, setBookOpen] = useState(false);
  const [section, setSection] = useState('accueil');
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [pending, setPending] = useState(false);
  const [rsvps, setRsvps] = useState<any[]>([]);

  const [editEvent, setEditEvent] = useState(false);
  const [giftModal, setGiftModal] = useState<{ open: boolean; gift?: GiftItem }>({ open: false });
  const [requestModal, setRequestModal] = useState<null | 'acces' | 'prolongation'>(null);
  const [publishModal, setPublishModal] = useState(false);

  const loadGifts = useCallback(async () => {
    const { data } = await supabase.rpc('get_my_gifts');
    setGifts(data?.gifts || []);
    setRevealed(!!data?.revealed);
    setGuestbook({ cards: data?.guestbook || [], count: data?.guestbook_count || 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return (window.location.href = '/connexion');
    const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    if (p?.role === 'vendor') return (window.location.href = '/vendeur');
    setProfile(p);
    const [{ data: ev }, { data: vs }, { data: req }] = await Promise.all([
      supabase.from('events').select('*').eq('owner_id', user.id).maybeSingle(),
      supabase.from('vendors').select('id,name,address,category').eq('active', true).order('name'),
      supabase.from('access_requests').select('id').eq('user_id', user.id).eq('status', 'en_attente'),
    ]);
    setEvent(ev); setVendors(vs || []); setPending(!!req?.length);
    if (ev) supabase.from('rsvps').select('*').eq('event_id', ev.id).order('created_at', { ascending: false }).then(({ data }) => setRsvps(data || []));
    await loadGifts();
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
    const onFocus = () => load();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [load]);

  if (loading)
    return <div className="grid min-h-screen place-items-center"><div className="h-10 w-10 animate-spin rounded-full border-[3px] border-lilac border-t-candy" /></div>;

  // Compte de connexion sans profil (profil supprimé à la main dans la base)
  if (!profile)
    return (
      <main className="grid min-h-screen place-items-center px-5">
        <div className="panel max-w-md p-8 text-center">
          <h1 className="text-3xl">Profil introuvable</h1>
          <p className="mt-2 text-ink/65">Ce compte n’a plus de profil. Contactez l’administrateur ou créez un nouveau compte.</p>
          <div className="mt-6 flex justify-center"><SignOut /></div>
        </div>
      </main>
    );

  const hasAccess = !!profile.access_expires_at && new Date(profile.access_expires_at) > new Date();
  const daysLeft = profile.access_expires_at ? daysUntil(profile.access_expires_at) : 0;
  const accent = event?.theme_color || '#D6336C';
  const textAccent = readableOn(accent) === '#fff' ? accent : '#14112B';
  const taken = gifts.filter((g) => g.claimed).length;
  const shareLink = event ? `${siteUrl()}/e/${event.share_token}` : '';

  const nav: NavItem[] = [
    { key: 'accueil', label: 'Mon anniversaire', icon: CalendarHeart },
    { key: 'liste', label: 'Ma liste', icon: GiftIcon },
    ...(event?.has_party ? [
      { key: 'invitation', label: 'Invitation', icon: MailOpen },
      { key: 'invites', label: 'Invités', icon: Users, badge: rsvps.filter((r) => r.attending !== 'non' && r.guests > 1 && !r.host_reply).length || undefined },
    ] : []),
    { key: 'livre', label: 'Livre d’or', icon: BookHeart },
    { key: 'compte', label: 'Mon compte', icon: UserRound },
  ];
  const needEvent = (
    <div className="panel p-8 text-center">
      <p className="font-bold">Créez d’abord votre anniversaire.</p>
      <button onClick={() => setSection('accueil')} className="btn-primary mt-4">Créer mon anniversaire</button>
    </div>
  );

  return (
    <div style={{ ['--accent' as any]: accent, ['--accent-ink' as any]: readableOn(accent) }}>
      <AppShell nav={nav} active={section} onNav={setSection}
        user={{ name: profile.full_name || 'Mon compte', sub: profile.phone || profile.email || undefined }}
        actions={<>
          {profile.role === 'admin' && <Link href="/admin" className="btn-ghost py-2 text-sm">Admin</Link>}
          <PushButton label="Notifications" className="btn-ghost hidden py-2 text-sm sm:inline-flex" onDone={(m, ok) => toast.show(m, ok ? 'ok' : 'err')} />
          <NotificationBell userId={profile.id} onNew={(n) => { toast.show(n.title); if (n.kind === 'claim') loadGifts(); if (n.kind === 'access' || n.kind === 'rsvp') load(); }} />
        </>}>

        {/* MON ANNIVERSAIRE */}
        {section === 'accueil' && (
          <>
            <AccessBanner hasAccess={hasAccess} daysLeft={daysLeft} expires={profile.access_expires_at} pending={pending}
              onRequest={() => setRequestModal(profile.access_expires_at ? 'prolongation' : 'acces')} />
            {!event ? (
              <section className="panel mt-6 p-6 md:p-8">
                <h2 className="text-3xl">Créez votre anniversaire</h2>
                <p className="mt-2 text-ink/70">Votre date de naissance, vos couleurs, et la fête si vous en organisez une.</p>
                <div className="mt-8">
                  <EventForm userId={profile.id} defaultName={profile.full_name?.split(' ')[0]} onSaved={(ev) => { setEvent(ev); toast.show('Anniversaire créé'); }} />
                </div>
              </section>
            ) : (
              <>
                <section className="relative mt-6 overflow-hidden rounded-[20px] bg-ink text-white">
                  <Image src="/images/amis-plage.jpg" alt="" fill priority sizes="(max-width: 1024px) 100vw, 900px" className="object-cover" style={{ objectPosition: 'center 60%' }} />
                  <div className="absolute inset-0 bg-gradient-to-r from-ink/85 via-ink/55 to-ink/10" />
                  <div className="relative flex flex-wrap items-end justify-between gap-4 p-6 sm:p-8">
                    <div className="flex items-end gap-4">
                      {event.photo_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={event.photo_url} alt="" className="h-24 w-20 shrink-0 rounded-t-full rounded-b-lg object-cover ring-[3px] ring-mango" />
                      )}
                      <div>
                        <p className="text-sm font-semibold text-white/75 first-letter:uppercase">{formatDate(event.birthday_date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
                        <h2 className="mt-1 text-3xl leading-tight sm:text-4xl">{event.title || `L’anniversaire de ${event.celebrant_name}`}</h2>
                        <p className="mt-1 text-lg font-bold text-mango">{ageOf(event)} ans</p>
                      </div>
                    </div>
                    <button onClick={() => setEditEvent(true)} className="btn border-white/30 bg-white/10 py-2 text-sm text-white backdrop-blur hover:bg-white/20"><Palette size={15} />Personnaliser</button>
                  </div>
                </section>

                <dl className="mt-6 grid gap-x-8 gap-y-4 border-y border-ink/10 py-5 text-sm sm:grid-cols-2 lg:grid-cols-4">
                  <div><dt className="text-ink/55">Dans</dt><dd className="mt-1"><Countdown date={event.birthday_date} color={textAccent} compact /></dd></div>
                  <div><dt className="text-ink/55">Liste</dt><dd className="mt-1 font-bold">{event.published ? <span className="text-mint">Publiée</span> : 'Brouillon'}</dd></div>
                  <div><dt className="text-ink/55">Dress code</dt><dd className="mt-1 flex items-center gap-2 font-bold">{event.theme_color && <span className="h-3.5 w-3.5 rounded-full ring-1 ring-ink/15" style={{ background: accent }} />}{event.dress_code || '—'}</dd></div>
                  <div><dt className="text-ink/55">Fête</dt><dd className="mt-1 font-bold">{event.has_party ? `${event.party_date ? formatDate(event.party_date, { day: 'numeric', month: 'long' }) : 'Oui'}${event.party_place ? ` · ${event.party_place}` : ''}` : 'Pas de fête prévue'}</dd></div>
                </dl>

                <section className="mt-8">
                  <h3 className="text-xl">Partager</h3>
                  <div className="mt-3">
                    {event.published ? (
                      hasAccess ? (
                        <div className="space-y-3">
                          {event.has_party && (
                            <ShareLink label="Lien des invités, avec la carte d’invitation" url={`${siteUrl()}/e/${(event as any).invite_token}`}
                              text="Tu es invité(e) à mon anniversaire ! Invitation et liste de cadeaux :" onCopy={() => toast.show('Lien invités copié')} />
                          )}
                          <ShareLink label={event.has_party ? 'Lien de la liste seule, sans invitation' : 'Lien de ma liste'} url={shareLink}
                            text="Ma liste d’anniversaire :" onCopy={() => toast.show('Lien copié')} />
                        </div>
                      ) : <p className="flex items-center gap-2 rounded-xl bg-lilac p-3 text-sm font-semibold text-candy"><Lock size={16} />Lien expiré : vos amis ne peuvent plus l’ouvrir.</p>
                    ) : hasAccess ? (
                      <button disabled={gifts.length === 0} onClick={() => setPublishModal(true)} className="btn-candy py-3">
                        <Send size={16} />{gifts.length === 0 ? 'Ajoutez un cadeau pour publier' : 'Publier et obtenir le lien'}
                      </button>
                    ) : (
                      <p className="text-sm text-ink/65">Le lien sera disponible une fois votre accès activé et la liste publiée.</p>
                    )}
                  </div>
                </section>

                <section className="mt-8">
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="text-xl">Cadeaux pris en charge</h3>
                    <button onClick={() => setSection('liste')} className="text-sm font-bold text-candy hover:underline">Voir ma liste</button>
                  </div>
                  <p className="mt-2 text-sm text-ink/65"><strong className="text-ink">{taken}</strong> sur {gifts.length} · {revealed ? 'la fête est passée, découvrez qui vous a gâté.' : 'les noms restent secrets jusqu’au lendemain de votre anniversaire.'}</p>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-lilac">
                    <motion.div className="h-full rounded-full" style={{ background: accent }} initial={{ width: 0 }} animate={{ width: gifts.length ? `${(taken / gifts.length) * 100}%` : 0 }} transition={{ duration: 1 }} />
                  </div>
                </section>
              </>
            )}
          </>
        )}

        {/* MA LISTE */}
        {section === 'liste' && (!event ? needEvent : (
          <>
            {revealed && taken > 0 && <Reveal gifts={gifts.filter((g) => g.claimed)} />}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-ink/65">{gifts.length} cadeau{gifts.length > 1 ? 'x' : ''} · {taken} pris en charge</p>
              {!revealed && <button onClick={() => setGiftModal({ open: true })} className="btn-primary"><Plus size={18} />Ajouter un cadeau</button>}
            </div>
            {gifts.length === 0 ? (
              <button onClick={() => setGiftModal({ open: true })} className="mt-5 grid w-full place-items-center rounded-2xl border-2 border-dashed border-ink/15 p-10 text-center hover:border-candy/40">
                <span className="relative h-28 w-40 -rotate-3 overflow-hidden rounded-xl shadow-popsm">
                  <Image src="/images/happy-postit.jpg" alt="" fill sizes="160px" className="object-cover" />
                </span>
                <p className="mt-5 font-semibold">Ajoutez votre premier cadeau</p>
                <p className="text-sm text-ink/55">Un article d’une boutique Happy, ou n’importe quel cadeau.</p>
              </button>
            ) : (
              <ul className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {gifts.map((g) => (
                  <GiftCard key={g.id} g={g} editable={!g.claimed && !revealed}
                    onEdit={() => setGiftModal({ open: true, gift: g })}
                    onDelete={async () => {
                      if (!confirm(`Retirer « ${g.name} » de la liste ?`)) return;
                      const { error } = await supabase.from('gifts').delete().eq('id', g.id);
                      if (error) toast.show('Suppression impossible.', 'err'); else { toast.show('Cadeau retiré'); loadGifts(); }
                    }} />
                ))}
              </ul>
            )}
          </>
        ))}

        {/* INVITÉS */}
        {section === 'invitation' && event?.has_party && (
          <InvitationEditor event={event as any} userId={profile.id} inviteUrl={event.published ? `${siteUrl()}/e/${(event as any).invite_token}` : undefined}
            onSaved={(ev) => setEvent(ev)} onToast={(m, ok) => toast.show(m, ok ? 'ok' : 'err')} />
        )}

        {section === 'invites' && event?.has_party && <RsvpPanel rsvps={rsvps} onReload={load} onToast={(m, ok) => toast.show(m, ok ? 'ok' : 'err')} />}

        {/* LIVRE D'OR */}
        {section === 'livre' && (!event ? needEvent : (
          <section className="flex flex-col items-center gap-8 sm:flex-row sm:items-start">
            <button onClick={() => revealed && guestbook.cards.length > 0 && setBookOpen(true)} disabled={!revealed || guestbook.cards.length === 0} aria-label="Ouvrir le livre d’or"
              className="relative grid h-60 w-44 shrink-0 place-items-center overflow-hidden rounded-r-lg rounded-l-sm text-center shadow-[0_24px_40px_-16px_rgba(0,0,0,.6)] transition enabled:hover:-translate-y-1"
              style={{ background: `linear-gradient(150deg, color-mix(in srgb, ${event.theme_color || '#22306B'} 72%, #14112B), color-mix(in srgb, ${event.theme_color || '#22306B'} 38%, #0c0a1c))` }}>
              <span className="absolute inset-y-0 left-0 w-3 bg-gradient-to-r from-black/40 to-transparent" />
              <span className="absolute inset-3 rounded-sm border border-[#D9B977]/70" />
              <span className="relative flex flex-col items-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {event.photo_url && <img src={event.photo_url} alt="" className="mb-3 h-20 w-16 rounded-t-full rounded-b-md object-cover ring-2 ring-[#D9B977]" />}
                <span className="font-book text-2xl italic leading-tight text-[#E9CF9C]">Livre d’or</span>
              </span>
              {!revealed && <Lock size={16} className="absolute bottom-5 text-[#E9CF9C]/80" />}
            </button>
            <div>
              <h2 className="text-3xl">Votre livre d’or</h2>
              <p className="mt-2 max-w-md leading-relaxed text-ink/70">
                {revealed
                  ? guestbook.cards.length
                    ? `${guestbook.cards.length} carte${guestbook.cards.length > 1 ? 's' : ''} de vos proches, avec leurs mots et leurs photos. Feuilletez-le et gardez-le en PDF.`
                    : 'Aucune carte n’a été écrite pour cet anniversaire.'
                  : guestbook.count
                    ? `${guestbook.count} carte${guestbook.count > 1 ? 's' : ''} vous attend${guestbook.count > 1 ? 'ent' : ''}. Le livre s’ouvrira le lendemain de votre anniversaire.`
                    : 'Quand vos proches réservent un cadeau, ils vous écrivent une carte. Le livre s’ouvrira le lendemain de votre anniversaire.'}
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                {revealed && guestbook.cards.length > 0 && <button onClick={() => setBookOpen(true)} className="btn-primary"><BookHeart size={17} />Ouvrir le livre d’or</button>}
                <button onClick={() => setSection('compte')} className="btn-ghost">{event.photo_url ? 'Changer la photo de couverture' : 'Ajouter ma photo sur la couverture'}</button>
              </div>
            </div>
          </section>
        ))}

        {/* MON COMPTE */}
        {section === 'compte' && (
          <AccountSection profile={profile} event={event} hasAccess={hasAccess} daysLeft={daysLeft} pending={pending}
            onProfile={(p) => setProfile(p)} onEvent={(ev) => setEvent(ev)}
            onRequest={() => setRequestModal(profile.access_expires_at ? 'prolongation' : 'acces')}
            onToast={(m, ok) => toast.show(m, ok ? 'ok' : 'err')} />
        )}
      </AppShell>

      <AnimatePresence>
        {bookOpen && event && (
          <GuestBook celebrant={event.celebrant_name} age={ageOf(event)} date={event.birthday_date} color={event.theme_color || '#22306B'} photo={event.photo_url}
            cards={guestbook.cards} onClose={() => setBookOpen(false)} />
        )}
      </AnimatePresence>

      <Modal open={editEvent} onClose={() => setEditEvent(false)} title="Personnaliser l’anniversaire" wide>
        {event && <EventForm userId={profile.id} event={event} onSaved={(ev) => { setEvent(ev); setEditEvent(false); toast.show('Modifications enregistrées'); }} />}
      </Modal>

      <Modal open={giftModal.open} onClose={() => setGiftModal({ open: false })} title={giftModal.gift ? 'Modifier le cadeau' : 'Ajouter un cadeau'} wide>
        {event && (
          <GiftForm key={giftModal.gift?.id || 'new'} eventId={event.id} userId={profile.id} vendors={vendors} gift={giftModal.gift} position={gifts.length}
            onSaved={() => { setGiftModal({ open: false }); loadGifts(); toast.show(giftModal.gift ? 'Cadeau modifié' : 'Cadeau ajouté'); }} />
        )}
      </Modal>

      <Modal open={publishModal} onClose={() => setPublishModal(false)} title="Publier votre liste ?">
        <p className="leading-relaxed text-ink/70">
          Vous obtiendrez un lien à partager. Après publication, le <strong>prénom</strong> et la <strong>date de naissance</strong> ne pourront plus être modifiés.
          Le lien restera actif jusqu’au {profile.access_expires_at ? formatDate(profile.access_expires_at) : ''}.
        </p>
        <div className="mt-6 flex gap-3">
          <button onClick={() => setPublishModal(false)} className="btn-ghost flex-1">Pas encore</button>
          <button className="btn-candy flex-1" onClick={async () => {
            const { data, error } = await supabase.from('events').update({ published: true }).eq('id', event!.id).select().single();
            if (error) return toast.show(error.message, 'err');
            setEvent(data); setPublishModal(false); burst([accent, '#F2A93B', '#fff']); toast.show('Liste publiée');
          }}>Publier</button>
        </div>
      </Modal>

      <RequestModal kind={requestModal} userId={profile.id} onClose={() => setRequestModal(null)}
        onSent={() => { setRequestModal(null); setPending(true); toast.show('Demande envoyée à l’administrateur'); }} />
      {toast.node}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function AccessBanner({ hasAccess, daysLeft, expires, pending, onRequest }: {
  hasAccess: boolean; daysLeft: number; expires: string | null; pending: boolean; onRequest: () => void;
}) {
  if (hasAccess) {
    const soon = daysLeft <= 7;
    return (
      <div className={`flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl px-4 py-2.5 text-sm ${soon ? 'bg-mango/15' : 'bg-lilac'}`}>
        <Clock size={16} className="shrink-0 text-plum" />
        <p className="flex-1 font-semibold">Accès actif jusqu’au {formatDate(expires!)}, {daysLeft <= 0 ? 'expire aujourd’hui' : `encore ${daysLeft} jour${daysLeft > 1 ? 's' : ''}`}</p>
        {soon && <button disabled={pending} onClick={onRequest} className="font-bold text-candy hover:underline disabled:text-ink/50">{pending ? 'Prolongation demandée' : 'Prolonger'}</button>}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-candy/30 bg-white p-4 sm:flex-row sm:items-center">
      {expires ? <Lock className="shrink-0 text-candy" size={22} /> : <Clock className="shrink-0 text-candy" size={22} />}
      <div className="flex-1">
        <p className="font-bold">{pending ? 'Demande envoyée' : expires ? `Votre accès a expiré le ${formatDate(expires)}` : 'Votre accès n’est pas encore activé'}</p>
        <p className="text-sm text-ink/65">{pending
          ? 'L’administrateur vérifie votre paiement. Vous recevrez une notification dès l’activation.'
          : expires ? 'Votre lien est désactivé. Demandez une prolongation pour le réactiver.'
          : 'Préparez dès maintenant votre anniversaire et vos cadeaux. L’accès est nécessaire pour publier et partager la liste.'}</p>
      </div>
      <button disabled={pending} onClick={onRequest} className="btn-candy shrink-0 py-2 text-sm">
        {pending ? 'En attente de validation' : expires ? 'Demander une prolongation' : 'Demander l’accès'}
      </button>
    </div>
  );
}

function Row({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-3 p-5 sm:grid-cols-[220px_1fr] sm:gap-6">
      <div><p className="font-bold">{title}</p>{desc && <p className="mt-0.5 text-sm text-ink/60">{desc}</p>}</div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/** Mon compte : photo, nom, identifiants, accès, mot de passe. */
function AccountSection({ profile, event, hasAccess, daysLeft, pending, onProfile, onEvent, onRequest, onToast }: {
  profile: Profile; event: EventRow | null; hasAccess: boolean; daysLeft: number; pending: boolean;
  onProfile: (p: Profile) => void; onEvent: (e: EventRow) => void; onRequest: () => void; onToast: (m: string, ok: boolean) => void;
}) {
  const supabase = createClient();
  const [name, setName] = useState(profile.full_name || '');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState('');

  const saveName = async () => {
    if (!name.trim()) return onToast('Indiquez votre nom.', false);
    setBusy('name');
    const { data, error } = await supabase.from('profiles').update({ full_name: name.trim() }).eq('id', profile.id).select().single();
    setBusy('');
    if (error) return onToast(error.message, false);
    onProfile(data); onToast('Nom enregistré', true);
  };

  const savePhoto = async (url: string | null) => {
    if (!event) return;
    const { data, error } = await supabase.from('events').update({ photo_url: url }).eq('id', event.id).select().single();
    if (error) return onToast(error.message.includes('photo_url') ? 'La base n’est pas à jour : exécutez supabase/5-photo-celebrant.sql.' : error.message, false);
    onEvent(data); onToast(url ? 'Photo enregistrée' : 'Photo retirée', true);
  };
  const uploadPhoto = async (file?: File) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return onToast('Image trop lourde : 5 Mo maximum.', false);
    setBusy('photo');
    const path = `${profile.id}/photo-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
    const { error } = await supabase.storage.from('gifts').upload(path, file);
    if (error) { setBusy(''); return onToast("La photo n'a pas été envoyée : " + error.message, false); }
    await savePhoto(supabase.storage.from('gifts').getPublicUrl(path).data.publicUrl);
    setBusy('');
  };

  const savePassword = async () => {
    if (password.length < 6) return onToast('Mot de passe trop court : 6 caractères minimum.', false);
    setBusy('pwd');
    const { error } = await supabase.auth.updateUser({ password });
    setBusy('');
    if (error) return onToast(error.message, false);
    setPassword(''); onToast('Mot de passe modifié', true);
  };

  return (
    <div className="panel divide-y divide-ink/10">
      <Row title="Photo" desc="Sur la couverture de votre livre d’or et en haut de votre espace.">
        {event ? (
          <div className="flex items-center gap-4">
            <span className="grid h-24 w-20 shrink-0 place-items-center overflow-hidden rounded-t-full rounded-b-lg bg-lilac text-ink/40 ring-2 ring-mango/50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {event.photo_url ? <img src={event.photo_url} alt="Votre photo" className="h-full w-full object-cover" /> : <UserRound size={28} />}
            </span>
            <div className="flex flex-wrap gap-2">
              <label className="btn-ghost cursor-pointer py-2 text-sm"><Upload size={15} />{busy === 'photo' ? 'Envoi…' : event.photo_url ? 'Changer' : 'Ajouter une photo'}
                <input type="file" accept="image/*" className="sr-only" onChange={(e) => uploadPhoto(e.target.files?.[0])} />
              </label>
              {event.photo_url && <button onClick={() => savePhoto(null)} className="py-2 text-sm font-bold text-candy hover:underline">Retirer</button>}
            </div>
          </div>
        ) : <p className="text-sm text-ink/60">Créez d’abord votre anniversaire pour ajouter une photo.</p>}
      </Row>
      <Row title="Nom">
        <div className="flex max-w-md gap-2">
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} aria-label="Nom" />
          {name.trim() !== (profile.full_name || '') && <button onClick={saveName} disabled={busy === 'name'} className="btn-primary shrink-0">Enregistrer</button>}
        </div>
      </Row>
      <Row title="Téléphone" desc="Il sert à vous connecter. Pour le changer, contactez l’administrateur.">
        <p className="pt-1 font-semibold">{profile.phone || '—'}</p>
      </Row>
      <Row title="Email">
        <p className="pt-1 font-semibold">{profile.email || <span className="font-normal text-ink/55">Aucun email, vous vous connectez avec votre téléphone</span>}</p>
      </Row>
      <Row title="Accès" desc="Nécessaire pour publier et partager votre liste.">
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <p className="font-semibold">{hasAccess ? `Actif jusqu’au ${formatDate(profile.access_expires_at!)} (${daysLeft} jour${daysLeft > 1 ? 's' : ''})` : profile.access_expires_at ? `Expiré le ${formatDate(profile.access_expires_at)}` : 'Pas encore activé'}</p>
          <button disabled={pending} onClick={onRequest} className="text-sm font-bold text-candy hover:underline disabled:text-ink/50">
            {pending ? 'Demande en cours' : hasAccess ? 'Prolonger' : profile.access_expires_at ? 'Demander une prolongation' : 'Demander l’accès'}
          </button>
        </div>
      </Row>
      <Row title="Mot de passe">
        <div className="flex max-w-md gap-2">
          <div className="flex-1"><PasswordInput className="input" placeholder="Nouveau mot de passe" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} aria-label="Nouveau mot de passe" /></div>
          {password && <button onClick={savePassword} disabled={busy === 'pwd'} className="btn-primary shrink-0"><KeyRound size={15} />Changer</button>}
        </div>
      </Row>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function EventForm({ userId, event, onSaved, defaultName }: { userId: string; event?: EventRow; onSaved: (e: EventRow) => void; defaultName?: string }) {
  const supabase = createClient();
  const locked = !!event?.published;
  const [f, setF] = useState({
    celebrant_name: event?.celebrant_name || defaultName || '',
    birth_date: event?.birth_date || '',
    title: event?.title || '',
    message: event?.message || '',
    theme_color: event?.theme_color || '',
    dress_code: event?.dress_code || '',
    has_party: event?.has_party || false,
    party_date: event?.party_date || '',
    party_time: event?.party_time || '',
    party_place: event?.party_place || '',
    party_details: event?.party_details || '',
    photo_url: event?.photo_url || '',
  });
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });

  // Photo de la personne fêtée, affichée sur la couverture du livre d'or
  const uploadPhoto = async (file?: File) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return setErr('Image trop lourde : 5 Mo maximum.');
    setUploading(true); setErr('');
    const path = `${userId}/photo-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
    const { error } = await supabase.storage.from('gifts').upload(path, file);
    setUploading(false);
    if (error) return setErr("La photo n'a pas été envoyée : " + error.message);
    setF((x) => ({ ...x, photo_url: supabase.storage.from('gifts').getPublicUrl(path).data.publicUrl }));
  };
  const todayIso = new Date().toISOString().slice(0, 10);
  const nb = f.birth_date ? nextBirthday(f.birth_date) : null;

  // Le dress code suit la couleur tant qu'il est généré automatiquement
  const pickColor = (hex: string) => setF((x) => {
    const auto = !x.dress_code || x.dress_code.startsWith('Tout en ');
    return { ...x, theme_color: hex, dress_code: hex ? (auto ? `Tout en ${colorName(hex)}` : x.dress_code) : (auto ? '' : x.dress_code) };
  });
  const isPreset = THEME_COLORS.some((c) => c.hex.toLowerCase() === f.theme_color.toLowerCase());

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (f.birth_date > todayIso) return setErr('La date de naissance ne peut pas être dans le futur.');
    setSaving(true); setErr('');
    const payload: any = {
      celebrant_name: f.celebrant_name.trim(), birth_date: f.birth_date,
      title: f.title.trim() || null, message: f.message.trim() || null,
      theme_color: f.theme_color || null, dress_code: f.dress_code.trim() || null,
      has_party: f.has_party,
      party_date: f.has_party ? (f.party_date || nb?.date || null) : null, party_time: f.has_party ? f.party_time || null : null,
      party_place: f.has_party ? f.party_place.trim() || null : null, party_details: f.has_party ? f.party_details.trim() || null : null,
    };
    if (f.photo_url || event?.photo_url) payload.photo_url = f.photo_url || null;
    if (locked) { delete payload.celebrant_name; delete payload.birth_date; }
    const { data, error } = event
      ? await supabase.from('events').update(payload).eq('id', event.id).select().single()
      : await supabase.from('events').insert({ ...payload, owner_id: userId }).select().single();
    setSaving(false);
    if (error) return setErr(error.message);
    onSaved(data);
  };

  return (
    <form onSubmit={save} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="label" htmlFor="cn">Prénom de la personne fêtée {locked && <Lock size={12} className="inline" />}</label>
          <input id="cn" required disabled={locked} className="input disabled:bg-paper" value={f.celebrant_name} onChange={set('celebrant_name')} />
        </div>
        <div>
          <label className="label" htmlFor="bd">Date de naissance {locked && <Lock size={12} className="inline" />}</label>
          <input id="bd" type="date" required max={todayIso} disabled={locked} className="input disabled:bg-paper" value={f.birth_date} onChange={set('birth_date')} />
        </div>
      </div>
      {nb && (
        <p className="-mt-2 rounded-2xl bg-lilac/60 px-4 py-3 text-sm">
          Prochain anniversaire : <strong className="first-letter:uppercase">{formatDate(nb.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</strong> · <strong>{nb.age} ans</strong>
        </p>
      )}

      <div><label className="label" htmlFor="tt">Titre de la page (facultatif)</label><input id="tt" className="input" placeholder={nb ? `Les ${nb.age} ans de ${f.celebrant_name || '…'}` : 'Mon anniversaire'} value={f.title} onChange={set('title')} /></div>
      <div><label className="label" htmlFor="ms">Un mot pour vos proches</label><textarea id="ms" rows={2} className="input" placeholder="Merci d’avance, j’ai hâte de vous voir !" value={f.message} onChange={set('message')} /></div>

      <div className="flex items-center gap-4">
        <label className="relative grid h-24 w-20 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-t-full rounded-b-lg border-2 border-dashed border-mango/50 bg-[#FBF6EE] text-mango hover:border-mango">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {f.photo_url ? <img src={f.photo_url} alt="Votre photo" className="h-full w-full object-cover" /> : <Upload size={20} />}
          <input type="file" accept="image/*" className="sr-only" onChange={(e) => uploadPhoto(e.target.files?.[0])} />
        </label>
        <div className="text-sm">
          <p className="font-bold">Votre photo {uploading && <span className="font-normal text-ink/55">· envoi…</span>}</p>
          <p className="text-ink/60">Elle sera sur la couverture de votre livre d’or.</p>
          {f.photo_url && <button type="button" onClick={() => setF({ ...f, photo_url: '' })} className="mt-1 text-xs font-semibold text-candy underline">Retirer la photo</button>}
        </div>
      </div>

      <fieldset>
        <legend className="label">Couleur et dress code (facultatif)</legend>
        <p className="-mt-1 mb-3 text-xs text-ink/55">La couleur habille votre espace et la page que verront vos proches.</p>
        <div className="flex flex-wrap gap-2.5">
          {THEME_COLORS.map((c) => {
            const on = f.theme_color.toLowerCase() === c.hex.toLowerCase();
            return (
              <button type="button" key={c.hex} title={c.name} aria-label={c.name} aria-pressed={on}
                onClick={() => pickColor(on ? '' : c.hex)}
                className={`grid h-10 w-10 place-items-center rounded-full ring-1 ring-ink/10 transition ${on ? 'scale-110 ring-2 ring-ink ring-offset-2' : 'hover:scale-105'}`}
                style={{ background: c.hex }}>
                {on && <Check size={16} color={readableOn(c.hex)} />}
              </button>
            );
          })}
          <label title="Autre couleur"
            className={`relative grid h-10 w-10 cursor-pointer place-items-center overflow-hidden rounded-full transition ${f.theme_color && !isPreset ? 'scale-110 ring-2 ring-ink ring-offset-2' : 'border-2 border-dashed border-ink/30 hover:border-ink'}`}
            style={f.theme_color && !isPreset ? { background: f.theme_color } : undefined}>
            {f.theme_color && !isPreset ? <Check size={16} color={readableOn(f.theme_color)} /> : <Plus size={16} />}
            <input type="color" aria-label="Choisir une autre couleur" className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              value={f.theme_color || '#D6336C'} onChange={(e) => pickColor(e.target.value)} />
          </label>
        </div>
        <input className="input mt-3" placeholder="Ex. : Chic en blanc et or, tenue traditionnelle…" value={f.dress_code} onChange={set('dress_code')} />
      </fieldset>

      <fieldset className="rounded-3xl border border-ink/[0.08] p-5">
        <label className="flex cursor-pointer items-center justify-between gap-4">
          <span>
            <span className="flex items-center gap-2 font-bold"><PartyPopper size={18} className="text-candy" />J’organise une fête</span>
            <span className="text-sm text-ink/55">Vos proches recevront une carte d’invitation avec le lien.</span>
          </span>
          <input type="checkbox" className="peer sr-only" checked={f.has_party} onChange={(e) => setF({ ...f, has_party: e.target.checked })} />
          <span className="relative h-7 w-12 shrink-0 rounded-full bg-ink/15 transition peer-checked:bg-candy after:absolute after:left-1 after:top-1 after:h-5 after:w-5 after:rounded-full after:bg-white after:transition peer-checked:after:translate-x-5" />
        </label>
        {f.has_party && (
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div><label className="label" htmlFor="pd">Date de la fête</label><input id="pd" type="date" className="input" value={f.party_date || nb?.date || ''} onChange={set('party_date')} /></div>
            <div><label className="label" htmlFor="ph">Heure</label><input id="ph" className="input" placeholder="À partir de 19h" value={f.party_time} onChange={set('party_time')} /></div>
            <div className="md:col-span-2"><label className="label" htmlFor="pl">Lieu</label><input id="pl" className="input" placeholder="Maquis Le Baobab, Cocody Angré" value={f.party_place} onChange={set('party_place')} /></div>
            <div className="md:col-span-2"><label className="label" htmlFor="px">Infos pratiques</label><textarea id="px" rows={2} className="input" placeholder="Parking, code d’entrée, confirmez votre venue par WhatsApp…" value={f.party_details} onChange={set('party_details')} /></div>
          </div>
        )}
      </fieldset>

      {err && <p className="text-sm font-semibold text-candy">{err}</p>}
      <button disabled={saving} className="btn-candy w-full py-3.5">{saving ? 'Enregistrement…' : event ? 'Enregistrer' : 'Créer l’anniversaire'}</button>
    </form>
  );
}

/* ------------------------------------------------------------------ */

function GiftForm({ eventId, userId, vendors, gift, onSaved, position }: {
  eventId: string; userId: string; vendors: Vendor[]; gift?: GiftItem; onSaved: () => void; position: number;
}) {
  const supabase = createClient();
  const isPack = packItems(gift?.items).length > 1;
  const [source, setSource] = useState<'boutique' | 'libre' | 'pack'>(gift ? (isPack ? 'pack' : gift.product_id ? 'boutique' : 'libre') : vendors.length ? 'boutique' : 'libre');
  const [vendorId, setVendorId] = useState<string>(gift?.vendor_id || '');
  const [products, setProducts] = useState<Product[]>([]);
  const [productId, setProductId] = useState<string>(gift?.product_id || '');
  const [choice, setChoice] = useState<Record<string, string>>(gift?.options || {});
  const [f, setF] = useState({
    name: gift?.name || '', description: gift?.description || '', price: gift?.price ? String(gift.price) : '',
    external_contact: gift?.external_contact || '', product_link: gift?.product_link || '', image_url: gift?.image_url || '',
  });
  const [multiple, setMultiple] = useState(!!gift?.multiple);
  // Pack : 2 ou 3 articles (prix saisis en texte, convertis à l'enregistrement)
  const [pack, setPack] = useState<{ name: string; price: string; image_url: string }[]>(
    isPack ? packItems(gift!.items).map((i) => ({ name: i.name, price: i.price ? String(i.price) : '', image_url: i.image_url || '' }))
      : [{ name: '', price: '', image_url: '' }, { name: '', price: '', image_url: '' }]);
  const joined = pack.map((i) => i.name.trim()).filter(Boolean).join(' + ');
  const [packName, setPackName] = useState(isPack && gift!.name !== joined ? gift!.name : '');
  const packTotal = pack.reduce((a, i) => a + (Number(i.price) || 0), 0);
  const setPackItem = (i: number, patch: Partial<{ name: string; price: string; image_url: string }>) => setPack((all) => all.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });

  useEffect(() => {
    if (!vendorId) return setProducts([]);
    supabase.from('products').select('id,vendor_id,name,description,price,image_url,stock,options').eq('vendor_id', vendorId).eq('active', true).order('name')
      .then(({ data }) => setProducts(data || []));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendorId]);

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

  const uploadPack = async (i: number, file?: File) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return setErr('Image trop lourde : 5 Mo maximum.');
    setUploading(true); setErr('');
    const path = `${userId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
    const { error } = await supabase.storage.from('gifts').upload(path, file);
    setUploading(false);
    if (error) return setErr("L'image n'a pas été envoyée : " + error.message);
    setPackItem(i, { image_url: supabase.storage.from('gifts').getPublicUrl(path).data.publicUrl });
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    let payload: any;
    if (source === 'pack') {
      const items = pack.filter((i) => i.name.trim()).map((i) => ({ name: i.name.trim(), price: i.price ? Number(i.price) : null, image_url: i.image_url || null }));
      if (items.length < 2) return setErr('Un pack contient au moins 2 articles : donnez un nom à chacun.');
      payload = { name: packName.trim() || items.map((i) => i.name).join(' + '), price: packTotal || null,
        image_url: items.find((i) => i.image_url)?.image_url || null, items, description: f.description.trim() || null,
        vendor_id: null, product_id: null, options: {}, external_contact: f.external_contact.trim() || null, product_link: null };
    } else if (source === 'boutique') {
      const p = products.find((x) => x.id === productId);
      if (!p) return setErr('Choisissez un article.');
      payload = { name: p.name, price: p.price ?? null, image_url: p.image_url ?? null, vendor_id: p.vendor_id, product_id: p.id, options: choice,
        description: f.description.trim() || p.description || null, external_contact: null, product_link: null };
    } else {
      if (!f.name.trim()) return setErr('Donnez un nom au cadeau.');
      payload = { name: f.name.trim(), description: f.description.trim() || null, price: f.price ? Number(f.price) : null,
        vendor_id: null, product_id: null, options: {}, external_contact: f.external_contact.trim() || null,
        product_link: f.product_link.trim() || null, image_url: f.image_url || null };
    }
    payload.multiple = multiple;
    if (source !== 'pack' && gift?.items?.length) payload.items = [];
    setSaving(true);
    const { error } = gift
      ? await supabase.from('gifts').update(payload).eq('id', gift.id)
      : await supabase.from('gifts').insert({ ...payload, event_id: eventId, position });
    setSaving(false);
    if (error) return setErr(error.message);
    onSaved();
  };

  return (
    <form onSubmit={save} className="space-y-5">
      <div className="grid grid-cols-3 gap-1.5 rounded-2xl bg-lilac/60 p-1.5">
        {[{ k: 'boutique', l: 'En boutique', i: Store }, { k: 'libre', l: 'Autre cadeau', i: GiftIcon }, { k: 'pack', l: 'Pack', i: Layers }].map((t) => (
          <button key={t.k} type="button" onClick={() => setSource(t.k as any)}
            className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition ${source === t.k ? 'bg-white shadow-popsm' : 'text-ink/80 hover:bg-white/60'}`}>
            <t.i size={16} />{t.l}
          </button>
        ))}
      </div>

      {source === 'boutique' ? (
        <>
          {vendors.length === 0 ? (
            <p className="rounded-2xl bg-lilac/50 p-4 text-sm">Aucune boutique n’est encore inscrite. Ajoutez un « Autre cadeau ».</p>
          ) : (
            <div>
              <label className="label" htmlFor="gv">Boutique</label>
              <select id="gv" className="input" value={vendorId} onChange={(e) => { setVendorId(e.target.value); setProductId(''); }}>
                <option value="">Choisir une boutique…</option>
                {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}{v.category ? ` · ${v.category}` : ''}</option>)}
              </select>
            </div>
          )}
          {vendorId && (
            products.length === 0 ? <p className="text-sm text-ink/55">Cette boutique n’a pas encore d’article.</p> : (
              <div className="grid max-h-[340px] gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
                {products.map((p) => (
                  <button type="button" key={p.id} onClick={() => { setProductId(p.id); setChoice({}); }}
                    className={`flex items-center gap-3 rounded-2xl border p-2.5 text-left transition ${productId === p.id ? 'border-candy bg-candy/5 ring-2 ring-candy/20' : 'border-ink/10 hover:border-ink/25'}`}>
                    <span className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-lilac">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {p.image_url ? <img src={p.image_url} alt="" className="h-full w-full object-cover" /> : <GiftIcon className="m-4 text-candy/50" size={22} />}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold">{p.name}</span>
                      <span className="text-sm text-ink/60">{formatPrice(p.price)}</span>
                      {p.stock != null && <span className={`block text-xs font-bold ${p.stock > 0 ? 'text-mint' : 'text-candy'}`}>{p.stock > 0 ? `${p.stock} en stock` : 'Rupture de stock'}</span>}
                    </span>
                  </button>
                ))}
              </div>
            )
          )}
          {(products.find((x) => x.id === productId)?.options || []).filter((o) => o.values?.length).map((o) => (
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
          <div><label className="label" htmlFor="gd2">Précisions (facultatif)</label><input id="gd2" className="input" value={f.description} onChange={set('description')} /></div>
        </>
      ) : source === 'pack' ? (
        <>
          <p className="text-sm text-ink/65">Réunissez 2 ou 3 articles en un seul cadeau. Vos proches réservent le pack entier.</p>
          {pack.filter((i) => i.name.trim()).length > 1 && (
            <div className="relative aspect-[16/9] overflow-hidden rounded-2xl">
              <GiftVisual name={packName || joined} items={pack.map((i) => ({ ...i, price: Number(i.price) || null }))} />
            </div>
          )}
          <div className="space-y-2.5">
            {pack.map((it, i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl border border-ink/15 bg-white p-2.5">
                <label className="relative grid h-16 w-16 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-lg bg-lilac text-ink/45 hover:text-ink" title="Photo de l’article">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {it.image_url ? <img src={it.image_url} alt="" className="h-full w-full object-cover" /> : <ImagePlus size={20} />}
                  <input type="file" accept="image/*" className="sr-only" onChange={(e) => uploadPack(i, e.target.files?.[0])} />
                </label>
                <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-[1fr_130px]">
                  <input className="input py-2" placeholder={`Article ${i + 1}, ex. ${['Parfum', 'Montre', 'Bouquet de fleurs'][i]}`} value={it.name} onChange={(e) => setPackItem(i, { name: e.target.value })} aria-label={`Nom de l’article ${i + 1}`} />
                  <input className="input py-2" type="number" min="0" placeholder="Prix (FCFA)" value={it.price} onChange={(e) => setPackItem(i, { price: e.target.value })} aria-label={`Prix de l’article ${i + 1}`} />
                </div>
                {pack.length > 2 && (
                  <button type="button" onClick={() => setPack(pack.filter((_, j) => j !== i))} aria-label="Retirer cet article" className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-ink/50 hover:bg-candy/10 hover:text-candy"><X size={16} /></button>
                )}
              </div>
            ))}
            {pack.length < 3 && (
              <button type="button" onClick={() => setPack([...pack, { name: '', price: '', image_url: '' }])} className="btn-ghost w-full border-dashed"><Plus size={16} />Ajouter un 3e article</button>
            )}
          </div>
          <p className="flex items-baseline justify-between border-t border-ink/10 pt-3 text-sm"><span className="text-ink/65">Total du pack</span><strong className="text-base">{formatPrice(packTotal)}</strong></p>
          <div><label className="label" htmlFor="pkn">Nom du pack (facultatif)</label><input id="pkn" className="input" placeholder={joined || 'Parfum + Montre'} value={packName} onChange={(e) => setPackName(e.target.value)} /></div>
          <div><label className="label" htmlFor="pkc">Où l’acheter (contact du vendeur)</label><input id="pkc" className="input" placeholder="Nom, téléphone, adresse" value={f.external_contact} onChange={set('external_contact')} /></div>
          <div><label className="label" htmlFor="pkd">Détails (facultatif)</label><textarea id="pkd" rows={2} className="input" placeholder="Tailles, couleurs, à livrer ensemble…" value={f.description} onChange={set('description')} /></div>
        </>
      ) : (
        <>
          <label className="relative flex aspect-[16/9] cursor-pointer items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-ink/15 bg-paper hover:border-candy/40">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {f.image_url ? <img src={f.image_url} alt="" className="h-full w-full object-cover" /> : (
              <span className="flex flex-col items-center gap-2 text-sm font-semibold text-ink/55"><Upload size={26} />{uploading ? 'Envoi…' : 'Ajouter une photo'}</span>
            )}
            <input type="file" accept="image/*" className="sr-only" onChange={(e) => upload(e.target.files?.[0])} />
          </label>
          <div className="grid gap-4 md:grid-cols-[2fr_1fr]">
            <div><label className="label" htmlFor="gn">Nom du cadeau</label><input id="gn" className="input" value={f.name} onChange={set('name')} /></div>
            <div><label className="label" htmlFor="gp">Prix (FCFA)</label><input id="gp" type="number" min="0" className="input" value={f.price} onChange={set('price')} /></div>
          </div>
          <div><label className="label" htmlFor="gd">Détails</label><textarea id="gd" rows={2} className="input" value={f.description} onChange={set('description')} /></div>
          <div><label className="label" htmlFor="gc">Où l’acheter (contact du vendeur)</label><input id="gc" className="input" placeholder="Nom, téléphone, adresse" value={f.external_contact} onChange={set('external_contact')} /></div>
          <div><label className="label" htmlFor="gl">Lien du produit (facultatif)</label><input id="gl" type="url" className="input" placeholder="https://…" value={f.product_link} onChange={set('product_link')} /></div>
        </>
      )}

      <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-ink/[0.08] px-4 py-3">
        <span>
          <span className="block text-sm font-bold">Plusieurs personnes peuvent l’offrir</span>
          <span className="block text-xs text-ink/55">Cadeau commun : vos proches se cotisent (ex. une enveloppe Wave, un gros cadeau). Sinon, une seule personne le réserve.</span>
        </span>
        <input type="checkbox" className="peer sr-only" checked={multiple} onChange={(e) => setMultiple(e.target.checked)} />
        <span className="relative h-6 w-11 shrink-0 rounded-full bg-ink/15 transition peer-checked:bg-candy after:absolute after:left-1 after:top-1 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition peer-checked:after:translate-x-5" />
      </label>

      {err && <p className="text-sm font-semibold text-candy">{err}</p>}
      <button disabled={saving || uploading} className="btn-candy w-full py-3.5">{saving ? 'Enregistrement…' : gift ? 'Enregistrer' : 'Ajouter à ma liste'}</button>
    </form>
  );
}

/* ------------------------------------------------------------------ */

const OPERATOR_COLORS: Record<string, string> = { Wave: '#1DC8F1', 'Orange Money': '#FF7900', 'MTN MoMo': '#FFCB05', 'Moov Money': '#0066B3' };
const StepDot = ({ n }: { n: number }) => <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-ink text-xs font-bold text-white">{n}</span>;

function RequestModal({ kind, userId, onClose, onSent }: { kind: null | 'acces' | 'prolongation'; userId: string; onClose: () => void; onSent: () => void }) {
  const supabase = createClient();
  const today = new Date().toISOString().slice(0, 10);
  const [mode, setMode] = useState<'duree' | 'dates'>('duree');
  const [days, setDays] = useState(30);
  const [start, setStart] = useState(today);
  const [end, setEnd] = useState('');
  const [cfg, setCfg] = useState<any>(null);
  const [method, setMethod] = useState('');
  const [ref, setRef] = useState('');
  const [proof, setProof] = useState('');
  const [message, setMessage] = useState('');
  const [err, setErr] = useState('');
  const [sending, setSending] = useState(false);
  useEffect(() => { if (kind) supabase.from('settings').select('*').eq('id', 1).maybeSingle().then(({ data }) => setCfg(data)); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [kind]);

  const span = mode === 'duree' ? days : end && start ? Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86400000) + 1 : 0;
  const endDate = mode === 'duree' ? new Date(Date.now() + (days - 1) * 86400000).toISOString().slice(0, 10) : end;
  const price = cfg ? Math.max(Number(cfg.access_min_price) || 0, span * (Number(cfg.access_price_per_day) || 0)) : 0;
  const methods = cfg ? [['Wave', cfg.wave_number], ['Orange Money', cfg.orange_number], ['MTN MoMo', cfg.mtn_number], ['Moov Money', cfg.moov_number]].filter(([, n]) => n) as [string, string][] : [];

  const upload = async (file?: File) => {
    if (!file) return;
    const path = `${userId}/paiement-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
    const { error } = await supabase.storage.from('gifts').upload(path, file);
    if (error) return setErr("La capture n'a pas été envoyée : " + error.message);
    setProof(supabase.storage.from('gifts').getPublicUrl(path).data.publicUrl);
  };

  const send = async () => {
    setErr('');
    if (span < 1) return setErr('Choisissez une période valide.');
    if (!method || !ref.trim()) return setErr('Indiquez le moyen de paiement et la référence de la transaction.');
    setSending(true);
    const { error } = await supabase.from('access_requests').insert({
      user_id: userId, kind, days_requested: Math.min(span, 365), start_date: mode === 'dates' ? start : today, end_date: endDate,
      amount: price, payment_method: method, payment_ref: ref.trim(), proof_url: proof || null, message: message.trim() || null,
    });
    setSending(false);
    if (error) return setErr(error.message);
    setRef(''); setMessage(''); setProof(''); onSent();
  };

  return (
    <Modal open={!!kind} onClose={onClose} title={kind === 'prolongation' ? 'Prolonger mon accès' : 'Activer mon accès'} wide>
      <ol className="space-y-7">
        <li>
          <p className="flex items-center gap-2 font-bold"><StepDot n={1} />Pour combien de temps ?</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {[7, 15, 30, 60, 90].map((d) => (
              <button key={d} type="button" onClick={() => { setMode('duree'); setDays(d); }}
                className={`rounded-full border px-4 py-2 text-sm font-bold ${mode === 'duree' && days === d ? 'border-ink bg-ink text-white' : 'border-ink/15 hover:border-ink/40'}`}>{d} jours</button>
            ))}
            <button type="button" onClick={() => setMode('dates')} className={`rounded-full border px-4 py-2 text-sm font-bold ${mode === 'dates' ? 'border-ink bg-ink text-white' : 'border-ink/15 hover:border-ink/40'}`}>Choisir les dates</button>
          </div>
          {mode === 'dates' && (
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div><label className="label" htmlFor="rs">Du</label><input id="rs" type="date" min={today} className="input" value={start} onChange={(e) => setStart(e.target.value)} /></div>
              <div><label className="label" htmlFor="re">Au</label><input id="re" type="date" min={start || today} className="input" value={end} onChange={(e) => setEnd(e.target.value)} /></div>
            </div>
          )}
          <p className="mt-4 flex items-baseline justify-between border-t border-ink/10 pt-3">
            <span className="text-sm text-ink/65">{span > 0 ? `${span} jour${span > 1 ? 's' : ''}${endDate ? `, jusqu’au ${formatDate(endDate)}` : ''}` : 'Choisissez une période'}</span>
            <span className="font-display text-3xl">{formatPrice(price)}</span>
          </p>
        </li>

        <li>
          <p className="flex items-center gap-2 font-bold"><StepDot n={2} />Envoyez le montant à l’un de ces numéros</p>
          {methods.length === 0 ? (
            <p className="mt-3 rounded-xl bg-lilac p-3 text-sm">Les numéros de paiement ne sont pas encore configurés. Contactez l’administrateur.</p>
          ) : (
            <div className="mt-3 divide-y divide-ink/10 rounded-xl border border-ink/15">
              {methods.map(([m, n]) => (
                <label key={m} className={`flex cursor-pointer items-center gap-3 p-3 ${method === m ? 'bg-lilac' : 'hover:bg-paper'}`}>
                  <input type="radio" name="op" className="sr-only" checked={method === m} onChange={() => setMethod(m)} />
                  <span className="h-8 w-8 shrink-0 rounded-full ring-1 ring-ink/10" style={{ background: OPERATOR_COLORS[m] }} aria-hidden />
                  <span className="flex-1"><span className="block text-sm font-bold">{m}</span><span className="text-sm tabular-nums text-ink/70">{n}</span></span>
                  <button type="button" onClick={(e) => { e.preventDefault(); navigator.clipboard.writeText(n); setMethod(m); }} className="rounded-lg px-2.5 py-1.5 text-xs font-bold text-plum hover:bg-white"><Copy size={13} className="mr-1 inline" />Copier</button>
                  <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 ${method === m ? 'border-candy bg-candy text-white' : 'border-ink/25'}`}>{method === m && <Check size={12} />}</span>
                </label>
              ))}
            </div>
          )}
          {cfg?.payment_instructions && <p className="mt-2 text-sm leading-relaxed text-ink/65">{cfg.payment_instructions}</p>}
        </li>

        <li>
          <p className="flex items-center gap-2 font-bold"><StepDot n={3} />Indiquez la référence de la transaction</p>
          <p className="mt-1 text-sm text-ink/60">Elle figure dans le SMS de confirmation de votre opérateur.</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]">
            <input className="input" placeholder="Ex. ID de transaction Wave" value={ref} onChange={(e) => setRef(e.target.value)} aria-label="Référence de la transaction" />
            <label className="btn-ghost cursor-pointer justify-center">
              {proof ? <><Check size={15} className="text-mint" />Capture ajoutée</> : <><Upload size={15} />Ajouter une capture</>}
              <input type="file" accept="image/*" className="sr-only" onChange={(e) => upload(e.target.files?.[0])} />
            </label>
          </div>
          <textarea rows={2} className="input mt-3" placeholder="Un mot pour l’administrateur (facultatif)" value={message} onChange={(e) => setMessage(e.target.value)} />
        </li>
      </ol>
      {err && <p className="mt-4 text-sm font-semibold text-candy">{err}</p>}
      <button disabled={sending} onClick={send} className="btn-candy mt-6 w-full py-3.5">{sending ? 'Envoi…' : 'J’ai payé, envoyer la demande'}</button>
      <p className="mt-2 text-center text-xs text-ink/55">L’accès est activé dès que l’administrateur a vérifié votre paiement.</p>
    </Modal>
  );
}

function ShareLink({ label, url, text, onCopy }: { label: string; url: string; text: string; onCopy: () => void }) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-bold text-ink/55">{label}</p>
      <div className="flex items-center gap-2 rounded-2xl border border-ink/10 bg-paper p-1.5 pl-3">
        <span className="min-w-0 flex-1 truncate text-sm">{url}</span>
        <button onClick={() => { navigator.clipboard.writeText(url); onCopy(); }} className="btn-primary shrink-0 px-3 py-1.5 text-sm" aria-label="Copier"><Copy size={14} /></button>
        <a target="_blank" rel="noreferrer" className="btn shrink-0 bg-[#25D366] px-3 py-1.5 text-sm text-white" aria-label="Partager sur WhatsApp"
          href={`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`}><MessageCircle size={14} /></a>
        <a target="_blank" rel="noreferrer" href={url} className="btn-ghost shrink-0 px-3 py-1.5 text-sm" aria-label="Aperçu"><Eye size={14} /></a>
      </div>
    </div>
  );
}

const REPLY_IDEAS = [
  'Une seule personne par invitation, merci de ta compréhension.',
  'Avec plaisir, vous êtes les bienvenus !',
  'Peux-tu me donner les prénoms de tes accompagnants ?',
];

/** Une réponse d'invité ; la personne fêtée peut lui répondre (surtout s'il vient accompagné). */
function RsvpRow({ r, onReload, onToast }: { r: any; onReload: () => void; onToast: (m: string, ok: boolean) => void }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(r.host_reply || '');
  const [busy, setBusy] = useState(false);
  const many = r.attending !== 'non' && r.guests > 1;
  const send = async () => {
    setBusy(true);
    const { error } = await createClient().rpc('reply_rsvp', { p_rsvp: r.id, p_reply: text });
    setBusy(false);
    if (error) return onToast(error.message.includes('reply_rsvp') ? 'La base n’est pas à jour : exécutez supabase/7-invitation-programme.sql.' : error.message, false);
    onToast('Réponse enregistrée : elle s’affiche sur la page de l’invité', true); setOpen(false); onReload();
  };
  return (
    <li className="px-4 py-3 text-sm">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <span className="font-bold">{r.name}</span>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${r.attending === 'oui' ? 'bg-mint/15 text-mint' : r.attending === 'non' ? 'bg-ink/5 text-ink/60' : 'bg-mango/20 text-[#8a5a0f]'}`}>
          {r.attending === 'oui' ? `Oui, ${r.guests} pers.` : r.attending === 'non' ? 'Non' : `Peut-être, ${r.guests} pers.`}
        </span>
        {r.phone && <a href={`https://wa.me/${r.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="text-ink/60 underline">{r.phone}</a>}
        {r.attending !== 'non' && !open && (
          <button onClick={() => setOpen(true)} className={`ml-auto text-sm font-bold hover:underline ${many && !r.host_reply ? 'text-candy' : 'text-plum'}`}>
            {r.host_reply ? 'Modifier ma réponse' : many ? `Vient à ${r.guests} : répondre` : 'Répondre'}
          </button>
        )}
      </div>
      {r.message && <p className="mt-1 text-ink/65">« {r.message} »</p>}
      {r.host_reply && !open && <p className="mt-2 rounded-lg bg-lilac px-3 py-2 text-ink/80"><span className="font-bold">Votre réponse : </span>{r.host_reply}</p>}
      {open && (
        <div className="mt-3 space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {REPLY_IDEAS.map((t) => <button key={t} type="button" onClick={() => setText(t)} className="rounded-full border border-ink/15 px-3 py-1 text-xs font-semibold hover:border-ink/40">{t}</button>)}
          </div>
          <textarea rows={2} className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder={`Votre réponse à ${r.name}`} aria-label={`Votre réponse à ${r.name}`} />
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={send} disabled={busy || !text.trim()} className="btn-primary py-2 text-sm">{busy ? 'Envoi…' : 'Enregistrer la réponse'}</button>
            {r.phone && text.trim() && (
              <a href={`https://wa.me/${r.phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer" className="btn bg-[#25D366] py-2 text-sm text-white"><MessageCircle size={15} />Envoyer aussi sur WhatsApp</a>
            )}
            <button onClick={() => setOpen(false)} className="px-2 py-2 text-sm font-semibold text-ink/60">Annuler</button>
          </div>
        </div>
      )}
    </li>
  );
}

function RsvpPanel({ rsvps, onReload, onToast }: { rsvps: any[]; onReload: () => void; onToast: (m: string, ok: boolean) => void }) {
  const yes = rsvps.filter((r) => r.attending === 'oui');
  const maybe = rsvps.filter((r) => r.attending === 'peut-etre');
  const no = rsvps.filter((r) => r.attending === 'non');
  const people = yes.reduce((a, r) => a + (r.guests || 1), 0);
  return (
    <section>
      <p className="text-lg"><strong className="font-display text-4xl">{people}</strong> personne{people > 1 ? 's' : ''} attendue{people > 1 ? 's' : ''}</p>
      <p className="mt-1 text-sm text-ink/65">{yes.length} oui, {maybe.length} peut-être, {no.length} non</p>
      {rsvps.length === 0 ? (
        <p className="panel mt-6 p-8 text-center text-ink/60">Personne n’a encore répondu. Partagez le lien des invités depuis « Mon anniversaire ».</p>
      ) : (
        <ul className="panel mt-6 divide-y divide-ink/10">
          {rsvps.map((r) => <RsvpRow key={r.id} r={r} onReload={onReload} onToast={onToast} />)}
        </ul>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */

function Reveal({ gifts }: { gifts: GiftItem[] }) {
  const [flipped, setFlipped] = useState<Record<string, boolean>>({});
  const flip = (id: string) => {
    if (!flipped[id]) burst();
    setFlipped((f) => ({ ...f, [id]: !f[id] }));
  };
  return (
    <section className="mt-12">
      <h2 className="text-3xl">Qui vous a offert quoi</h2>
      <p className="mt-1 text-ink/65">Touchez un cadeau pour l’ouvrir.</p>
      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {gifts.map((g) => (
          <button key={g.id} onClick={() => flip(g.id)} className="relative h-56 [perspective:1000px]" aria-label={`Révéler ${g.name}`}>
            <motion.div
              className="relative h-full w-full [transform-style:preserve-3d]"
              animate={{ rotateY: flipped[g.id] ? 180 : 0 }} transition={{ duration: 0.7, type: 'spring', stiffness: 90 }}
            >
              <div className="wrap-paper absolute inset-0 rounded-3xl border border-ink/10 shadow-popsm [backface-visibility:hidden]">
                <span className="ribbon-v" /><span className="ribbon-h" />
                <span className="absolute bottom-3 left-3 right-3 rounded-full border border-ink/10 bg-white px-3 py-1 text-sm font-bold">{g.name}</span>
              </div>
              <div className="absolute inset-0 flex flex-col justify-center rounded-3xl border border-ink/10 bg-white p-5 text-left shadow-popsm [backface-visibility:hidden] [transform:rotateY(180deg)]">
                <p className="text-xs font-semibold text-ink/55">{g.name}</p>
                <p className="mt-1 font-display text-2xl">{g.friend_name}</p>
                {g.friend_message && <p className="mt-3 text-sm italic leading-relaxed text-ink/75">« {g.friend_message} »</p>}
              </div>
            </motion.div>
          </button>
        ))}
      </div>
    </section>
  );
}
