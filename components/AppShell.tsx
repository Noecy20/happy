'use client';
import type { LucideIcon } from 'lucide-react';
import Logo from './Logo';
import SignOut from './SignOut';

export type NavItem = { key: string; label: string; icon: LucideIcon; badge?: number };

/** Cadre des espaces connectés : menu latéral (ordinateur) ou onglets (téléphone), barre du haut, contenu. */
export default function AppShell({ nav, active, onNav, user, actions, children }: {
  nav: NavItem[]; active: string; onNav: (key: string) => void;
  user: { name: string; sub?: string }; actions?: React.ReactNode; children: React.ReactNode;
}) {
  const current = nav.find((n) => n.key === active);
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[248px_1fr]">
      {/* Menu latéral */}
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-ink/10 bg-white lg:flex">
        <div className="px-5 py-5"><Logo /></div>
        <nav className="flex-1 space-y-0.5 px-3" aria-label="Sections">
          {nav.map((n) => (
            <button key={n.key} onClick={() => onNav(n.key)} aria-current={active === n.key ? 'page' : undefined}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[15px] font-semibold transition-colors ${active === n.key ? 'bg-lilac text-ink' : 'text-ink/65 hover:bg-paper hover:text-ink'}`}>
              <n.icon size={18} className={active === n.key ? 'text-candy' : ''} />
              <span className="flex-1">{n.label}</span>
              {!!n.badge && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-candy px-1.5 text-[11px] font-bold text-white">{n.badge}</span>}
            </button>
          ))}
        </nav>
        <div className="flex items-center gap-3 border-t border-ink/10 px-5 py-4">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-lilac font-bold text-plum">{(user.name || '?')[0].toUpperCase()}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">{user.name}</p>
            {user.sub && <p className="truncate text-xs text-ink/55">{user.sub}</p>}
          </div>
          <SignOut />
        </div>
      </aside>

      <div className="min-w-0">
        {/* Barre du haut */}
        <header className="sticky top-0 z-30 border-b border-ink/10 bg-paper/95 backdrop-blur">
          <div className="flex h-16 items-center justify-between gap-3 px-5 lg:px-10">
            <div className="lg:hidden"><Logo /></div>
            <h1 className="hidden text-2xl lg:block">{current?.label}</h1>
            <div className="flex items-center gap-2">{actions}<span className="lg:hidden"><SignOut /></span></div>
          </div>
          {/* Onglets sur téléphone */}
          <nav className="flex gap-1 overflow-x-auto px-3 pb-2 lg:hidden" aria-label="Sections">
            {nav.map((n) => (
              <button key={n.key} onClick={() => onNav(n.key)} aria-current={active === n.key ? 'page' : undefined}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold ${active === n.key ? 'bg-ink text-white' : 'text-ink/70'}`}>
                {n.label}
                {!!n.badge && <span className="grid h-4 min-w-4 place-items-center rounded-full bg-candy px-1 text-[10px] font-bold text-white">{n.badge}</span>}
              </button>
            ))}
          </nav>
        </header>
        <main className="mx-auto max-w-5xl px-5 py-8 lg:px-10">{children}</main>
      </div>
    </div>
  );
}
