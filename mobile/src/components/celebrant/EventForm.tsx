/**
 * Création / personnalisation de l'anniversaire (table `events`).
 * - Prénom et date de naissance COMPLÈTE (passée). Le prochain anniversaire et l'âge sont calculés :
 *   aperçu immédiat ici avec nextBirthday(), et valeur définitive par la fonction SQL next_birthday (trigger prepare_event).
 * - Après publication, prénom et date sont verrouillés (le trigger SQL les ignore de toute façon).
 * - Couleur de thème (palette + couleur libre) et dress code pré-rempli « Tout en <couleur> », modifiable.
 * - Fête facultative : date, heure, lieu, infos pratiques.
 */
import { Lock, PartyPopper } from 'lucide-react-native';
import { useState } from 'react';
import { Text, View } from 'react-native';
import ColorPicker from '@/components/ColorPicker';
import DateField from '@/components/DateField';
import { Button, ErrorText, Field, Label, Toggle } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import type { EventRow } from '@/lib/types';
import { colorName, formatLongDate, nextBirthday, todayIso } from '@/lib/utils';

export default function EventForm({ userId, event, defaultName, onSaved }: {
  userId: string; event?: EventRow | null; defaultName?: string; onSaved: (e: EventRow) => void;
}) {
  const locked = !!event?.published;
  const [f, setF] = useState({
    celebrant_name: event?.celebrant_name || defaultName || '',
    birth_date: event?.birth_date || '',
    title: event?.title || '', message: event?.message || '',
    theme_color: event?.theme_color || '', dress_code: event?.dress_code || '',
    has_party: event?.has_party || false,
    party_date: event?.party_date || '', party_time: event?.party_time || '',
    party_place: event?.party_place || '', party_details: event?.party_details || '',
  });
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof f) => (v: any) => setF((x) => ({ ...x, [k]: v }));
  const nb = f.birth_date ? nextBirthday(f.birth_date) : null;

  /** Le dress code suit la couleur tant qu'il est généré automatiquement (« Tout en … »). */
  const pickColor = (hex: string) => setF((x) => {
    const auto = !x.dress_code || x.dress_code.startsWith('Tout en ');
    return { ...x, theme_color: hex, dress_code: hex ? (auto ? `Tout en ${colorName(hex)}` : x.dress_code) : (auto ? '' : x.dress_code) };
  });

  const save = async () => {
    setErr('');
    if (!f.celebrant_name.trim()) return setErr('Indiquez le prénom de la personne fêtée.');
    if (!f.birth_date) return setErr('Indiquez la date de naissance complète.');
    if (f.birth_date > todayIso()) return setErr('La date de naissance ne peut pas être dans le futur.');
    setSaving(true);
    const payload: Record<string, any> = {
      celebrant_name: f.celebrant_name.trim(), birth_date: f.birth_date,
      title: f.title.trim() || null, message: f.message.trim() || null,
      theme_color: f.theme_color || null, dress_code: f.dress_code.trim() || null,
      has_party: f.has_party,
      party_date: f.has_party ? (f.party_date || nb?.date || null) : null,
      party_time: f.has_party ? f.party_time || null : null,
      party_place: f.has_party ? f.party_place.trim() || null : null,
      party_details: f.has_party ? f.party_details.trim() || null : null,
    };
    if (locked) { delete payload.celebrant_name; delete payload.birth_date; }
    const { data, error } = event
      ? await supabase.from('events').update(payload).eq('id', event.id).select().single()
      : await supabase.from('events').insert({ ...payload, owner_id: userId }).select().single();
    setSaving(false);
    if (error) return setErr(error.message);
    onSaved(data as EventRow);
  };

  return (
    <View>
      <Field label={`Prénom de la personne fêtée${locked ? ' (verrouillé)' : ''}`} editable={!locked} value={f.celebrant_name} onChangeText={set('celebrant_name')} />
      <DateField label={`Date de naissance${locked ? ' (verrouillée)' : ''}`} value={f.birth_date} onChange={set('birth_date')}
        max={todayIso()} disabled={locked} placeholder="Jour, mois et année" />
      {nb && (
        <View className="-mt-2 mb-4 flex-row items-center rounded-2xl bg-lilac/60 px-4 py-3">
          {locked && <Lock size={13} color="#1E1428" style={{ marginRight: 6 }} />}
          <Text className="flex-1 font-body text-[14px] text-ink">
            Prochain anniversaire : <Text className="font-bold2">{formatLongDate(nb.date)}</Text> · <Text className="font-bold2">{nb.age} ans</Text>
          </Text>
        </View>
      )}

      <Field label="Titre de la page (facultatif)" placeholder={nb ? `Les ${nb.age} ans de ${f.celebrant_name || '…'}` : 'Mon anniversaire'} value={f.title} onChangeText={set('title')} />
      <Field label="Un mot pour vos proches" multiline placeholder="Merci d’avance, j’ai hâte de vous voir !" value={f.message} onChangeText={set('message')} />

      <Label>Couleur et dress code (facultatif)</Label>
      <Text className="-mt-1 mb-3 font-body text-[12px] text-ink/55">La couleur habille votre espace et la page que verront vos proches.</Text>
      <ColorPicker value={f.theme_color} onChange={pickColor} />
      <Field className="mt-3" placeholder="Ex. : Chic en blanc et or, tenue traditionnelle…" value={f.dress_code} onChangeText={set('dress_code')} accessibilityLabel="Dress code" />

      <Toggle value={f.has_party} onChange={set('has_party')} icon={PartyPopper} label="J’organise une fête" hint="Vos proches recevront une carte d’invitation avec le lien." />
      {f.has_party && (
        <View className="mb-4 rounded-3xl border border-ink/[0.08] p-4">
          <DateField label="Date de la fête" value={f.party_date || nb?.date || ''} onChange={set('party_date')} min={todayIso()} />
          <Field label="Heure" placeholder="À partir de 19h" value={f.party_time} onChangeText={set('party_time')} />
          <Field label="Lieu" placeholder="Maquis Le Baobab, Cocody Angré" value={f.party_place} onChangeText={set('party_place')} />
          <Field label="Infos pratiques" multiline placeholder="Parking, code d’entrée, confirmez votre venue par WhatsApp…" value={f.party_details} onChangeText={set('party_details')} className="mb-0" />
        </View>
      )}

      <ErrorText text={err} />
      <Button variant="candy" loading={saving} title={event ? 'Enregistrer' : 'Créer l’anniversaire'} onPress={save} />
    </View>
  );
}
