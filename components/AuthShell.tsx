import Image from 'next/image';
import Logo from './Logo';

const PHOTOS = {
  mains: { src: '/images/mains-levees.jpg', pos: 'center 40%', quote: 'Vos amis choisissent. Vous découvrez qui, le lendemain de la fête.' },
  plage: { src: '/images/amis-plage.jpg', pos: 'center 55%', quote: 'Une liste, un lien, et tous vos proches réunis pour votre anniversaire.' },
};

export default function AuthShell({ title, subtitle, image = 'mains', children }: {
  title: string; subtitle?: string; image?: keyof typeof PHOTOS; children: React.ReactNode;
}) {
  const photo = PHOTOS[image];
  return (
    <main className="grid min-h-screen lg:grid-cols-[1fr_1.05fr]">
      {/* Toujours à la hauteur de l'écran : la photo n'est jamais étirée par un long formulaire */}
      <aside className="sticky top-0 hidden h-screen overflow-hidden bg-ink lg:block">
        <Image src={photo.src} alt="" fill priority sizes="50vw" className="object-cover" style={{ objectPosition: photo.pos }} />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/10 to-ink/40" />
        <div className="relative flex h-full flex-col justify-between p-10">
          <Logo light />
          <p className="max-w-md font-display text-[2.1rem] leading-tight text-white">{photo.quote}</p>
        </div>
      </aside>
      <section className="flex items-center justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-md">
          {/* Téléphone : bannière photo au-dessus du formulaire */}
          <div className="relative mb-8 h-36 overflow-hidden rounded-2xl bg-ink lg:hidden">
            <Image src={photo.src} alt="" fill priority sizes="100vw" className="object-cover" style={{ objectPosition: photo.pos }} />
            <div className="absolute inset-0 bg-gradient-to-t from-ink/70 to-transparent" />
            <div className="absolute bottom-3 left-4"><Logo light /></div>
          </div>
          <h1 className="text-4xl leading-tight sm:text-5xl">{title}</h1>
          {subtitle && <p className="mt-3 leading-relaxed text-ink/70">{subtitle}</p>}
          <div className="mt-9">{children}</div>
        </div>
      </section>
    </main>
  );
}
