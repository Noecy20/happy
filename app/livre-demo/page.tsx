import { notFound } from 'next/navigation';
import Demo from './Demo';

// Aperçu du livre d'or avec de fausses cartes : disponible uniquement en développement (npm run dev)
export default function LivreDemo() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <Demo />;
}
