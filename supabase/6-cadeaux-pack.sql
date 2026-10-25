-- =====================================================================
-- Happy v5.4 : cadeaux en pack (2 ou 3 articles réservés ensemble)
-- À exécuter APRÈS 5-photo-celebrant.sql (aucune perte de données).
-- items = [{"name": "Parfum", "image_url": "…", "price": 38000}, …]
-- Le cadeau garde son nom (« Parfum + Montre »), son prix total et la photo du 1er article.
-- =====================================================================

alter table public.gifts add column if not exists items jsonb not null default '[]'::jsonb;

-- Page publique : avec les articles du pack
create or replace function public.get_public_event(p_token text) returns json
language plpgsql stable security definer set search_path = public as $$
declare e events; r json; v_invited boolean;
begin
  select * into e from events where (share_token = p_token or invite_token = p_token) and published;
  if not found then return json_build_object('status', 'not_found'); end if;
  if not has_access(e.owner_id) then return json_build_object('status', 'expired', 'celebrant_name', e.celebrant_name); end if;
  v_invited := e.has_party and e.invite_token = p_token;
  select json_build_object(
    'status', 'ok',
    'closed', current_date > e.birthday_date,
    'invited', v_invited,
    'event', json_build_object(
      'id', e.id, 'title', e.title, 'celebrant_name', e.celebrant_name, 'birthday_date', e.birthday_date,
      'age', extract(year from e.birthday_date)::int - extract(year from e.birth_date)::int,
      'message', e.message, 'dress_code', e.dress_code, 'theme_color', e.theme_color,
      'has_party', v_invited,
      'party_date', case when v_invited then e.party_date end, 'party_time', case when v_invited then e.party_time end,
      'party_place', case when v_invited then e.party_place end, 'party_details', case when v_invited then e.party_details end),
    'gifts', coalesce((
      select json_agg(json_build_object(
        'id', g.id, 'name', g.name, 'description', g.description, 'image_url', g.image_url, 'price', g.price,
        'product_link', g.product_link, 'external_contact', g.external_contact, 'options', g.options,
        'vendor', case when v.id is null then null else json_build_object('id', v.id, 'name', v.name, 'address', v.address, 'phone', v.phone) end,
        'wrap_available', coalesce(pr.wrap_available, false), 'wrap_price', pr.wrap_price, 'stock', pr.stock,
        'multiple', g.multiple, 'items', g.items,
        'participants', (select count(*) from claims c where c.gift_id = g.id),
        'claimed', not g.multiple and exists(select 1 from claims c where c.gift_id = g.id)
      ) order by g.position, g.created_at)
      from gifts g left join vendors v on v.id = g.vendor_id left join products pr on pr.id = g.product_id
      where g.event_id = e.id
    ), '[]'::json)
  ) into r;
  return r;
end $$;

-- Espace célébrant : avec les articles du pack
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
        'multiple', g.multiple, 'items', g.items,
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
