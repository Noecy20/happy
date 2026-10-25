-- =====================================================================
-- Happy v5.1 : cadeau commun (plusieurs participants) + numéro unique
-- À exécuter APRÈS 2-mise-a-jour-v5.sql (aucune perte de données).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Cadeau commun : plusieurs personnes peuvent participer au même cadeau
-- ---------------------------------------------------------------------
alter table public.gifts add column if not exists multiple boolean not null default false;

-- Un cadeau peut désormais avoir plusieurs réservations (une seule si multiple = false, vérifié dans claim_gift)
alter table public.claims drop constraint if exists claims_gift_id_key;
create index if not exists claims_gift_id_idx on public.claims (gift_id);

-- Notification au célébrant : compte les cadeaux pris, pas les participations
create or replace function public.on_claim() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_owner uuid; v_event uuid; v_taken int; v_total int; v_multiple boolean; v_count int;
begin
  select e.owner_id, e.id, g.multiple into v_owner, v_event, v_multiple from gifts g join events e on e.id = g.event_id where g.id = new.gift_id;
  select count(*) into v_total from gifts where event_id = v_event;
  select count(distinct c.gift_id) into v_taken from claims c join gifts g on g.id = c.gift_id where g.event_id = v_event;
  if v_multiple then
    select count(*) into v_count from claims where gift_id = new.gift_id;
    insert into notifications(user_id, title, body, kind)
    values (v_owner, 'Une personne participe à un cadeau commun',
            format('%s participant(s) à ce cadeau. Qui ? Réponse après votre anniversaire.', v_count), 'claim');
  else
    insert into notifications(user_id, title, body, kind)
    values (v_owner, 'Un cadeau vient d''être pris en charge',
            format('%s sur %s cadeaux sont réservés. Qui ? Réponse après votre anniversaire.', v_taken, v_total), 'claim');
  end if;
  return new;
end $$;

-- Page publique : un cadeau commun reste disponible, avec le nombre de participants
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
        'multiple', g.multiple,
        'participants', (select count(*) from claims c where c.gift_id = g.id),
        'claimed', not g.multiple and exists(select 1 from claims c where c.gift_id = g.id)
      ) order by g.position, g.created_at)
      from gifts g left join vendors v on v.id = g.vendor_id left join products pr on pr.id = g.product_id
      where g.event_id = e.id
    ), '[]'::json)
  ) into r;
  return r;
end $$;

-- Réservation : cadeau simple = une seule personne ; cadeau commun = plusieurs, une seule commande partagée
create or replace function public.claim_gift(
  p_token text, p_gift_id uuid, p_name text, p_phone text,
  p_email text default null, p_message text default null,
  p_address text default null, p_delivery_date date default null, p_wrap boolean default false
) returns json
language plpgsql volatile security definer set search_path = public as $$
declare e events; g gifts; pr products; v_claim uuid; v_code text; v_wrap boolean;
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

  -- Cadeau commun déjà commandé : la participation rejoint la commande existante
  if g.multiple then
    select o.tracking_code into v_code from orders o join claims c on c.id = o.claim_id where c.gift_id = g.id limit 1;
  end if;

  if v_code is null and g.product_id is not null then
    select * into pr from products where id = g.product_id;
    if pr.stock is not null and pr.stock < 1 then raise exception 'Cet article est en rupture de stock chez la boutique.'; end if;
  end if;

  insert into claims(gift_id, friend_name, friend_phone, friend_email, friend_message)
  values (g.id, trim(p_name), trim(p_phone), nullif(trim(p_email), ''), nullif(trim(p_message), ''))
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

-- Espace célébrant : une ligne par cadeau, tous les participants révélés après l'anniversaire
create or replace function public.get_my_gifts() returns json
language plpgsql stable security definer set search_path = public as $$
declare e events; v_reveal boolean;
begin
  select * into e from events where owner_id = auth.uid();
  if not found then return json_build_object('revealed', false, 'gifts', '[]'::json); end if;
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
    ), '[]'::json));
end $$;

-- ---------------------------------------------------------------------
-- 2. Un numéro de téléphone = un seul compte
-- ---------------------------------------------------------------------
-- Chiffres seuls, sans l'indicatif 225 : « +225 07 04 88 56 86 » = « 0704885686 »
create or replace function public.normalize_phone(p text) returns text
language sql immutable as $$
  select case when d like '225%' and length(d) > 10 then substr(d, 4) else d end
  from (select regexp_replace(coalesce(p, ''), '\D', '', 'g') as d) x
$$;

-- Vérifié par la page d'inscription avant de créer le compte
create or replace function public.phone_available(p_phone text) returns boolean
language sql stable security definer set search_path = public as $$
  select normalize_phone(p_phone) = ''
      or not exists(select 1 from profiles where normalize_phone(phone) = normalize_phone(p_phone))
$$;
grant execute on function public.phone_available(text) to anon, authenticated;

-- Garantie côté base : l'inscription est refusée si le numéro existe déjà
-- (les doublons déjà présents ne sont pas touchés)
create or replace function public.guard_unique_phone() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if normalize_phone(new.phone) <> '' and exists(
    select 1 from profiles where id <> new.id and normalize_phone(phone) = normalize_phone(new.phone)
  ) then
    raise exception 'Ce numéro a déjà un compte.';
  end if;
  return new;
end $$;
drop trigger if exists trg_unique_phone on public.profiles;
create trigger trg_unique_phone before insert or update of phone on public.profiles
for each row execute function public.guard_unique_phone();

-- Pour lister les doublons existants :
--   select normalize_phone(phone) as numero, count(*), string_agg(coalesce(email, '(sans email)'), ' | ')
--   from public.profiles where coalesce(phone, '') <> '' group by 1 having count(*) > 1;
