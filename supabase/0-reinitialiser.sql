-- =====================================================================
-- HAPPY — RÉINITIALISATION COMPLÈTE
-- Supprime TOUTES les données, tous les comptes et toute la structure.
-- Ensuite, exécutez 1-schema.sql.
-- =====================================================================

-- 1. Tables et types
drop table if exists
  public.order_events, public.orders, public.claims, public.gifts, public.products,
  public.events, public.vendors, public.access_requests, public.extension_requests,
  public.contact_messages, public.notifications, public.profiles
cascade;
drop type if exists public.order_status cascade;
drop type if exists public.user_role cascade;

-- 2. Fonctions créées par l'app (les fonctions d'extensions sont conservées)
do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure as fn
    from pg_proc p
    where p.pronamespace = 'public'::regnamespace
      and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
  loop
    execute 'drop function if exists ' || r.fn || ' cascade';
  end loop;
end $$;

-- 3. Déclencheur d'inscription et règles des images
drop trigger if exists on_auth_user_created on auth.users;
drop policy if exists "images lecture" on storage.objects;
drop policy if exists "images upload" on storage.objects;
drop policy if exists "images suppression" on storage.objects;

-- 4. Tous les comptes utilisateurs
delete from auth.users;

-- Les images déjà envoyées restent dans Storage > gifts : videz le bucket depuis le tableau de bord si besoin.
