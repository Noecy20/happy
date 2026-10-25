'use client';
import { useState } from 'react';
import GuestBook, { GuestCard } from '@/components/GuestBook';

// Images d'exemple dessinées (aucune vraie photo)
const pic = (a: string, b: string, sun = '#fff8') => `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='${a}'/><stop offset='1' stop-color='${b}'/></linearGradient></defs><rect width='400' height='300' fill='url(#g)'/><circle cx='300' cy='90' r='42' fill='${sun}'/><path d='M0 240 Q100 180 200 230 T400 210 V300 H0z' fill='#0003'/></svg>`)}`;
const portrait = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='300' height='390'><defs><linearGradient id='p' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#F6C9A8'/><stop offset='1' stop-color='#D6336C'/></linearGradient></defs><rect width='300' height='390' fill='url(#p)'/><circle cx='150' cy='150' r='62' fill='#5B3A29'/><path d='M40 390 Q60 250 150 240 Q240 250 260 390z' fill='#22306B'/></svg>`)}`;

const CARDS: GuestCard[] = [
  { id: '1', name: 'Awa', message: 'Joyeux anniversaire ma belle ! Que cette nouvelle année t’apporte autant de joie que tu en donnes autour de toi.', images: [pic('#D6336C', '#F2A93B')], gift: 'Sac en cuir', created_at: '' },
  { id: '2', name: 'Koffi et Marie', message: 'Merci pour toutes ces années d’amitié, les fous rires et les soirées à refaire le monde. On t’aime fort, profite de chaque instant !', images: [pic('#22306B', '#D6336C'), pic('#4E9C80', '#F2A93B')], gift: 'Participation Wave', created_at: '' },
  { id: '3', name: 'Tante Fatou', message: 'Que Dieu te bénisse et te garde. Bonne fête ma fille.', images: [], gift: 'Parfum', created_at: '' },
  { id: '4', name: 'Les collègues', message: 'Bon anniversaire de toute l’équipe ! Le gâteau de lundi est pour toi.', images: [pic('#F2A93B', '#22306B'), pic('#D6336C', '#4E9C80'), pic('#4E9C80', '#22306B')], gift: 'Participation Wave', created_at: '' },
  { id: '5', name: 'Yao', message: 'Joyeux anniversaire !', images: [], gift: 'Montre', created_at: '' },
];

export default function Demo() {
  const [photo, setPhoto] = useState(true);
  const [open, setOpen] = useState(true);
  return (
    <main className="grid min-h-screen place-items-center gap-4 bg-paper p-8 text-center">
      <div>
        <h1 className="text-4xl">Aperçu du livre d’or</h1>
        <p className="mt-2 text-ink/60">Exemple avec de fausses cartes. Visible seulement en local.</p>
        <div className="mt-6 flex justify-center gap-3">
          <button className="btn-candy" onClick={() => setOpen(true)}>Ouvrir le livre</button>
          <button className="btn-ghost" onClick={() => setPhoto(!photo)}>{photo ? 'Couverture sans photo' : 'Couverture avec photo'}</button>
        </div>
      </div>
      {open && <GuestBook celebrant="Cyrielle" age={28} date="2026-10-20" color="#D6336C" photo={photo ? portrait : null} cards={CARDS} onClose={() => setOpen(false)} />}
    </main>
  );
}
