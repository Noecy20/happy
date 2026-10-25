/** Espace administrateur : 4 onglets (réservé au rôle admin). */
import { Tabs } from 'expo-router';
import { Inbox, Settings, Store, Users } from 'lucide-react-native';
import { tabScreenOptions, useRoleGuard } from '@/components/TabsShell';
import { AdminProvider, useAdmin } from '@/providers/AdminProvider';

export default function AdminLayout() {
  const guard = useRoleGuard(['admin']);
  if (guard) return guard;
  return <AdminProvider><AdminTabs /></AdminProvider>;
}

function AdminTabs() {
  const a = useAdmin();
  const pendingUsers = new Set(a.requests.filter((r) => r.status === 'en_attente').map((r) => r.user_id)).size;
  const pendingShops = a.vendors.filter((v) => v.status === 'en_attente').length;
  const newMessages = a.messages.filter((m) => m.status === 'en_attente').length;
  return (
    <Tabs screenOptions={tabScreenOptions}>
      <Tabs.Screen name="index" options={{ title: 'Utilisateurs', tabBarBadge: pendingUsers || undefined, tabBarIcon: ({ color }) => <Users size={22} color={color} /> }} />
      <Tabs.Screen name="boutiques" options={{ title: 'Boutiques', tabBarBadge: pendingShops || undefined, tabBarIcon: ({ color }) => <Store size={22} color={color} /> }} />
      <Tabs.Screen name="messages" options={{ title: 'Messages', tabBarBadge: newMessages || undefined, tabBarIcon: ({ color }) => <Inbox size={22} color={color} /> }} />
      <Tabs.Screen name="reglages" options={{ title: 'Réglages', tabBarIcon: ({ color }) => <Settings size={22} color={color} /> }} />
    </Tabs>
  );
}
