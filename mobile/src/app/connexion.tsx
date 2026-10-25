/**
 * Connexion : un seul champ « Email ou téléphone ».
 * Si la saisie est un numéro, on la convertit en identifiant technique (phoneToEmail),
 * exactement comme sur le site web. Après connexion : redirection selon le rôle.
 */
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { GiftStack } from '@/components/Illustrations';
import TopBar from '@/components/TopBar';
import { Button, ErrorText, Field, Screen, Title, Txt } from '@/components/ui';
import { supabaseConfigured } from '@/lib/config';
import { supabase } from '@/lib/supabase';
import { authError, isPhone, phoneToEmail } from '@/lib/utils';
import { homeOf } from '@/providers/AuthProvider';

export default function Connexion() {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    setError('');
    if (!login.trim() || !password) return setError('Renseignez votre identifiant et votre mot de passe.');
    setLoading(true);
    const email = isPhone(login) ? phoneToEmail(login) : login.trim();
    const { data, error: err } = await supabase.auth.signInWithPassword({ email, password }).catch((e) => ({ data: null as any, error: e }));
    if (err) {
      setLoading(false);
      return setError(isPhone(login) && String(err.message).toLowerCase().includes('invalid')
        ? 'Téléphone ou mot de passe incorrect. Si vous vous êtes inscrit avec un email, connectez-vous avec votre email.'
        : authError(err.message));
    }
    // Rôle → espace de destination
    const { data: p } = await supabase.from('profiles').select('role').eq('id', data.user.id).single();
    setLoading(false);
    router.replace(homeOf(p?.role) as any);
  };

  return (
    <Screen>
      <TopBar />
      <View className="items-center"><GiftStack width={190} /></View>
      <Title>Bon retour</Title>
      <Txt className="mb-6 mt-1 text-ink/60">Célébrants, boutiques et administrateur se connectent ici.</Txt>
      {!supabaseConfigured() && <ErrorText text="Configuration Supabase manquante : renseignez le fichier .env (voir .env.example)." />}
      <Field label="Email ou téléphone" value={login} onChangeText={setLogin} autoCapitalize="none" autoComplete="username"
        textContentType="username" keyboardType="email-address" returnKeyType="next" />
      <Field label="Mot de passe" value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password"
        textContentType="password" returnKeyType="go" onSubmitEditing={submit} />
      <ErrorText text={error} />
      <Button title={loading ? 'Connexion…' : 'Se connecter'} loading={loading} onPress={submit} />
      <Button variant="ghost" title="Pas encore de compte ? S’inscrire" className="mt-3" onPress={() => router.replace('/inscription')} />
    </Screen>
  );
}
