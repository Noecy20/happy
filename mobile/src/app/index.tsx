/**
 * Accueil (visiteur non connecté).
 * Si l'utilisateur est déjà connecté, on l'envoie directement dans son espace selon son rôle.
 * Sinon : présentation du concept, démo interactive « réservez un cadeau », accès aux boutiques et au suivi.
 */
import { Redirect, router } from 'expo-router';
import { EyeOff, Package, RotateCcw, ShieldCheck, Store } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { GiftStack, Logo } from '@/components/Illustrations';
import { Button, Loading, Screen, Title, Txt } from '@/components/ui';
import WrappedCard from '@/components/WrappedCard';
import { colors } from '@/lib/theme';
import type { GiftItem } from '@/lib/types';
import { homeOf, useAuth } from '@/providers/AuthProvider';

// Cadeaux fictifs de la démo (aucun appel à la base)
const DEMO: GiftItem[] = [
  { id: 'a1', name: 'Parfum floral 50 ml', price: 38000, claimed: false, vendor_name: 'Maison Nour, Cocody' },
  { id: 'b2', name: 'Robe en wax sur mesure', price: 45000, claimed: true, vendor_name: 'Atelier Awa, Marcory' },
];

export default function Home() {
  const { ready, session, profile } = useAuth();
  const [demo, setDemo] = useState(DEMO);

  if (!ready) return <Loading />;
  if (session && profile) return <Redirect href={homeOf(profile.role) as any} />;

  return (
    <Screen>
      <View className="flex-row items-center justify-between py-3">
        <Logo />
        <Button small variant="ghost" title="Connexion" onPress={() => router.push('/connexion')} />
      </View>

      <View className="items-center pt-2">
        <GiftStack width={280} />
      </View>
      <Title className="mt-2 text-[44px] leading-[44px]">La liste d’anniversaire qui garde le secret.</Title>
      <Txt className="mt-4 text-[16px] leading-[24px] text-ink/65">
        Vous créez votre liste, vos proches réservent un cadeau et le commandent directement à la boutique.
        Vous savez qu’un cadeau est pris, jamais par qui, jusqu’au lendemain de la fête.
      </Txt>

      <Button variant="candy" title="Créer ma liste" className="mt-7" onPress={() => router.push('/inscription')} />
      <Button variant="ghost" title="J’ai déjà un compte" className="mt-3" onPress={() => router.push('/connexion')} />

      <View className="mt-8 gap-3">
        {[{ i: EyeOff, t: 'Surprise préservée' }, { i: Store, t: 'Boutiques partenaires' }, { i: ShieldCheck, t: 'Lien personnel sécurisé' }].map(({ i: I, t }) => (
          <View key={t} className="flex-row items-center"><I size={17} color={colors.candy} /><Txt className="ml-2 font-medium text-ink/70">{t}</Txt></View>
        ))}
      </View>

      {/* Démo : toucher « Je m'en charge » emballe le cadeau */}
      <Title className="mt-12 text-[32px]">Essayez : réservez un cadeau</Title>
      <Txt className="mb-5 mt-2 leading-[22px] text-ink/65">Dès qu’un proche touche « Je m’en charge », le cadeau s’emballe pour tout le monde.</Txt>
      {demo.map((g) => (
        <WrappedCard key={g.id} gift={g} onClaim={(x) => setDemo((all) => all.map((i) => (i.id === x.id ? { ...i, claimed: true } : i)))} />
      ))}
      <Pressable onPress={() => setDemo(DEMO)} className="mb-8 min-h-[44px] flex-row items-center">
        <RotateCcw size={14} color={colors.muted} /><Txt className="ml-2 font-semi text-ink/55">Réinitialiser la démo</Txt>
      </Pressable>

      {/* Boutiques et suivi */}
      <View className="overflow-hidden rounded-[28px] bg-plum p-7">
        <Text className="font-display text-[32px] text-white">Les boutiques Happy</Text>
        <Text className="mt-2 font-body text-[15px] leading-[22px] text-white/70">Commandez directement un cadeau, faites-le emballer et livrer, en surprise si vous le souhaitez.</Text>
        <Button variant="light" icon={Store} title="Voir les boutiques" className="mt-5" onPress={() => router.push('/boutiques')} />
        <Button variant="glass" title="Ouvrir ma boutique" className="mt-3" onPress={() => router.push({ pathname: '/inscription', params: { type: 'boutique' } })} />
      </View>
      <Button variant="ghost" icon={Package} title="Suivre une commande" className="mt-4" onPress={() => router.push('/suivi')} />

      <Button variant="ghost" title="Nous contacter" className="mt-3" onPress={() => router.push('/contact')} />

      <Txt className="mt-10 text-center text-[13px] text-ink/45">Fait à Abidjan, pour toutes les fêtes.</Txt>
    </Screen>
  );
}
