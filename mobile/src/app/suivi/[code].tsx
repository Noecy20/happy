/** Suivi plein écran d'une commande (ouvert aussi par https://<site>/suivi/<code>). */
import { useLocalSearchParams } from 'expo-router';
import OrderTracking from '@/components/OrderTracking';
import TopBar from '@/components/TopBar';
import { Screen } from '@/components/ui';

export default function Tracking() {
  const { code } = useLocalSearchParams<{ code: string }>();
  return (
    <Screen>
      <TopBar />
      <OrderTracking code={String(code).toUpperCase()} />
    </Screen>
  );
}
