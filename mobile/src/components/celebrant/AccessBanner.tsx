/**
 * Bandeau d'état de l'accès du célébrant :
 * - non activé (gris rosé) → « Demander l'accès »,
 * - demande en cours → bouton désactivé « En attente de validation »,
 * - actif → « Accès actif jusqu'au … · N jours restants », bouton « Prolonger » à 7 jours de la fin,
 * - expiré (rose) → « Demander une prolongation ».
 */
import { Clock, Lock } from 'lucide-react-native';
import { Text, View } from 'react-native';
import { Button } from '@/components/ui';
import { colors } from '@/lib/theme';
import { formatDate } from '@/lib/utils';

export default function AccessBanner({ hasAccess, daysLeft, expires, pending, onRequest }: {
  hasAccess: boolean; daysLeft: number; expires: string | null; pending: boolean; onRequest: () => void;
}) {
  if (!hasAccess) {
    const expired = !!expires;
    return (
      <View className={`mt-5 rounded-3xl p-5 ${expired ? 'bg-candy' : 'bg-lilac'}`}>
        <View className="flex-row">
          {expired ? <Lock size={24} color="#fff" /> : <Clock size={24} color={colors.ink} />}
          <View className="ml-3 flex-1">
            <Text className={`font-bold2 text-[15px] ${expired ? 'text-white' : 'text-ink'}`}>
              {pending ? 'Demande envoyée' : expired ? `Votre accès a expiré le ${formatDate(expires!)}` : 'Votre accès n’est pas encore activé'}
            </Text>
            <Text className={`mt-1 font-body text-[13px] leading-[19px] ${expired ? 'text-white/85' : 'text-ink/70'}`}>
              {pending ? 'L’administrateur la traite. Vous recevrez une notification dès l’activation.'
                : expired ? 'Votre lien est désactivé. Demandez une prolongation pour le réactiver.'
                : 'Préparez dès maintenant votre anniversaire et vos cadeaux. L’accès est nécessaire pour publier et partager la liste.'}
            </Text>
          </View>
        </View>
        <Button small className="mt-4" variant={expired ? 'light' : 'primary'} disabled={pending} onPress={onRequest}
          title={pending ? 'En attente de validation' : expired ? 'Demander une prolongation' : 'Demander l’accès'} />
      </View>
    );
  }
  const soon = daysLeft <= 7;
  return (
    <View className={`mt-5 rounded-2xl border border-ink/[0.07] px-4 py-3 ${soon ? 'bg-lilac' : 'bg-white'}`}>
      <View className="flex-row items-center">
        <Clock size={18} color={colors.candy} />
        <Text className="ml-2 flex-1 font-semi text-[13px] text-ink">
          Accès actif jusqu’au {formatDate(expires!)} · {daysLeft <= 0 ? 'expire aujourd’hui' : `${daysLeft} jour${daysLeft > 1 ? 's' : ''} restant${daysLeft > 1 ? 's' : ''}`}
        </Text>
      </View>
      {soon && <Button small className="mt-3" disabled={pending} onPress={onRequest} title={pending ? 'Prolongation demandée' : 'Prolonger'} />}
    </View>
  );
}
