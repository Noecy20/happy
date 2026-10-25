/**
 * Liste publique des boutiques actives (validées par l'admin et en ligne).
 * Chaque carte : couverture ou fond décoratif festif propre à la boutique, logo, catégorie,
 * quartier, nombre d'articles. Filtres par catégorie + recherche.
 * La règle RLS « boutique lecture » ne renvoie de toute façon que les boutiques actives aux visiteurs.
 */
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { ChevronRight, MapPin, Search, Store } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Decor, seedOf } from '@/components/Illustrations';
import TopBar from '@/components/TopBar';
import { Empty, Loading, Pills, Screen, Title, Txt } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { colors, shadow } from '@/lib/theme';
import type { Vendor } from '@/lib/types';

export default function Shops() {
  const [vendors, setVendors] = useState<Vendor[] | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [cat, setCat] = useState('');
  const [q, setQ] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [v, p] = await Promise.all([
      supabase.from('vendors').select('id,name,category,description,address,logo_url,cover_url').eq('active', true).order('name'),
      supabase.from('products').select('vendor_id').eq('active', true),
    ]);
    setVendors((v.data as Vendor[]) || []);
    const c: Record<string, number> = {};
    (p.data || []).forEach((x: any) => { c[x.vendor_id] = (c[x.vendor_id] || 0) + 1; });
    setCounts(c);
  }, []);
  useEffect(() => { load(); }, [load]);

  const cats = useMemo(() => [...new Set((vendors || []).map((v) => v.category).filter(Boolean))] as string[], [vendors]);
  const list = (vendors || []).filter((v) => (!cat || v.category === cat) && (!q || `${v.name} ${v.category} ${v.address}`.toLowerCase().includes(q.toLowerCase())));

  return (
    <Screen onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} refreshing={refreshing}>
      <TopBar />
      <Title className="text-[42px] leading-[44px]">Les boutiques Happy</Title>
      <Txt className="mt-3 leading-[22px] text-ink/65">Commandez directement un cadeau, faites-le emballer et livrer, en surprise si vous le souhaitez.</Txt>

      <View className="my-5 min-h-[48px] flex-row items-center rounded-2xl border border-ink/10 bg-white px-3">
        <Search size={16} color={colors.muted} />
        <TextInput value={q} onChangeText={setQ} placeholder="Boutique, quartier…" placeholderTextColor="rgba(30,20,40,0.35)"
          className="ml-2 flex-1 py-3 font-body text-[15px] text-ink" accessibilityLabel="Rechercher une boutique" />
      </View>
      {cats.length > 0 && (
        <Pills className="mb-5" value={cat} onChange={setCat} options={[{ key: '', label: 'Toutes' }, ...cats.map((c) => ({ key: c, label: c }))]} />
      )}

      {vendors === null ? <Loading /> : list.length === 0 ? <Empty icon={Store} text="Aucune boutique pour le moment." /> : list.map((v) => (
        <Pressable key={v.id} onPress={() => router.push(`/boutiques/${v.id}`)} accessibilityRole="link"
          className="mb-5 overflow-hidden rounded-[24px] border border-ink/[0.07] bg-white" style={shadow.sm}>
          <View className="h-28 overflow-hidden bg-plum">
            {v.cover_url ? <Image source={{ uri: v.cover_url }} style={{ width: '100%', height: '100%' }} contentFit="cover" /> : <Decor seed={seedOf(v.id)} opacity={0.55} />}
          </View>
          <View className="px-5 pb-5">
            <View className="-mt-8 flex-row items-end">
              <View className="h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border-4 border-white bg-lilac" style={shadow.sm}>
                {v.logo_url ? <Image source={{ uri: v.logo_url }} style={{ width: '100%', height: '100%' }} /> : <Text className="font-display text-[30px] text-candy">{v.name[0]?.toUpperCase()}</Text>}
              </View>
              <View className="ml-3 flex-1 pb-1">
                <Text className="font-display text-[24px] leading-[26px] text-ink" numberOfLines={1}>{v.name}</Text>
                {!!v.category && <Text className="font-semi text-[13px] text-ink/55">{v.category}</Text>}
              </View>
            </View>
            {!!v.description && <Text className="mt-3 font-body text-[14px] leading-[20px] text-ink/65" numberOfLines={2}>{v.description}</Text>}
            <View className="mt-4 flex-row items-center justify-between">
              <View className="flex-1 flex-row items-center">
                {v.address ? <MapPin size={14} color={colors.muted} /> : <Store size={14} color={colors.muted} />}
                <Text className="ml-1.5 flex-1 font-body text-[13px] text-ink/55" numberOfLines={1}>{v.address || 'Boutique'}</Text>
              </View>
              <Text className="font-bold2 text-[13px] text-candy">{counts[v.id] || 0} article{(counts[v.id] || 0) > 1 ? 's' : ''}</Text>
              <ChevronRight size={16} color={colors.candy} />
            </View>
          </View>
        </Pressable>
      ))}
    </Screen>
  );
}
