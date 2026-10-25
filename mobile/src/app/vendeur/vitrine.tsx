/**
 * Onglet « Ma vitrine » : logo, image de couverture, nom, catégorie, adresse, téléphone, email, présentation.
 * + aperçu de la vitrine publique, notifications push et déconnexion.
 */
import { router } from 'expo-router';
import { ExternalLink, LogOut } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import ImageField from '@/components/ImageField';
import PushButton from '@/components/PushButton';
import { Button, Card, Field, Label, Loading, Pills, Screen, Title } from '@/components/ui';
import ShopHeader from '@/components/vendor/ShopHeader';
import { supabase } from '@/lib/supabase';
import { VENDOR_CATEGORIES } from '@/lib/utils';
import { useAuth } from '@/providers/AuthProvider';
import { useFx } from '@/providers/FxProvider';
import { useVendor } from '@/providers/VendorProvider';

export default function Storefront() {
  const v = useVendor();
  const { signOut } = useAuth();
  const fx = useFx();
  const [f, setF] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (v.vendor) setF({
      name: v.vendor.name || '', category: v.vendor.category || '', description: v.vendor.description || '', phone: v.vendor.phone || '',
      email: v.vendor.email || '', address: v.vendor.address || '', logo_url: v.vendor.logo_url || '', cover_url: v.vendor.cover_url || '',
    });
  }, [v.vendor]);
  if (v.loading || !v.vendor) return <Loading />;
  const set = (k: string) => (val: string) => setF((x) => ({ ...x, [k]: val }));

  const save = async () => {
    if (!f.name?.trim()) return fx.toast('Le nom de la boutique est obligatoire.', 'err');
    setBusy(true);
    const { error } = await supabase.from('vendors').update({
      name: f.name.trim(), category: f.category || null, description: f.description.trim() || null,
      phone: f.phone.trim() || null, email: f.email.trim() || null, address: f.address.trim() || null,
      logo_url: f.logo_url || null, cover_url: f.cover_url || null,
    }).eq('id', v.vendor!.id);
    setBusy(false);
    if (error) fx.toast(error.message, 'err'); else { fx.toast('Boutique enregistrée'); v.reload(); }
  };

  return (
    <Screen>
      <ShopHeader vendor={{ ...v.vendor, ...f } as any} />
      <Button variant="ghost" icon={ExternalLink} title="Voir ma vitrine publique" className="mt-4" onPress={() => router.push(`/boutiques/${v.vendor!.id}`)} />
      <Title className="mb-4 mt-8 text-[30px]">Ma boutique</Title>
      <Card>
        <View className="flex-row gap-3">
          <View className="w-28"><Label>Logo</Label><ImageField value={f.logo_url} onChange={set('logo_url')} label="Logo" prefix="logo_url" aspect={[1, 1]} round /></View>
          <View className="flex-1"><Label>Couverture</Label><ImageField value={f.cover_url} onChange={set('cover_url')} label="Image de couverture (facultatif)" prefix="cover_url" aspect={[16, 9]} /></View>
        </View>
        <Field label="Nom de la boutique" value={f.name} onChangeText={set('name')} />
        <Label>Ce que vous vendez</Label>
        <Pills className="mb-4" value={f.category} onChange={set('category')} options={VENDOR_CATEGORIES.map((c) => ({ key: c, label: c }))} />
        <Field label="Adresse" value={f.address} onChangeText={set('address')} />
        <Field label="Téléphone" keyboardType="phone-pad" value={f.phone} onChangeText={set('phone')} />
        <Field label="Email (facultatif)" keyboardType="email-address" autoCapitalize="none" value={f.email} onChangeText={set('email')} />
        <Field label="Présentation" multiline value={f.description} onChangeText={set('description')} />
        <Button variant="candy" loading={busy} title="Enregistrer" onPress={save} />
      </Card>
      <PushButton className="mt-6" small={false} label="Être prévenu des nouvelles commandes" />
      <Button variant="danger" icon={LogOut} title="Se déconnecter" className="mt-3" onPress={async () => { await signOut(); router.replace('/'); }} />
    </Screen>
  );
}
