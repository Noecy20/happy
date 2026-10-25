/**
 * Contexte d'authentification : qui est connecté et avec quel rôle.
 *
 * - Écoute les changements de session Supabase (connexion, déconnexion, rafraîchissement du jeton).
 * - Charge le profil (table `profiles`) pour connaître le rôle : admin, célébrant ou boutique.
 * - Si la session pointe vers un compte supprimé (erreur `refresh_token_not_found` ou profil absent),
 *   on se déconnecte proprement au lieu de rester bloqué.
 */
import type { Session } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { forgetPush } from '@/lib/push';
import { supabase } from '@/lib/supabase';
import type { Profile, Role } from '@/lib/types';

type AuthState = {
  ready: boolean;              // vrai une fois la session initiale lue
  session: Session | null;
  profile: Profile | null;
  refreshProfile: () => Promise<Profile | null>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState>({
  ready: false, session: null, profile: null,
  refreshProfile: async () => null, signOut: async () => {},
});

/** Écran d'accueil de chaque rôle (utilisé après connexion et au lancement). */
export const homeOf = (role?: Role | null) => (role === 'admin' ? '/admin' : role === 'vendor' ? '/vendeur' : '/espace');

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  /** Lit le profil de l'utilisateur connecté. */
  const loadProfile = useCallback(async (s: Session | null) => {
    if (!s) { setProfile(null); return null; }
    const { data, error } = await supabase.from('profiles').select('*').eq('id', s.user.id).maybeSingle();
    if (!error && !data) {
      // Compte supprimé par l'admin : la session ne sert plus à rien.
      await supabase.auth.signOut().catch(() => null);
      setSession(null); setProfile(null);
      return null;
    }
    setProfile(data as Profile | null);
    return data as Profile | null;
  }, []);

  useEffect(() => {
    // 1. Session déjà enregistrée sur le téléphone ?
    supabase.auth.getSession()
      .then(async ({ data, error }) => {
        if (error && /refresh_token_not_found|Invalid Refresh Token/i.test(error.message)) {
          await supabase.auth.signOut().catch(() => null);
        }
        setSession(data.session);
        await loadProfile(data.session);
      })
      .finally(() => setReady(true));

    // 2. Puis on suit tous les changements.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      // On évite d'appeler Supabase directement dans le callback (recommandation officielle).
      setTimeout(() => loadProfile(s), 0);
    });
    return () => sub.subscription.unsubscribe();
  }, [loadProfile]);

  const signOut = useCallback(async () => {
    await forgetPush();
    await supabase.auth.signOut().catch(() => null);
    setSession(null); setProfile(null);
  }, []);

  return (
    <AuthContext.Provider value={{ ready, session, profile, refreshProfile: () => loadProfile(session), signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
