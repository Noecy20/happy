-- =====================================================================
-- Happy v5.2 : livre d'or
-- Chaque ami écrit une carte (message + jusqu'à 3 images) en réservant un cadeau.
-- Le célébrant ouvre son livre d'or le lendemain de l'anniversaire et peut le télécharger.
-- À exécuter APRÈS 3-cadeau-commun-telephone.sql (aucune perte de données).
-- =====================================================================

alter table public.claims add column if not exists friend_images text[] not null default '{}';

-- ---------------------------------------------------------------------
-- Images des cartes : un ami sans compte peut envoyer ses images dans gifts/livre-dor/
-- ---------------------------------------------------------------------
update storage.buckets
   set file_size_limit = 5 * 1024 * 1024,
       allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif']
 where id = 'gifts';

drop policy if exists "livre dor upload" on storage.objects;
create policy "livre dor upload" on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'gifts' and (storage.foldername(name))[1] = 'livre-dor');

-- ---------------------------------------------------------------------
-- Réservation : la carte du livre d'or accepte jusqu'à 3 images
-- ---------------------------------------------------------------------
drop function if exists public.claim_gift(text, uuid, text, text, text, text, text, date, boolean);
create or replace function public.claim_gift(
  p_token text, p_gift_id uuid, p_name text, p_phone text,
  p_email text default null, p_message text default null,
  p_address text default null, p_delivery_date date default null, p_wrap boolean default false,
  p_images text[] default null
) returns json
language plpgsql volatile security definer set search_path = public as $$
declare e events; g gifts; pr products; v_claim uuid; v_code text; v_wrap boolean; v_images text[];
begin
  select * into e from events where (share_token = p_token or invite_token = p_token) and published;
  if not found then raise exception 'Liste introuvable.'; end if;
  if not has_access(e.owner_id) then raise exception 'Ce lien a expiré.'; end if;
  if current_date > e.birthday_date then raise exception 'L''anniversaire est passé : la liste est close.'; end if;
  -- Verrou sur le cadeau : deux personnes ne peuvent pas prendre un cadeau simple en même temps
  select * into g from gifts where id = p_gift_id and event_id = e.id for update;
  if not found then raise exception 'Cadeau introuvable.'; end if;
  if coalesce(trim(p_name), '') = '' or coalesce(trim(p_phone), '') = '' then
    raise exception 'Le nom et le téléphone sont obligatoires.';
  end if;
  if not g.multiple and exists(select 1 from claims where gift_id = g.id) then
    raise exception 'Quelqu''un vient de prendre ce cadeau. Choisissez-en un autre.';
  end if;
  if g.multiple and exists(select 1 from claims where gift_id = g.id
                           and regexp_replace(friend_phone, '\D', '', 'g') = regexp_replace(p_phone, '\D', '', 'g')) then
    raise exception 'Vous participez déjà à ce cadeau.';
  end if;

  -- Images : 3 au maximum, uniquement celles envoyées dans le dossier du livre d'or
  select coalesce(array_agg(u), '{}') into v_images
  from (select u from unnest(coalesce(p_images, '{}')) u
        where u like '%/storage/v1/object/public/gifts/livre-dor/%' limit 3) x;

  -- Cadeau commun déjà commandé : la participation rejoint la commande existante
  if g.multiple then
    select o.tracking_code into v_code from orders o join claims c on c.id = o.claim_id where c.gift_id = g.id limit 1;
  end if;

  if v_code is null and g.product_id is not null then
    select * into pr from products where id = g.product_id;
    if pr.stock is not null and pr.stock < 1 then raise exception 'Cet article est en rupture de stock chez la boutique.'; end if;
  end if;

  insert into claims(gift_id, friend_name, friend_phone, friend_email, friend_message, friend_images)
  values (g.id, trim(p_name), trim(p_phone), nullif(trim(p_email), ''), nullif(trim(p_message), ''), v_images)
  returning id into v_claim;

  if v_code is not null then return json_build_object('tracking_code', v_code); end if;

  v_wrap := coalesce(p_wrap, false) and coalesce(pr.wrap_available, false);
  insert into orders(claim_id, event_id, vendor_id, product_id, item_name, item_image, unit_price, options,
                     buyer_name, buyer_phone, buyer_email, recipient_name, delivery_date, delivery_address,
                     is_gift, is_surprise, gift_wrap, wrap_price)
  values (v_claim, e.id, g.vendor_id, g.product_id, g.name, g.image_url, g.price, g.options,
          trim(p_name), trim(p_phone), nullif(trim(p_email), ''), e.celebrant_name, p_delivery_date, nullif(trim(p_address), ''),
          true, true, v_wrap, case when v_wrap then pr.wrap_price end)
  returning tracking_code into v_code;
  return json_build_object('tracking_code', v_code);
end $$;

-- ---------------------------------------------------------------------
-- Espace célébrant : liste + livre d'or (cartes révélées après l'anniversaire)
-- ---------------------------------------------------------------------
create or replace function public.get_my_gifts() returns json
language plpgsql stable security definer set search_path = public as $$
declare e events; v_reveal boolean;
begin
  select * into e from events where owner_id = auth.uid();
  if not found then return json_build_object('revealed', false, 'gifts', '[]'::json, 'guestbook', '[]'::json, 'guestbook_count', 0); end if;
  v_reveal := current_date > e.birthday_date;
  return json_build_object(
    'revealed', v_reveal,
    'gifts', coalesce((
      select json_agg(json_build_object(
        'id', g.id, 'name', g.name, 'description', g.description, 'image_url', g.image_url, 'price', g.price,
        'vendor_id', g.vendor_id, 'product_id', g.product_id, 'vendor_name', v.name, 'options', g.options,
        'external_contact', g.external_contact, 'product_link', g.product_link,
        'wrap_available', coalesce(pr.wrap_available, false), 'stock', pr.stock,
        'multiple', g.multiple,
        'participants', cl.n,
        'claimed', cl.n > 0,
        'friend_name', case when v_reveal then cl.names end,
        'friend_message', case when v_reveal then cl.messages end
      ) order by g.position, g.created_at)
      from gifts g
      left join vendors v on v.id = g.vendor_id
      left join products pr on pr.id = g.product_id
      left join lateral (
        select count(*)::int as n,
               string_agg(c.friend_name, ', ' order by c.created_at) as names,
               string_agg(c.friend_message, ' · ' order by c.created_at) as messages
        from claims c where c.gift_id = g.id
      ) cl on true
      where g.event_id = e.id
    ), '[]'::json),
    -- Une carte par message ou image, dans l'ordre d'arrivée ; contenu caché jusqu'au lendemain de l'anniversaire
    'guestbook_count', (
      select count(*) from claims c join gifts g on g.id = c.gift_id
      where g.event_id = e.id and (c.friend_message is not null or cardinality(c.friend_images) > 0)),
    'guestbook', case when v_reveal then coalesce((
      select json_agg(json_build_object(
        'id', c.id, 'name', c.friend_name, 'message', c.friend_message, 'images', c.friend_images,
        'gift', g.name, 'created_at', c.created_at
      ) order by c.created_at)
      from claims c join gifts g on g.id = c.gift_id
      where g.event_id = e.id and (c.friend_message is not null or cardinality(c.friend_images) > 0)
    ), '[]'::json) else '[]'::json end
  );
end $$;
