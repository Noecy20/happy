/**
 * Espace célébrant : 5 onglets.
 * Le CelebrantProvider charge une seule fois les données et les partage entre les onglets.
 */
import { Tabs } from 'expo-router';
import { Bell, Cake, Gift, User, Users } from 'lucide-react-native';
import { tabScreenOptions, useRoleGuard } from '@/components/TabsShell';
import { CelebrantProvider, useCelebrant } from '@/providers/CelebrantProvider';

export default function CelebrantLayout() {
  const guard = useRoleGuard(['celebrant', 'admin']);
  if (guard) return guard;
  return (
    <CelebrantProvider>
      <CelebrantTabs />
    </CelebrantProvider>
  );
}

function CelebrantTabs() {
  const { notifs } = useCelebrant();
  return (
    <Tabs screenOptions={tabScreenOptions}>
      <Tabs.Screen name="index" options={{ title: 'Anniversaire', tabBarIcon: ({ color }) => <Cake size={22} color={color} /> }} />
      <Tabs.Screen name="liste" options={{ title: 'Ma liste', tabBarIcon: ({ color }) => <Gift size={22} color={color} /> }} />
      <Tabs.Screen name="invites" options={{ title: 'Invités', tabBarIcon: ({ color }) => <Users size={22} color={color} /> }} />
      <Tabs.Screen name="notifications" options={{
        title: 'Notifications', tabBarBadge: notifs.unread || undefined,
        tabBarIcon: ({ color }) => <Bell size={22} color={color} />,
      }} />
      <Tabs.Screen name="profil" options={{ title: 'Profil', tabBarIcon: ({ color }) => <User size={22} color={color} /> }} />
    </Tabs>
  );
}
