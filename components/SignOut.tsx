'use client';
import { LogOut } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function SignOut() {
  return (
    <button
      onClick={async () => { await createClient().auth.signOut(); window.location.href = '/'; }}
      className="grid h-10 w-10 place-items-center rounded-full border border-ink/10 bg-white hover:bg-lilac/60"
      aria-label="Se déconnecter" title="Se déconnecter"
    >
      <LogOut size={18} />
    </button>
  );
}
