'use client';
import { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import WrappedCard, { GiftItem } from './WrappedCard';

const DEMO: GiftItem[] = [
  { id: 'a1', name: 'Parfum floral 50 ml', price: 38000, claimed: false, vendor_name: 'Maison Nour, Cocody' },
  { id: 'b2', name: 'Robe en wax sur mesure', price: 45000, claimed: true, vendor_name: 'Atelier Awa, Marcory' },
  { id: 'c3', name: 'Coffret bougies parfumées', price: 18000, claimed: false, vendor_name: 'Casa Déco, Riviera' },
];

export default function SurpriseDemo() {
  const [items, setItems] = useState(DEMO);
  return (
    <div>
      <div className="grid gap-5 sm:grid-cols-3">
        {items.map((g) => (
          <WrappedCard key={g.id} gift={g} onClaim={(x) => setItems((all) => all.map((i) => (i.id === x.id ? { ...i, claimed: true } : i)))} />
        ))}
      </div>
      <button onClick={() => setItems(DEMO)} className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-ink/55 hover:text-ink">
        <RotateCcw size={14} />Réinitialiser la démo
      </button>
    </div>
  );
}
