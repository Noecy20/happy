/**
 * Client Supabase de l'application mobile.
 *
 * - Même projet, mêmes tables, mêmes fonctions RPC que le site web.
 * - La session (jeton de connexion) est conservée dans AsyncStorage : elle survit à la fermeture de l'app.
 *   (expo-secure-store limite chaque valeur à 2 Ko, or une session Supabase dépasse souvent cette taille.)
 * - `detectSessionInUrl: false` : sur mobile, il n'y a pas d'URL de navigateur à analyser.
 * - `autoRefreshToken` : on ne rafraîchit le jeton que lorsque l'app est au premier plan (voir AppState).
 */
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './config';

export const supabase = createClient(SUPABASE_URL || 'https://invalid.supabase.co', SUPABASE_ANON_KEY || 'anon', {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Recommandation Supabase pour React Native : rafraîchir le jeton seulement quand l'app est active.
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}

/** Message lisible à partir d'une erreur Supabase ou JS. */
export const errMsg = (e: any) => String(e?.message || e || 'Une erreur est survenue.');
