/** Onglet « Notifications » de la boutique (nouvelles commandes, validation, rappels de livraison). */
import { NotificationsList } from '@/components/NotificationsList';
import PushButton from '@/components/PushButton';
import { Screen, Title } from '@/components/ui';
import { useVendor } from '@/providers/VendorProvider';

export default function VendorNotifications() {
  const { notifs } = useVendor();
  return (
    <Screen onRefresh={notifs.reload}>
      <Title className="mb-4 mt-4">Notifications</Title>
      <PushButton className="mb-4 self-start" label="Recevoir aussi les notifications sur ce téléphone" />
      <NotificationsList items={notifs.items} unread={notifs.unread} onMarkRead={notifs.markAllRead} />
    </Screen>
  );
}
