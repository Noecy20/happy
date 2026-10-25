/**
 * Inscription unique avec sélecteur « Mon anniversaire » / « Ma boutique ».
 * - Email facultatif : sans email, l'identifiant technique est <chiffres>@tel.happy.app.
 *   Le trigger SQL handle_new_user le remplace par null dans profiles.email (jamais affiché).
 * - Les métadonnées (account_type, full_name, phone, shop_name, category, description, address)
 *   sont lues par handle_new_user pour créer le profil et, pour une boutique, la ligne `vendors` (en attente).
 * - Le logo de la boutique est envoyé juste après l'inscription (la session est alors ouverte).
 */
import { router, useLocalSearchParams } from 'expo-router';
import { Cake, ImagePlus, Store } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import TopBar from '@/components/TopBar';
import { Button, ErrorText, Field, Label, Pills, Screen, Segmented, Title, Txt } from '@/components/ui';
import { Image } from 'expo-image';
import { supabase } from '@/lib/supabase';
import { colors } from '@/lib/theme';
import { pickImage, uploadImage } from '@/lib/upload';
import { VENDOR_CATEGORIES, authError, phoneToEmail } from '@/lib/utils';
import { useFx } from '@/providers/FxProvider';

export default function Inscription() {
  const params = useLocalSearchParams<{ type?: string }>();
  const fx = useFx();
  const [type, setType] = useState<'celebrant' | 'vendor'>(params.type === 'boutique' ? 'vendor' : 'celebrant');
  const [f, setF] = useState({ full_name: '', phone: '', email: '', password: '', shop_name: '', category: '', description: '', address: '' });
  const [logo, setLogo] = useState<string | null>(null); // URI locale, envoyée après création du compte
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const set = (k: keyof typeof f) => (v: string) => setF((x) => ({ ...x, [k]: v }));

  const submit = async () => {
    setMsg('');
    if (!f.full_name.trim() || !f.phone.trim()) return setMsg('Le nom et le téléphone sont obligatoires.');
    if (f.password.length < 6) return setMsg('Mot de passe trop court : 6 caractères minimum.');
    if (type === 'vendor' && (!f.shop_name.trim() || !f.category)) return setMsg('Indiquez le nom de la boutique et ce que vous vendez.');
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: f.email.trim() || phoneToEmail(f.phone),
      password: f.password,
      options: {
        data: {
          ...(type === 'vendor' ? { account_type: 'vendor' } : {}),
          full_name: f.full_name.trim(), phone: f.phone.trim(),
          ...(type === 'vendor' ? { shop_name: f.shop_name.trim(), category: f.category, description: f.description.trim(), address: f.address.trim() } : {}),
        },
      },
    }).catch((e) => ({ data: null as any, error: e }));

    if (error) {
      setLoading(false);
      const m = String(error.message || '');
      return setMsg(m.includes('registered') ? (f.email ? 'Cet email a déjà un compte. Connectez-vous.' : 'Ce numéro a déjà un compte. Connectez-vous.') : authError(m));
    }
    if (!data?.session) {
      setLoading(false);
      return setMsg('Compte créé. Confirmez votre email via le lien reçu, puis connectez-vous. (Astuce : désactivez « Confirm email » dans Supabase.)');
    }
    // Logo de la boutique : chemin gifts/<uid>/logo-...
    if (type === 'vendor' && logo) {
      try {
        const url = await uploadImage(logo, 'logo');
        await supabase.from('vendors').update({ logo_url: url }).eq('owner_id', data.user.id);
      } catch (e: any) { fx.toast(e.message, 'err'); }
    }
    setLoading(false);
    fx.toast('Bienvenue sur Happy');
    router.replace(type === 'vendor' ? '/vendeur' : '/espace');
  };

  return (
    <Screen>
      <TopBar />
      <Title>Créer mon compte</Title>
      <Txt className="mb-6 mt-1 leading-[21px] text-ink/60">
        Anniversaire : vous préparez votre liste puis demandez l’accès. Boutique : votre vitrine est en ligne après validation de votre paiement.
      </Txt>

      <Segmented value={type} onChange={setType} options={[
        { key: 'celebrant', label: 'Mon anniversaire', icon: Cake },
        { key: 'vendor', label: 'Ma boutique', icon: Store },
      ]} />

      {type === 'vendor' && (
        <>
          <Field label="Nom de la boutique" value={f.shop_name} onChangeText={set('shop_name')} autoComplete="off" />
          <Label>Ce que vous vendez</Label>
          <Pills className="mb-4" value={f.category} onChange={set('category')} options={VENDOR_CATEGORIES.map((c) => ({ key: c, label: c }))} />
          <Field label="Quartier / adresse" placeholder="Cocody, Riviera 2…" value={f.address} onChangeText={set('address')} />
          {/* Logo : choisi maintenant, envoyé après la création du compte */}
          <Pressable onPress={async () => { try { const u = await pickImage([1, 1]); if (u) setLogo(u); } catch (e: any) { fx.toast(e.message, 'err'); } }}
            className="mb-4 flex-row items-center rounded-2xl border border-dashed border-ink/20 p-3">
            <View className="h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-lilac">
              {logo ? <Image source={{ uri: logo }} style={{ width: '100%', height: '100%' }} /> : <ImagePlus size={20} color={colors.candy} />}
            </View>
            <View className="ml-3 flex-1">
              <Text className="font-bold2 text-[14px] text-ink">Logo de la boutique</Text>
              <Text className="font-body text-[13px] text-ink/55">Affiché sur votre vitrine (facultatif)</Text>
            </View>
          </Pressable>
          <Field label="Présentation (facultatif)" multiline placeholder="Vos produits, vos délais de livraison…" value={f.description} onChangeText={set('description')} />
        </>
      )}

      <Field label={type === 'vendor' ? 'Votre nom (responsable)' : 'Nom complet'} value={f.full_name} onChangeText={set('full_name')} autoComplete="name" textContentType="name" />
      <Field label="Téléphone / WhatsApp" value={f.phone} onChangeText={set('phone')} keyboardType="phone-pad" autoComplete="tel" textContentType="telephoneNumber" />
      <Field label="Email (facultatif)" placeholder="Sans email, connexion avec votre téléphone" value={f.email} onChangeText={set('email')}
        keyboardType="email-address" autoCapitalize="none" autoComplete="email" textContentType="emailAddress" />
      <Field label="Mot de passe" placeholder="6 caractères minimum" value={f.password} onChangeText={set('password')} secureTextEntry
        autoComplete="new-password" textContentType="newPassword" />

      <ErrorText text={msg} />
      <Button variant="candy" loading={loading} title={type === 'vendor' ? 'Créer ma boutique' : 'Créer mon compte'} onPress={submit} />
      <Button variant="ghost" className="mt-3" title="Déjà inscrit ? Se connecter" onPress={() => router.replace('/connexion')} />
    </Screen>
  );
}
