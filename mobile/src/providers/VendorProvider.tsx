/**
 * Données de l'espace boutique, partagées entre ses onglets (Commandes, Articles, Ma vitrine, Notifications).
 * - get_vendor_orders() : la boutique + toutes ses commandes (avec l'anniversaire associé).
 *   Fonction SQL « security definer » : la boutique ne voit QUE ses commandes.
 * - products / product_categories : ses articles et catégories (RLS « article gestion »).
 * Une nouvelle notification (nouvelle commande, validation…) recharge tout.
 */
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { useNotifications } from '@/components/NotificationsList';
import { supabase } from '@/lib/supabase';
import type { Category, Product, Vendor, VendorOrder } from '@/lib/types';
import { useAuth } from './AuthProvider';
import { useFx } from './FxProvider';

type Ctx = {
  loading: boolean; vendor: Vendor | null; orders: VendorOrder[]; setOrders: (fn: (o: VendorOrder[]) => VendorOrder[]) => void;
  products: Product[]; categories: Category[]; reload: () => Promise<void>;
  notifs: ReturnType<typeof useNotifications>;
};
const VendorContext = createContext<Ctx | null>(null);
export const useVendor = () => useContext(VendorContext)!;

export function VendorProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const fx = useFx();
  const [loading, setLoading] = useState(true);
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [orders, setOrders] = useState<VendorOrder[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const reload = useCallback(async () => {
    const { data } = await supabase.rpc('get_vendor_orders');
    setVendor(data?.vendor || null);
    setOrders(data?.orders || []);
    if (data?.vendor) {
      const [{ data: ps }, { data: cs }] = await Promise.all([
        supabase.from('products').select('*').eq('vendor_id', data.vendor.id).order('created_at', { ascending: false }),
        supabase.from('product_categories').select('id,name').eq('vendor_id', data.vendor.id).order('name'),
      ]);
      setProducts((ps as Product[]) || []);
      setCategories((cs as Category[]) || []);
    }
    setLoading(false);
  }, []);
  useEffect(() => { reload(); }, [reload]);

  const notifs = useNotifications(profile?.id, (n) => { fx.toast(n.title); reload(); });

  return (
    <VendorContext.Provider value={{ loading, vendor, orders, setOrders, products, categories, reload, notifs }}>
      {children}
    </VendorContext.Provider>
  );
}
