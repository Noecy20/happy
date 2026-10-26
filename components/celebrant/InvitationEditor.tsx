'use client';
import { useState } from 'react';
import { ArrowDown, ArrowUp, ExternalLink, ImagePlus, Plus, Trash2, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { STEP_ICONS, StepIcon, ProgramStep } from '@/components/Programme';

type Ev = { id: string; theme_color: string | null; theme_images?: string[]; palette?: string[]; program?: ProgramStep[]; reminders?: string[] };

const MAX_IMAGES = 8, MAX_COLORS = 6, MAX_STEPS = 8, MAX_REMINDERS = 4;
const ICON_LABELS: Record<StepIcon, string> = { lune: 'Lune', horloge: 'Horloge', couronne: 'Couronne', musique: 'Musique', soleil: 'Soleil', gateau: 'Gâteau', verre: 'Verre', etoile: 'Étoiles', cadeau: 'Cadeau' };

function Section({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return (
    <section className="panel p-5 sm:p-6">
      <h2 className="text-xl">{title}</h2>
      <p className="mt-0.5 text-sm text-ink/60">{hint}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

/** Espace célébrant : photos du thème, couleurs officielles, déroulé de la soirée, rappels. */
export default function InvitationEditor({ event, userId, inviteUrl, onSaved, onToast }: {
  event: Ev; userId: string; inviteUrl?: string; onSaved: (ev: any) => void; onToast: (m: string, ok: boolean) => void;
}) {
  const supabase = createClient();
  const [images, setImages] = useState<string[]>(event.theme_images || []);
  const [palette, setPalette] = useState<string[]>(event.palette?.length ? event.palette : event.theme_color ? [event.theme_color] : []);
  const [steps, setSteps] = useState<ProgramStep[]>(event.program || []);
  const [reminders, setReminders] = useState<string[]>(event.reminders?.length ? event.reminders : ['']);
  const [busy, setBusy] = useState('');

  const upload = async (file: File, prefix: string) => {
    if (file.size > 5 * 1024 * 1024) { onToast('Image trop lourde : 5 Mo maximum.', false); return null; }
    const path = `${userId}/${prefix}-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
    const { error } = await supabase.storage.from('gifts').upload(path, file);
    if (error) { onToast("L'image n'a pas été envoyée : " + error.message, false); return null; }
    return supabase.storage.from('gifts').getPublicUrl(path).data.publicUrl;
  };
  const addImages = async (files: FileList | null) => {
    setBusy('images');
    for (const f of [...(files || [])].slice(0, MAX_IMAGES - images.length)) {
      const url = await upload(f, 'theme');
      if (url) setImages((x) => [...x, url].slice(0, MAX_IMAGES));
    }
    setBusy('');
  };
  const setStep = (i: number, patch: Partial<ProgramStep>) => setSteps((all) => all.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  const move = (i: number, d: -1 | 1) => setSteps((all) => { const a = [...all]; [a[i], a[i + d]] = [a[i + d], a[i]]; return a; });
  const stepImage = async (i: number, file?: File) => {
    if (!file) return;
    setBusy(`step-${i}`);
    const url = await upload(file, 'programme');
    setBusy('');
    if (url) setStep(i, { image_url: url });
  };

  const save = async () => {
    setBusy('save');
    const clean = steps.map((s) => Object.fromEntries(Object.entries(s).map(([k, v]) => [k, typeof v === 'string' ? v.trim() : v]).filter(([, v]) => v)))
      .filter((s: any) => s.title || s.time);
    const { data, error } = await supabase.from('events').update({
      theme_images: images, palette, program: clean, reminders: reminders.map((r) => r.trim()).filter(Boolean),
    }).eq('id', event.id).select().single();
    setBusy('');
    if (error) return onToast(/theme_images|palette|program|reminders/.test(error.message) ? 'La base n’est pas à jour : exécutez supabase/7-invitation-programme.sql.' : error.message, false);
    onSaved(data); onToast('Invitation enregistrée', true);
  };

  return (
    <div className="space-y-6 pb-24">
      {inviteUrl && (
        <a href={inviteUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm font-bold text-candy hover:underline">
          <ExternalLink size={15} />Voir l’invitation comme mes invités
        </a>
      )}

      <Section title="Photos du thème" hint={`Des exemples de tenues, de déco ou d’ambiance. Elles défilent en miniature sur l’invitation (${MAX_IMAGES} au maximum).`}>
        <div className="flex flex-wrap gap-3">
          {images.map((src, i) => (
            <span key={src} className="relative h-28 w-[88px] overflow-hidden rounded-xl bg-lilac">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="h-full w-full object-cover" />
              <button onClick={() => setImages(images.filter((_, j) => j !== i))} aria-label="Retirer la photo" className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-ink/70 text-white"><X size={13} /></button>
            </span>
          ))}
          {images.length < MAX_IMAGES && (
            <label className="grid h-28 w-[88px] cursor-pointer place-items-center rounded-xl border-2 border-dashed border-ink/20 text-center text-xs font-semibold text-ink/55 hover:border-candy/50">
              <span><ImagePlus size={20} className="mx-auto mb-1" />{busy === 'images' ? 'Envoi…' : 'Ajouter'}</span>
              <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => { addImages(e.target.files); e.target.value = ''; }} />
            </label>
          )}
        </div>
      </Section>

      <Section title="Couleurs officielles" hint="Affichées avec le dress code et en bas du programme.">
        <div className="flex flex-wrap items-center gap-3">
          {palette.map((c, i) => (
            <span key={i} className="relative">
              <label className="block h-12 w-12 cursor-pointer overflow-hidden rounded-full ring-2 ring-white" style={{ background: c, boxShadow: '0 0 0 1px rgba(0,0,0,.12)' }} title="Changer la couleur">
                <input type="color" className="sr-only" value={c} onChange={(e) => setPalette(palette.map((x, j) => (j === i ? e.target.value : x)))} aria-label={`Couleur ${i + 1}`} />
              </label>
              <button onClick={() => setPalette(palette.filter((_, j) => j !== i))} aria-label="Retirer la couleur" className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-ink text-white"><X size={11} /></button>
            </span>
          ))}
          {palette.length < MAX_COLORS && (
            <button onClick={() => setPalette([...palette, '#C8A26A'])} className="grid h-12 w-12 place-items-center rounded-full border-2 border-dashed border-ink/25 text-ink/55 hover:border-ink/50" aria-label="Ajouter une couleur"><Plus size={18} /></button>
          )}
        </div>
      </Section>

      <Section title="Déroulé de la soirée" hint="Chaque étape apparaît sur l’invitation, dans l’ordre : heure, photo, programme et tenue.">
        <div className="space-y-4">
          {steps.map((s, i) => (
            <div key={i} className="rounded-xl border border-ink/15 p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-bold">Étape {i + 1}</p>
                <div className="flex gap-1">
                  <button disabled={i === 0} onClick={() => move(i, -1)} aria-label="Monter" className="grid h-8 w-8 place-items-center rounded-lg text-ink/60 hover:bg-lilac disabled:opacity-30"><ArrowUp size={15} /></button>
                  <button disabled={i === steps.length - 1} onClick={() => move(i, 1)} aria-label="Descendre" className="grid h-8 w-8 place-items-center rounded-lg text-ink/60 hover:bg-lilac disabled:opacity-30"><ArrowDown size={15} /></button>
                  <button onClick={() => setSteps(steps.filter((_, j) => j !== i))} aria-label="Supprimer l’étape" className="grid h-8 w-8 place-items-center rounded-lg text-ink/60 hover:bg-candy/10 hover:text-candy"><Trash2 size={15} /></button>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5" role="radiogroup" aria-label="Icône de l’étape">
                {(Object.keys(STEP_ICONS) as StepIcon[]).map((k) => {
                  const I = STEP_ICONS[k];
                  const on = (s.icon || 'horloge') === k;
                  return (
                    <button key={k} role="radio" aria-checked={on} title={ICON_LABELS[k]} onClick={() => setStep(i, { icon: k })}
                      className={`grid h-9 w-9 place-items-center rounded-full ${on ? 'bg-ink text-white' : 'bg-lilac text-ink/60 hover:text-ink'}`}><I size={16} /></button>
                  );
                })}
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-[160px_1fr]">
                <label className="relative grid aspect-[4/3] cursor-pointer place-items-center overflow-hidden rounded-xl border-2 border-dashed border-ink/20 text-center text-xs font-semibold text-ink/55 hover:border-candy/50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {s.image_url ? <img src={s.image_url} alt="" className="absolute inset-0 h-full w-full object-cover" /> : <span><ImagePlus size={20} className="mx-auto mb-1" />{busy === `step-${i}` ? 'Envoi…' : 'Photo (facultatif)'}</span>}
                  <input type="file" accept="image/*" className="sr-only" onChange={(e) => stepImage(i, e.target.files?.[0])} />
                </label>
                <div className="grid gap-2.5">
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    <input className="input py-2" placeholder="Heure, ex. Samedi 18h" value={s.time || ''} onChange={(e) => setStep(i, { time: e.target.value })} aria-label="Heure" />
                    <input className="input py-2" placeholder="Moment, ex. Pyjama party" value={s.label || ''} onChange={(e) => setStep(i, { label: e.target.value })} aria-label="Moment" />
                  </div>
                  <input className="input py-2" placeholder="Petite phrase, ex. Chill & cozy" value={s.tagline || ''} onChange={(e) => setStep(i, { tagline: e.target.value })} aria-label="Petite phrase" />
                  <input className="input py-2" placeholder="Titre, ex. Accueil et pyjama party" value={s.title || ''} onChange={(e) => setStep(i, { title: e.target.value })} aria-label="Titre" />
                </div>
              </div>
              <textarea rows={2} className="input mt-2.5" placeholder="Ce qui se passe à ce moment-là" value={s.text || ''} onChange={(e) => setStep(i, { text: e.target.value })} aria-label="Description" />
              <textarea rows={2} className="input mt-2.5" placeholder="Tenue (facultatif), ex. Pyjama chic : ivoire, beige, champagne" value={s.dress || ''} onChange={(e) => setStep(i, { dress: e.target.value })} aria-label="Tenue" />
            </div>
          ))}
          {steps.length < MAX_STEPS && (
            <button onClick={() => setSteps([...steps, { icon: (['lune', 'horloge', 'couronne', 'musique', 'soleil'] as StepIcon[])[steps.length % 5] }])} className="btn-ghost w-full border-dashed">
              <Plus size={16} />Ajouter une étape
            </button>
          )}
        </div>
      </Section>

      <Section title="À ne pas oublier" hint="Quelques rappels pour vos invités, ex. « Deux tenues », « Maillot de bain ».">
        <div className="space-y-2">
          {reminders.map((r, i) => (
            <div key={i} className="flex gap-2">
              <input className="input py-2" value={r} placeholder={['Deux tenues', 'Maillot de bain', 'Bonne humeur', 'Un cadeau surprise'][i]} onChange={(e) => setReminders(reminders.map((x, j) => (j === i ? e.target.value : x)))} aria-label={`Rappel ${i + 1}`} />
              <button onClick={() => setReminders(reminders.filter((_, j) => j !== i))} aria-label="Retirer" className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-ink/50 hover:bg-candy/10 hover:text-candy"><X size={16} /></button>
            </div>
          ))}
          {reminders.length < MAX_REMINDERS && <button onClick={() => setReminders([...reminders, ''])} className="text-sm font-bold text-candy hover:underline">+ Ajouter un rappel</button>}
        </div>
      </Section>

      <div className="sticky bottom-4 flex justify-end">
        <button onClick={save} disabled={busy === 'save'} className="btn-candy px-6 py-3 shadow-pop">{busy === 'save' ? 'Enregistrement…' : 'Enregistrer l’invitation'}</button>
      </div>
    </div>
  );
}
