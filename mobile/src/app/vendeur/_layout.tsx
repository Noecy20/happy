/** Espace boutique : 4 onglets, données partagées par le VendorProvider. */
import { Tabs } from 'expo-router';
import { Bell, Package, ShoppingBag, Store } from 'lucide-react-native';
import { tabScreenOptions, useRoleGuard } from '@/components/TabsShell';
import { VendorProvider, useVendor } from '@/providers/VendorProvider';

export default function VendorLayout() {
  const guard = useRoleGuard(['vendor', 'admin']);
  if (guard) return guard;
  return <VendorProvider><VendorTabs /></VendorProvider>;
}

function VendorTabs() {
  const { notifs, orders } = useVendor();
  const todo = orders.filter((o) => !['livree', 'annulee'].includes(o.status)).length;
  return (
    <Tabs screenOptions={tabScreenOptions}>
      <Tabs.Screen name="index" options={{ title: 'Commandes', tabBarBadge: todo || undefined, tabBarIcon: ({ color }) => <ShoppingBag size={22} color={color} /> }} />
      <Tabs.Screen name="articles" options={{ title: 'Articles', tabBarIcon: ({ color }) => <Package size={22} color={color} /> }} />
      <Tabs.Screen name="vitrine" options={{ title: 'Ma vitrine', tabBarIcon: ({ color }) => <Store size={22} color={color} /> }} />
      <Tabs.Screen name="notifications" options={{ title: 'Notifications', tabBarBadge: notifs.unread || undefined, tabBarIcon: ({ color }) => <Bell size={22} color={color} /> }} />
    </Tabs>
  );
}
