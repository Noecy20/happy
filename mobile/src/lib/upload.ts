/**
 * Choix d'une photo (galerie) et envoi dans le bucket Supabase `gifts`.
 * Règle de sécurité du bucket : le chemin doit commencer par l'identifiant de l'utilisateur
 * connecté → `<uid>/<préfixe>-<horodatage>.jpg`.
 */
import * as ImagePicker from 'expo-image-picker';
import { supabase } from './supabase';

/** Ouvre la galerie. Renvoie l'URI locale de l'image choisie, ou null si annulé. */
export async function pickImage(aspect?: [number, number]): Promise<string | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) throw new Error('Autorisez l’accès aux photos dans les réglages du téléphone.');
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect,
    quality: 0.7, // compresse pour rester sous 5 Mo
  });
  if (res.canceled || !res.assets?.[0]) return null;
  return res.assets[0].uri;
}

/** Envoie une image locale dans `gifts/<uid>/...` et renvoie son URL publique. */
export async function uploadImage(localUri: string, prefix = 'photo'): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Connectez-vous pour envoyer une image.');
  // fetch() sait lire une URI locale ; on envoie les octets bruts à Supabase Storage.
  const bytes = await (await fetch(localUri)).arrayBuffer();
  if (bytes.byteLength > 5 * 1024 * 1024) throw new Error('Image trop lourde : 5 Mo maximum.');
  const ext = (localUri.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z]/g, '') || 'jpg';
  const path = `${user.id}/${prefix}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from('gifts').upload(path, bytes, {
    contentType: ext === 'png' ? 'image/png' : 'image/jpeg',
  });
  if (error) throw new Error("L'image n'a pas été envoyée : " + error.message);
  return supabase.storage.from('gifts').getPublicUrl(path).data.publicUrl;
}

/** Raccourci : choisir puis envoyer. Renvoie null si l'utilisateur annule. */
export async function pickAndUpload(prefix = 'photo', aspect?: [number, number]) {
  const uri = await pickImage(aspect);
  return uri ? uploadImage(uri, prefix) : null;
}
