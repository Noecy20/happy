import Link from 'next/link';
import { Gift } from 'lucide-react';

export default function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link href="/" className={`inline-flex items-center gap-2.5 ${light ? 'text-white' : 'text-ink'}`} aria-label="Happy, accueil">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-candy text-white shadow-[0_8px_18px_-8px_rgba(214,51,108,.8)]">
        <Gift size={18} strokeWidth={2.2} />
      </span>
      <span className="font-book text-[26px] font-semibold leading-none tracking-tight">Happy</span>
    </Link>
  );
}
