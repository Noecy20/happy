import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { phoneToEmail } from '@/lib/utils';

// L'admin crée directement une boutique (compte + vitrine validée)
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non connecté.' }, { status: 401 });
  const admin = createAdminClient();
  const { data: me } = await admin.from('profiles').select('role').eq('id', user.id).single();
  if (me?.role !== 'admin') return NextResponse.json({ error: 'Accès refusé : ce compte n’est pas administrateur.' }, { status: 403 });

  const b = await req.json();
  if (!b.shop_name || !b.phone || !b.password) return NextResponse.json({ error: 'Nom, téléphone et mot de passe sont obligatoires.' }, { status: 400 });
  const { data: free } = await admin.rpc('phone_available', { p_phone: b.phone });
  if (free === false) return NextResponse.json({ error: 'Ce numéro a déjà un compte.' }, { status: 400 });
  const { data: created, error } = await admin.auth.admin.createUser({
    email: b.email?.trim() || phoneToEmail(b.phone),
    password: b.password,
    email_confirm: true,
    user_metadata: {
      account_type: 'vendor', full_name: b.full_name || b.shop_name, phone: b.phone,
      shop_name: b.shop_name, category: b.category || null, address: b.address || null, description: b.description || null,
    },
  });
  if (error) return NextResponse.json({ error: error.message.includes('registered') ? 'Un compte existe déjà avec ce téléphone ou cet email.' : error.message }, { status: 400 });
  // Créée par l'admin : vitrine validée et en ligne immédiatement
  await admin.from('vendors').update({ status: 'validee', active: true }).eq('owner_id', created.user!.id);
  return NextResponse.json({ ok: true });
}
