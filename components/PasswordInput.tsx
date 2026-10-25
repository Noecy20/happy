'use client';
import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

/** Champ mot de passe avec bouton œil pour afficher / masquer la saisie. */
export default function PasswordInput(props: Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input {...props} type={visible ? 'text' : 'password'} className={`${props.className || 'input'} pr-12`} />
      <button type="button" onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'} aria-pressed={visible}
        className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full text-ink/45 hover:bg-lilac/60 hover:text-ink">
        {visible ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}
