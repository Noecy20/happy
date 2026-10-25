/** Admin · Messages reçus via le formulaire « Nous contacter » du site (table contact_messages). */
import { Inbox, MessageCircle } from 'lucide-react-native';
import { useState } from 'react';
import { Linking, Text, View } from 'react-native';
import AdminHeader from '@/components/admin/AdminHeader';
import { Button, Card, Empty, Loading, Screen } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { waLink } from '@/lib/utils';
import { useAdmin } from '@/providers/AdminProvider';

export default function AdminMessages() {
  const a = useAdmin();
  const [refreshing, setRefreshing] = useState(false);
  if (a.loading) return <Loading />;
  return (
    <Screen onRefresh={async () => { setRefreshing(true); await a.reload(); setRefreshing(false); }} refreshing={refreshing}>
      <AdminHeader title="Messages" />
      <View className="mt-5">
        {a.messages.length === 0 && <Empty icon={Inbox} text="Aucun message reçu via le site." />}
        {a.messages.map((r) => (
          <Card key={r.id} className="mb-3" style={{ opacity: r.status === 'en_attente' ? 1 : 0.6 }}>
            <Text className="font-bold2 text-[15px] text-ink">{r.full_name}</Text>
            <Text className="font-body text-[13px] text-ink/60">{[r.phone, r.email].filter(Boolean).join(' · ')}</Text>
            {!!r.message && <Text className="mt-2 rounded-xl bg-lilac/50 p-3 font-body text-[14px] text-ink">{r.message}</Text>}
            <Text className="mt-2 font-body text-[11px] text-ink/40">Reçu le {new Date(r.created_at).toLocaleDateString('fr-FR')}</Text>
            <View className="mt-3 flex-row gap-2">
              {!!r.phone && <Button small variant="ghost" icon={MessageCircle} title="WhatsApp" onPress={() => Linking.openURL(waLink(r.phone!))} />}
              {r.status === 'en_attente' && (
                <Button small title="Traité" onPress={() => a.act(() => supabase.from('contact_messages').update({ status: 'traitee' }).eq('id', r.id), 'Marqué comme traité')} />
              )}
            </View>
          </Card>
        ))}
      </View>
    </Screen>
  );
}
