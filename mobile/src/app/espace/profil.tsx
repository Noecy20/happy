/** Onglet « Profil » : coordonnées, état de l'accès, notifications, accès admin éventuel, déconnexion. */
import { router } from 'expo-router';
import { Clock, LogOut, Mail, Phone, ShieldCheck } from 'lucide-react-native';
import PushButton from '@/components/PushButton';
import { Button, Card, InfoRow, Screen, Title } from '@/components/ui';
import { formatDate } from '@/lib/utils';
import { useAuth } from '@/providers/AuthProvider';
import { useCelebrant } from '@/providers/CelebrantProvider';

export default function Profile() {
  const { profile, signOut } = useAuth();
  const c = useCelebrant();
  if (!profile) return null;
  return (
    <Screen>
      <Title className="mb-5 mt-4">{profile.full_name || 'Mon profil'}</Title>
      <Card>
        {!!profile.phone && <InfoRow icon={Phone} text={profile.phone} />}
        {!!profile.email && <InfoRow icon={Mail} text={profile.email} />}
        <InfoRow icon={Clock} text={c.hasAccess ? `Accès actif jusqu’au ${formatDate(profile.access_expires_at!)}`
          : profile.access_expires_at ? `Accès expiré le ${formatDate(profile.access_expires_at)}` : 'Accès pas encore activé'} />
      </Card>
      <PushButton className="mt-5" small={false} />
      {profile.role === 'admin' && <Button variant="ghost" icon={ShieldCheck} title="Administration" className="mt-3" onPress={() => router.push('/admin')} />}
      <Button variant="danger" icon={LogOut} title="Se déconnecter" className="mt-3"
        onPress={async () => { await signOut(); router.replace('/'); }} />
    </Screen>
  );
}
