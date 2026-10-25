import Link from 'next/link';
import { Check, Phone } from 'lucide-react';
import Navbar from '@/components/Navbar';
import HeroVisual from '@/components/HeroVisual';
import SurpriseDemo from '@/components/SurpriseDemo';
import Wax from '@/components/Wax';

const STEPS = [
  { t: 'Inscrivez-vous', d: "Une seule inscription, puis vous demandez l'accès depuis votre espace." },
  { t: 'Composez votre liste', d: 'Photos, prix, boutique, dress code et couleur de la fête.' },
  { t: 'Partagez le lien', d: 'WhatsApp, SMS, réseaux : vos proches consultent la liste sans créer de compte.' },
  { t: 'Découvrez qui, après la fête', d: 'Le lendemain de votre anniversaire, chaque cadeau révèle son auteur et le livre d’or s’ouvre.' },
];

export default function Home() {
  return (
    <>
      <Navbar />
      <main className="overflow-x-clip">
        {/* HERO */}
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-16 pt-8 md:pt-14 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <h1 className="text-[clamp(3rem,7.2vw,5.8rem)] leading-[0.92]">
              La liste d’anniversaire qui garde le secret.
            </h1>
            <p className="mt-7 max-w-[31rem] text-lg leading-relaxed text-ink/70">
              Vos proches réservent un cadeau et le commandent à la boutique. Vous voyez qu’un cadeau est pris, jamais par qui, jusqu’au lendemain de la fête.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link href="/inscription" className="btn-candy px-7 py-4 text-base">Créer ma liste</Link>
              <Link href="/connexion" className="btn-ghost px-7 py-4 text-base">J’ai déjà un compte</Link>
            </div>
          </div>
          <HeroVisual />
        </section>

        {/* Lisière de pagne */}
        <Wax className="h-7 w-full" size={56} colors={{ accent: '#D6336C' }} />

        {/* ÉTAPES */}
        <section id="comment" className="bg-ink text-white">
          <div className="mx-auto max-w-6xl px-5 py-14">
            <h2 className="text-2xl sm:text-3xl">De la liste à la révélation, en quatre temps</h2>
            <ol className="mt-8 grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map((s, i) => (
                <li key={s.t} className="flex gap-3">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-mango text-sm font-extrabold text-ink">{i + 1}</span>
                  <div>
                    <h3 className="text-lg leading-tight">{s.t}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-white/65">{s.d}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* DÉMO */}
        <section className="mx-auto max-w-6xl px-5 py-24">
          <div className="grid gap-14 lg:grid-cols-[1fr_2fr] lg:items-start">
            <div className="lg:sticky lg:top-28">
              <h2 className="text-[clamp(2.2rem,4vw,3.2rem)] leading-[1.02]">Essayez : réservez un cadeau</h2>
              <p className="mt-5 leading-relaxed text-ink/70">
                Dès qu’un proche clique sur « Je m’en charge », le cadeau s’emballe dans son pagne pour tout le monde. Personne ne peut plus le prendre,
                et la personne fêtée reçoit une notification anonyme.
              </p>
              <ul className="mt-8 space-y-3 text-[15px] text-ink/75">
                {[
                  'Le nom reste caché jusqu’au lendemain de l’anniversaire.',
                  'Chaque proche laisse une carte dans le livre d’or.',
                  'Le jour J, un message d’anniversaire part automatiquement.',
                ].map((t) => (
                  <li key={t} className="flex gap-3"><Check size={18} className="mt-0.5 shrink-0 text-mint" />{t}</li>
                ))}
              </ul>
            </div>
            <SurpriseDemo />
          </div>
        </section>

        {/* AMIS + BOUTIQUES */}
        <section id="boutiques" className="mx-auto max-w-6xl px-5 pb-24">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="panel flex flex-col p-8 sm:p-10">
              <h3 className="text-4xl leading-tight">Pour les proches</h3>
              <p className="mt-3 max-w-md leading-relaxed text-ink/70">
                Réservez en un clic, recevez un code de suivi et suivez la commande jusqu’à la livraison. Le paiement se règle directement avec la boutique.
              </p>
              <div className="mt-8 rounded-2xl bg-lilac p-5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-bold">Commande 4F2A9C1B</span>
                  <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-bold text-mint">En préparation</span>
                </div>
                <div className="mt-5 flex items-center">
                  {['Reçue', 'Acceptée', 'Préparation', 'Prête', 'Livrée'].map((s, i) => (
                    <div key={s} className="flex flex-1 items-center last:flex-none">
                      <span className={`grid h-7 w-7 place-items-center rounded-full text-white ${i <= 2 ? 'bg-mint' : 'bg-ink/15'}`} title={s}>{i <= 2 && <Check size={14} />}</span>
                      {i < 4 && <span className={`h-[3px] flex-1 ${i < 2 ? 'bg-mint' : 'bg-ink/10'}`} />}
                    </div>
                  ))}
                </div>
              </div>
              <Link href="/suivi" className="btn-ghost mt-8 self-start">Suivre une commande</Link>
            </div>

            <div className="relative flex flex-col overflow-hidden rounded-[20px] bg-plum p-8 text-white sm:p-10">
              <Wax className="absolute inset-x-0 top-0 h-3" size={24} colors={{ bg: '#F2A93B', accent: '#D6336C' }} />
              <h3 className="relative text-4xl leading-tight">Pour les boutiques</h3>
              <p className="relative mt-3 max-w-md leading-relaxed text-white/75">
                Chaque cadeau réservé arrive comme une commande dans votre espace, avec le contact de l’acheteur. Vous mettez à jour le statut, le client le voit aussitôt.
              </p>
              <div className="relative mt-8 rounded-2xl bg-white p-5 text-ink">
                <p className="text-xs font-semibold text-ink/55">Nouvelle commande</p>
                <p className="mt-1 font-display text-2xl">Robe en wax sur mesure</p>
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink/70">
                  <span className="font-semibold text-ink">Aïcha K.</span>
                  <span className="inline-flex items-center gap-1"><Phone size={13} />07 00 00 00 00</span>
                  <span className="rounded-full bg-mango/20 px-2 py-0.5 text-xs font-bold text-[#8a5a0f]">Paiement à régler</span>
                </div>
              </div>
              <div className="relative mt-8 flex flex-wrap gap-3"><Link href="/inscription?type=boutique" className="btn bg-white text-ink hover:bg-lilac">Ouvrir ma boutique</Link><Link href="/boutiques" className="btn border-white/30 text-white hover:bg-white/10">Voir les boutiques</Link></div>
            </div>
          </div>
        </section>

        {/* ACCÈS */}
        <section className="mx-auto max-w-6xl px-5 pb-24">
          <div className="grid items-center gap-10 overflow-hidden rounded-[20px] bg-lilac sm:grid-cols-[1.4fr_1fr]">
            <div className="p-8 sm:p-12">
              <h2 className="text-[clamp(2rem,4vw,3rem)] leading-[1.02]">Un accès pensé pour votre anniversaire</h2>
              <p className="mt-4 max-w-xl leading-relaxed text-ink/70">
                Votre espace est ouvert pour une durée définie. À l’échéance, le lien expire et ne peut pas servir à quelqu’un d’autre.
                Besoin de plus de temps ? Demandez une prolongation depuis votre espace.
              </p>
              <Link href="/inscription" className="btn-candy mt-8 px-7 py-3.5">Créer mon compte</Link>
            </div>
            <Wax className="hidden h-full min-h-[280px] sm:block" variant={1} size={72} colors={{ accent: '#F2A93B' }} />
          </div>
        </section>
      </main>

      <footer className="border-t border-ink/10">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-5 py-4 text-sm text-ink/60">
          <p className="font-book text-lg font-semibold text-ink">Happy</p>
          <p>Fait à Abidjan, pour toutes les fêtes.</p>
        </div>
      </footer>
    </>
  );
}
