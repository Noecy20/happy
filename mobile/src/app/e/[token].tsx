/**
 * Page de l'anniversaire pour les amis (SANS compte). Ouverte par le lien partagé
 * https://<site>/e/<token> (lien invités ou lien liste seule).
 *
 * Données : RPC publique get_public_event(token). La base décide de tout :
 * - `invited` vaut vrai seulement avec le lien invités (et s'il y a une fête) ;
 *   avec le lien liste seule, les infos de la fête ne sont JAMAIS renvoyées.
 * - Chaque cadeau indique seulement `claimed` (vrai/faux), jamais qui l'a réservé.
 *
 * Contenu : en-tête sombre aux couleurs du thème, gâteau animé, compte à rebours,
 * enveloppe d'invitation + réponse de présence (RPC rsvp), liste des cadeaux,
 * réservation (RPC claim_gift → code de suivi), suivi de commande dans une feuille.
 */
import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { CalendarHeart, Copy, Gift, Lock, Package, PartyPopper, Ribbon } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Cake from '@/components/Cake';
import Countdown from '@/components/Countdown';
import DateField from '@/components/DateField';
import { Logo } from '@/components/Illustrations';
import Invitation from '@/components/Invitation';
import OrderTracking from '@/components/OrderTracking';
import PushButton from '@/components/PushButton';
import { Button, ErrorText, Field, Loading, Pills, Sheet, Title, Toggle, Txt, cn } from '@/components/ui';
import WrappedCard from '@/components/WrappedCard';
import { readMyGifts, readRsvp, saveMyGift, saveRsvp } from '@/lib/memory';
import { supabase } from '@/lib/supabase';
import { colors, shadow } from '@/lib/theme';
import type { GiftItem, PublicEvent } from '@/lib/types';
import { formatDate, formatPrice, readableOn, todayIso, withAlpha } from '@/lib/utils';
import { useFx } from '@/providers/FxProvider';

export default function PublicEventScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const fx = useFx();
  const [data, setData] = useState<PublicEvent | null>(null);
  const [mine, setMine] = useState<Record<string, string>>({});   // cadeaux réservés depuis ce téléphone
  const [selected, setSelected] = useState<GiftItem | null>(null); // cadeau en cours de réservation
  const [success, setSuccess] = useState<{ code: string; gift: GiftItem } | null>(null);
  const [tracking, setTracking] = useState<string | null>(null);   // code affiché dans la feuille de suivi
  const scroll = useRef<ScrollView>(null);
  const anchors = useRef<{ invitation: number; cadeaux: number }>({ invitation: 0, cadeaux: 0 });

  const load = useCallback(async () => {
    const { data: d } = await supabase.rpc('get_public_event', { p_token: token });
    setData((d as PublicEvent) || { status: 'not_found' });
  }, [token]);

  useEffect(() => {
    load();
    readMyGifts().then(setMine);
    const t = setInterval(load, 15000); // les cadeaux emballés par les autres apparaissent sans recharger
    return () => clearInterval(t);
  }, [load]);

  if (!data) return <Loading />;

  if (data.status !== 'ok')
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.paper }}>
        <View className="flex-1 items-center justify-center px-6">
          <View className="w-full items-center rounded-[28px] bg-white p-8" style={shadow.pop}>
            <Lock size={40} color={colors.ink} />
            <Title className="mt-4 text-center">{data.status === 'expired' ? 'Ce lien a expiré' : 'Liste introuvable'}</Title>
            <Txt className="mt-3 text-center leading-[22px] text-ink/70">
              {data.status === 'expired'
                ? `La liste de ${data.celebrant_name} n'est plus accessible. Si vous avez réservé un cadeau, votre suivi reste disponible.`
                : 'Vérifiez le lien reçu ou demandez-le à nouveau à la personne fêtée.'}
            </Txt>
            <Button title="Suivre ma commande" className="mt-6 w-full" onPress={() => router.push('/suivi')} />
          </View>
        </View>
      </SafeAreaView>
    );

  const ev = data.event!;
  const accent = ev.theme_color || colors.candy;
  const accentInk = readableOn(accent);
  const gifts = data.gifts || [];
  const taken = gifts.filter((g) => g.claimed).length;
  const myCodes = Object.values(mine);

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <StatusBar style="light" />
      <ScrollView ref={scroll} keyboardShouldPersistTaps="handled">
        {/* ---------- En-tête sombre aux couleurs du thème ---------- */}
        <View className="overflow-hidden bg-ink">
          <View pointerEvents="none" style={{ position: 'absolute', right: -140, top: -140, width: 420, height: 420, borderRadius: 210, backgroundColor: withAlpha(accent, 0.35) }} />
          <View pointerEvents="none" style={{ position: 'absolute', left: -120, bottom: -140, width: 320, height: 320, borderRadius: 160, backgroundColor: 'rgba(200,162,106,0.15)' }} />
          <SafeAreaView edges={['top']}>
            <View className="flex-row items-center justify-between px-5 py-3">
              <Logo light />
              {myCodes.length > 0 && <Button small variant="glass" icon={Package} title="Ma commande" onPress={() => setTracking(myCodes[0])} />}
            </View>
            <View className="px-5 pb-10 pt-4">
              <View className="flex-row items-center">
                <CalendarHeart size={16} color="rgba(255,255,255,0.7)" />
                <Text className="ml-2 font-semi text-[13px] text-white/70">{formatDate(ev.birthday_date, { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
              </View>
              <Text className="mt-3 font-display text-[46px] leading-[46px] text-white">{ev.title || `Les ${ev.age} ans de ${ev.celebrant_name}`}</Text>
              {!!ev.message && <Text className="mt-4 font-body text-[16px] leading-[24px] text-white/75">{ev.message}</Text>}

              <View className="mt-6 items-center">
                <Cake age={ev.age} color={accent} width={300} />
                <Text className="mb-3 mt-1 font-display text-[30px] text-white">{ev.age} ans</Text>
                <Countdown date={ev.birthday_date} onDark />
              </View>

              <View className="mt-7 gap-3">
                {data.invited && <Button variant="light" icon={PartyPopper} title="Voir l’invitation" onPress={() => scroll.current?.scrollTo({ y: anchors.current.invitation, animated: true })} />}
                <Button variant="glass" icon={Gift} title="Choisir un cadeau" onPress={() => scroll.current?.scrollTo({ y: anchors.current.cadeaux, animated: true })} />
                <PushButton scope={{ eventToken: token }} label="Me rappeler l’anniversaire" variant="glass" small={false} />
              </View>

              {!!ev.dress_code && (
                <View className="mt-6 flex-row items-center self-start rounded-full border border-white/15 bg-white/10 py-2 pl-2 pr-5">
                  <View className="h-7 w-7 rounded-full border-2 border-white/40" style={{ backgroundColor: accent }} />
                  <Text className="ml-3 font-semi text-[13px] text-white"><Text className="text-white/60">Dress code · </Text>{ev.dress_code}</Text>
                </View>
              )}
            </View>
          </SafeAreaView>
        </View>

        {/* ---------- Invitation (lien invités uniquement) ---------- */}
        {data.invited && (
          <View className="bg-lilac/50 px-5 py-12" onLayout={(e) => (anchors.current.invitation = e.nativeEvent.layout.y)}>
            <Title className="mb-6 text-center text-[32px]">Vous êtes invité(e) à la fête</Title>
            <Invitation name={ev.celebrant_name} age={ev.age} color={accent} date={ev.party_date || ev.birthday_date}
              time={ev.party_time} place={ev.party_place} details={ev.party_details} dressCode={ev.dress_code} />
            <RsvpForm token={token} accent={accent} />
          </View>
        )}

        {/* ---------- Liste des cadeaux ---------- */}
        <View className="px-5 py-10" onLayout={(e) => (anchors.current.cadeaux = e.nativeEvent.layout.y)}>
          <Title className="text-[32px]">Choisissez un cadeau</Title>
          <Txt className="mb-6 mt-1 leading-[21px] text-ink/65">
            {data.closed ? 'La fête est passée, la liste est close.'
              : `${taken} sur ${gifts.length} déjà emballés. ${ev.celebrant_name} ne saura pas qui a pris quoi avant la fin de son anniversaire.`}
          </Txt>
          {gifts.map((g) => (
            <WrappedCard key={g.id} gift={g} accent={accent} mine={!!mine[g.id]} closed={data.closed} onClaim={setSelected}
              footer={mine[g.id] ? <Button small variant="ghost" icon={Package} title="Suivre ma commande" onPress={() => setTracking(mine[g.id])} /> : null} />
          ))}
        </View>
      </ScrollView>

      {/* Réservation */}
      <Sheet open={!!selected} onClose={() => setSelected(null)} title="Je m’en charge">
        {selected && (
          <ClaimForm token={token} gift={selected} celebrant={ev.celebrant_name} accent={accent}
            onError={(m) => { fx.toast(m, 'err'); load(); }}
            onDone={async (code) => {
              setMine(await saveMyGift(selected.id, code));
              setSuccess({ code, gift: selected }); setSelected(null); load();
              fx.confetti([accent, colors.mango, '#ffffff']);
            }} />
        )}
      </Sheet>

      {/* Confirmation avec code de suivi */}
      <Sheet open={!!success} onClose={() => setSuccess(null)}>
        {success && (
          <View className="items-center">
            <PartyPopper size={44} color={accentInk === '#fff' ? accent : colors.ink} />
            <Title className="mt-3 text-center">C’est emballé !</Title>
            <Txt className="mt-2 text-center leading-[22px] text-ink/70">
              {success.gift.vendor ? `${success.gift.vendor.name} a reçu votre commande et vous contactera pour le paiement.` : 'Contactez le vendeur indiqué pour finaliser l’achat.'}
              {' '}{ev.celebrant_name} ne saura pas que c’est vous.
            </Txt>
            <View className="mt-6 w-full items-center rounded-2xl border border-ink/10 bg-white p-4">
              <Txt className="font-semi text-ink/60">Votre code de suivi</Txt>
              <Text className="mt-1 font-black2 text-[30px] tracking-[6px] text-ink">{success.code}</Text>
              <Button small variant="ghost" icon={Copy} title="Copier" className="mt-2" onPress={async () => { await Clipboard.setStringAsync(success.code); fx.toast('Code copié'); }} />
            </View>
            {!success.gift.vendor && !!success.gift.external_contact && (
              <Text className="mt-4 w-full rounded-2xl bg-lilac p-3 font-body text-[14px] text-ink"><Text className="font-bold2">Vendeur : </Text>{success.gift.external_contact}</Text>
            )}
            <Button title="Suivre ma commande" className="mt-6 w-full" onPress={() => { setTracking(success.code); setSuccess(null); }} />
          </View>
        )}
      </Sheet>

      {/* Suivi sans quitter la page */}
      <Sheet open={!!tracking} onClose={() => setTracking(null)} title="Suivi de ma commande">
        {tracking && <OrderTracking code={tracking} compact onNavigate={() => setTracking(null)} />}
      </Sheet>
    </View>
  );
}

/* ------------------------------------------------------------------ */

/** Formulaire de réservation d'un cadeau (RPC claim_gift). */
function ClaimForm({ token, gift, celebrant, accent, onDone, onError }: {
  token: string; gift: GiftItem; celebrant: string; accent: string; onDone: (code: string) => void; onError: (m: string) => void;
}) {
  const [f, setF] = useState({ name: '', phone: '', email: '', address: '', date: '', message: '' });
  const [wrap, setWrap] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const set = (k: keyof typeof f) => (v: string) => setF((x) => ({ ...x, [k]: v }));

  const submit = async () => {
    setErr('');
    if (!f.name.trim() || !f.phone.trim()) return setErr('Le nom et le téléphone sont obligatoires.');
    setLoading(true);
    const { data, error } = await supabase.rpc('claim_gift', {
      p_token: token, p_gift_id: gift.id, p_name: f.name, p_phone: f.phone,
      p_email: f.email || null, p_message: f.message || null, p_address: f.address || null,
      p_delivery_date: f.date || null, p_wrap: wrap,
    });
    setLoading(false);
    if (error) return onError(error.message);
    onDone(data.tracking_code);
  };

  return (
    <View>
      <View className="mb-3 flex-row items-center rounded-2xl bg-white p-3">
        {!!gift.image_url && <Image source={{ uri: gift.image_url }} style={{ width: 64, height: 64, borderRadius: 12 }} />}
        <View className={cn('flex-1', gift.image_url && 'ml-3')}>
          <Text className="font-bold2 text-[14px] text-ink">{gift.name}</Text>
          <Text className="font-body text-[13px] text-ink/65">{formatPrice(gift.price)}{gift.vendor ? ` · ${gift.vendor.name}` : ''}</Text>
        </View>
      </View>
      <Txt className="mb-4 text-[13px] leading-[19px] text-ink/70">
        {gift.vendor ? 'Vos coordonnées sont transmises à la boutique pour préparer la commande. Le paiement se fait directement avec elle.'
          : 'Ce cadeau n’a pas de boutique partenaire : vous recevrez le contact du vendeur.'}
      </Txt>
      <Field label="Votre nom" value={f.name} onChangeText={set('name')} autoComplete="name" />
      <Field label="Téléphone / WhatsApp" value={f.phone} onChangeText={set('phone')} keyboardType="phone-pad" autoComplete="tel" />
      <Field label="Email (facultatif)" value={f.email} onChangeText={set('email')} keyboardType="email-address" autoCapitalize="none" />
      <Field label="Lieu de livraison" placeholder="Vide = retrait en boutique" value={f.address} onChangeText={set('address')} />
      <DateField label="Livrer le" value={f.date} onChange={set('date')} min={todayIso()} clearable placeholder="À convenir" />
      {gift.wrap_available && (
        <Toggle value={wrap} onChange={setWrap} icon={Ribbon} color={accent} label="Emballage cadeau par la boutique"
          hint={gift.wrap_price ? `+ ${formatPrice(gift.wrap_price)}` : 'Offert'} />
      )}
      <Field label={`Un mot pour ${celebrant}`} multiline placeholder="Révélé avec votre nom après l’anniversaire" value={f.message} onChangeText={set('message')} />
      <ErrorText text={err} />
      <Button loading={loading} title="Réserver ce cadeau" color={accent} textColor={readableOn(accent)} onPress={submit} />
    </View>
  );
}

/** « Serez-vous là ? » : oui / peut-être / non, nombre de personnes, nom, téléphone, petit mot (RPC rsvp). */
function RsvpForm({ token, accent }: { token: string; accent: string }) {
  const fx = useFx();
  const [sent, setSent] = useState<string | null>(null);
  const [f, setF] = useState({ name: '', phone: '', attending: 'oui', guests: 1, message: '' });
  const [loading, setLoading] = useState(false);
  useEffect(() => { readRsvp(token).then(setSent); }, [token]);
  const btn = accent.toLowerCase() === '#f7f5f2' ? colors.ink : accent; // le blanc serait illisible

  if (sent)
    return <Text className="mt-6 rounded-2xl bg-white p-4 text-center font-semi text-[14px] text-ink" style={shadow.sm}>Merci, votre réponse a été envoyée : {sent}.</Text>;

  const submit = async () => {
    if (!f.name.trim()) return fx.toast('Indiquez votre nom.', 'err');
    setLoading(true);
    const { error } = await supabase.rpc('rsvp', {
      p_token: token, p_name: f.name, p_phone: f.phone || null, p_attending: f.attending, p_guests: f.guests, p_message: f.message || null,
    });
    setLoading(false);
    if (error) return fx.toast(error.message, 'err');
    const label = f.attending === 'oui' ? 'je serai là' : f.attending === 'non' ? 'je ne pourrai pas venir' : 'peut-être';
    await saveRsvp(token, label); setSent(label); fx.toast('Réponse envoyée');
  };

  return (
    <View className="mt-6 rounded-[28px] bg-white p-6" style={shadow.sm}>
      <Title className="mb-4 text-center text-[28px]">Serez-vous là ?</Title>
      <View className="mb-4 flex-row gap-2">
        {[{ k: 'oui', l: 'Oui' }, { k: 'peut-etre', l: 'Peut-être' }, { k: 'non', l: 'Non' }].map((o) => {
          const on = f.attending === o.k;
          return (
            <Button key={o.k} small title={o.l} variant="ghost" className="flex-1"
              color={on ? btn : undefined} textColor={on ? readableOn(btn) : undefined}
              onPress={() => setF({ ...f, attending: o.k })} />
          );
        })}
      </View>
      {f.attending !== 'non' && (
        <View className="mb-4">
          <Txt className="mb-1.5 font-semi text-[13px] text-ink/75">Nombre de personnes</Txt>
          <Pills value={f.guests} onChange={(n) => setF({ ...f, guests: n })} options={[1, 2, 3, 4, 5, 6].map((n) => ({ key: n, label: `${n} pers.` }))} />
        </View>
      )}
      <Field placeholder="Votre nom" value={f.name} onChangeText={(v) => setF({ ...f, name: v })} accessibilityLabel="Votre nom" />
      <Field placeholder="Téléphone (facultatif)" keyboardType="phone-pad" value={f.phone} onChangeText={(v) => setF({ ...f, phone: v })} accessibilityLabel="Téléphone" />
      <Field placeholder="Un petit mot (facultatif)" value={f.message} onChangeText={(v) => setF({ ...f, message: v })} accessibilityLabel="Un petit mot" />
      <Button loading={loading} title="Envoyer ma réponse" color={btn} textColor={readableOn(btn)} onPress={submit} />
    </View>
  );
}
