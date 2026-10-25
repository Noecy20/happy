/**
 * Garde d'accès + style commun des barres d'onglets des espaces connectés.
 * `useRoleGuard(role)` renvoie une redirection si l'utilisateur n'est pas connecté
 * ou n'a pas le bon rôle (ex. une boutique qui ouvrirait l'espace célébrant).
 */
import { Redirect } from 'expo-router';
import { colors, fonts } from '@/lib/theme';
import type { Role } from '@/lib/types';
import { homeOf, useAuth } from '@/providers/AuthProvider';
import { Loading } from './ui';

export function useRoleGuard(allowed: Role[]) {
  const { ready, session, profile } = useAuth();
  if (!ready || (session && !profile)) return <Loading />;
  if (!session) return <Redirect href="/connexion" />;
  if (profile && !allowed.includes(profile.role)) return <Redirect href={homeOf(profile.role) as any} />;
  return null;
}

/** Options visuelles des onglets : fond porcelaine, onglet actif rose Happy, police Manrope. */
export const tabScreenOptions = {
  headerShown: false,
  tabBarActiveTintColor: colors.candy,
  tabBarInactiveTintColor: 'rgba(30,20,40,0.45)',
  tabBarStyle: { backgroundColor: '#fff', borderTopColor: 'rgba(30,20,40,0.06)', height: 64, paddingTop: 6 },
  tabBarLabelStyle: { fontFamily: fonts.semi, fontSize: 11, paddingBottom: 4 },
  sceneStyle: { backgroundColor: colors.paper },
} as const;
