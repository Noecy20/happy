/**
 * Types TypeScript des données manipulées.
 * Ils reflètent les colonnes des tables SQL (supabase/1-schema.sql + 2-mise-a-jour-v5.sql)
 * et le JSON renvoyé par les fonctions RPC.
 */

export type Role = 'admin' | 'celebrant' | 'vendor';

export type Profile = {
  id: string; full_name: string | null; phone: string | null; email: string | null;
  role: Role; access_expires_at: string | null; created_at: string;
};

export type EventRow = {
  id: string; owner_id: string; title: string | null; celebrant_name: string; birth_date: string; birthday_date: string;
  message: string | null; dress_code: string | null; theme_color: string | null;
  share_token: string; invite_token: string; published: boolean;
  has_party: boolean; party_date: string | null; party_time: string | null; party_place: string | null; party_details: string | null;
};

/** Variante d'article : { name: 'Taille', values: ['S','M','L'] } */
export type ProductOption = { name: string; values: string[] };

/** Cadeau tel que renvoyé par get_public_event (ami) ou get_my_gifts (célébrant). */
export type GiftItem = {
  id: string; name: string; description?: string | null; image_url?: string | null; price?: number | null;
  product_link?: string | null; external_contact?: string | null; claimed: boolean;
  vendor?: { id?: string; name: string; address?: string | null; phone?: string | null } | null;
  wrap_available?: boolean; wrap_price?: number | null; stock?: number | null;
  options?: Record<string, string>; vendor_name?: string | null; vendor_id?: string | null; product_id?: string | null;
  friend_name?: string | null; friend_message?: string | null;
};

export type PublicEvent = {
  status: 'ok' | 'expired' | 'not_found'; closed?: boolean; invited?: boolean; celebrant_name?: string;
  event?: {
    id: string; title: string | null; celebrant_name: string; birthday_date: string; age: number;
    message?: string | null; dress_code?: string | null; theme_color?: string | null;
    has_party: boolean; party_date?: string | null; party_time?: string | null; party_place?: string | null; party_details?: string | null;
  };
  gifts?: GiftItem[];
};

export type Vendor = {
  id: string; owner_id?: string | null; name: string; category?: string | null; description?: string | null;
  phone?: string | null; email?: string | null; address?: string | null; active?: boolean; status?: string;
  logo_url?: string | null; cover_url?: string | null; payment_method?: string | null; payment_ref?: string | null; proof_url?: string | null;
};

export type Product = {
  id: string; vendor_id: string; name: string; description?: string | null; price?: number | null; image_url?: string | null;
  active: boolean; category_id?: string | null; options: ProductOption[]; stock: number | null;
  wrap_available: boolean; wrap_price?: number | null;
};

export type Category = { id: string; name: string };

/** Commande vue par la boutique (get_vendor_orders). */
export type VendorOrder = {
  id: string; tracking_code: string; status: string; paid: boolean; vendor_note?: string | null;
  item_name: string; item_image?: string | null; unit_price?: number | null; quantity: number; options?: Record<string, string>;
  buyer_name: string; buyer_phone: string; buyer_email?: string | null; recipient_name?: string | null;
  delivery_date?: string | null; delivery_address?: string | null; is_gift: boolean; is_surprise: boolean;
  gift_wrap: boolean; wrap_price?: number | null; gift_message?: string | null;
  event_id?: string | null; celebrant_name?: string | null; birthday_date?: string | null; created_at: string;
};

export type Notif = { id: string; user_id: string; title: string; body?: string | null; kind?: string | null; read: boolean; created_at: string };

export type Rsvp = { id: string; name: string; phone?: string | null; attending: 'oui' | 'peut-etre' | 'non'; guests: number; message?: string | null; created_at: string };

export type AccessRequest = {
  id: string; user_id: string; kind: 'acces' | 'prolongation'; days_requested: number; message?: string | null; status: string; created_at: string;
  start_date?: string | null; end_date?: string | null; amount?: number | null; payment_method?: string | null; payment_ref?: string | null; proof_url?: string | null;
};

export type Settings = {
  access_price_per_day: number; access_min_price: number; vendor_fee: number; vendor_fee_label: string;
  wave_number?: string | null; orange_number?: string | null; mtn_number?: string | null; moov_number?: string | null;
  payment_instructions?: string | null;
};
