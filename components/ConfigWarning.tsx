import { AlertTriangle } from 'lucide-react';
import { supabaseConfigured } from '@/lib/utils';

export default function ConfigWarning() {
  if (supabaseConfigured()) return null;
  return (
    <div className="mb-6 flex gap-3 rounded-2xl border border-candy/20 bg-lilac p-4 text-sm">
      <AlertTriangle size={18} className="mt-0.5 shrink-0 text-candy" />
      <p><strong>Supabase n’est pas configuré.</strong> Renseignez vos vraies clés dans <code>.env.local</code>, puis redémarrez <code>npm run dev</code>.</p>
    </div>
  );
}
