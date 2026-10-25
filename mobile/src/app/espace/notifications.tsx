/** Onglet « Notifications » du célébrant (temps réel, voir NotificationsList). */
import { NotificationsList } from '@/components/NotificationsList';
import PushButton from '@/components/PushButton';
import { Screen, Title } from '@/components/ui';
import { useCelebrant } from '@/providers/CelebrantProvider';

export default function CelebrantNotifications() {
  const { notifs } = useCelebrant();
  return (
    <Screen onRefresh={notifs.reload}>
      <Title className="mb-4 mt-4">Notifications</Title>
      <PushButton className="mb-4 self-start" label="Recevoir aussi les notifications sur ce téléphone" />
      <NotificationsList items={notifs.items} unread={notifs.unread} onMarkRead={notifs.markAllRead} />
    </Screen>
  );
}
