-- =====================================================================
-- Happy v5.5 : invitation enrichie, déroulé de la soirée, réponses aux invités,
--              annulation d'une participation à un cadeau commun
-- À exécuter APRÈS 6-cadeaux-pack.sql (aucune perte de données).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Invitation : photos du thème, couleurs officielles, déroulé, à ne pas oublier
-- ---------------------------------------------------------------------
alter table public.events
  add column if not exists theme_images text[] not null default '{}',   -- jusqu'à 8 photos d'exemple du thème
  add column if not exists palette text[] not null default '{}',        -- couleurs officielles (#hex), jusqu'à 6
  add column if not exists program jsonb not null default '[]'::jsonb,  -- [{"time","label","tagline","title","text","image_url","dress","icon"}]
  add column if not exists reminders text[] not null default '{}';      -- « À ne pas oublier », jusqu'à 4

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
      'party_place', case when v_invited then e.party_place end, 'party_details', case when v_invited then e.party_details end,
      'theme_images', case when v_invited then e.theme_images else '{}' end,
      'palette', case when v_invited then e.palette else '{}' end,
      'program', case when v_invited then e.program else '[]'::jsonb end,
      'reminders', case when v_invited then e.reminders else '{}' end),
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

-- ---------------------------------------------------------------------
-- 2. Réponses aux invités : la personne fêtée peut répondre (ex. « une seule personne par invitation »)
-- ---------------------------------------------------------------------
alter table public.rsvps
  add column if not exists host_reply text,
  add column if not exists host_reply_at timestamptz;

-- rsvp renvoie désormais l'identifiant de la réponse (l'invité le garde pour lire la réponse)
drop function if exists public.rsvp(text, text, text, text, int, text);
create or replace function public.rsvp(p_token text, p_name text, p_phone text, p_attending text, p_guests int default 1, p_message text default null)
returns uuid
language plpgsql volatile security definer set search_path = public as $$
declare e events; v_id uuid;
begin
  select * into e from events where invite_token = p_token and published and has_party;
  if not found then raise exception 'Invitation introuvable.'; end if;
  if coalesce(trim(p_name), '') = '' then raise exception 'Indiquez votre nom.'; end if;
  if p_attending not in ('oui', 'peut-etre', 'non') then raise exception 'Réponse invalide.'; end if;
  insert into rsvps(event_id, name, phone, attending, guests, message)
  values (e.id, trim(p_name), nullif(trim(p_phone), ''), p_attending,
          case when p_attending = 'non' then 0 else greatest(1, least(coalesce(p_guests, 1), 20)) end, nullif(trim(p_message), ''))
  returning id into v_id;
  insert into notifications(user_id, title, body, kind)
  values (e.owner_id, 'Nouvelle réponse à votre invitation',
          trim(p_name) || case p_attending when 'oui' then ' sera là' when 'peut-etre' then ' viendra peut-être' else ' ne pourra pas venir' end
          || case when p_attending <> 'non' and coalesce(p_guests, 1) > 1 then ' (' || p_guests || ' personnes)' else '' end || '.', 'rsvp');
  return v_id;
end $$;

-- La personne fêtée répond à un invité
create or replace function public.reply_rsvp(p_rsvp uuid, p_reply text) returns void
language plpgsql volatile security definer set search_path = public as $$
begin
  update rsvps r set host_reply = nullif(trim(p_reply), ''), host_reply_at = now()
   where r.id = p_rsvp and exists(select 1 from events e where e.id = r.event_id and e.owner_id = auth.uid());
  if not found then raise exception 'Réponse introuvable.'; end if;
end $$;

-- L'invité relit sa réponse et celle de la personne fêtée (avec le lien invités + l'identifiant gardé)
create or replace function public.get_my_rsvp(p_token text, p_rsvp uuid) returns json
language sql stable security definer set search_path = public as $$
  select json_build_object('attending', r.attending, 'guests', r.guests, 'host_reply', r.host_reply, 'host_reply_at', r.host_reply_at)
  from rsvps r join events e on e.id = r.event_id
  where r.id = p_rsvp and e.invite_token = p_token
$$;

-- ---------------------------------------------------------------------
-- 3. Réservation : renvoie aussi l'identifiant de la participation
-- ---------------------------------------------------------------------
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

  if v_code is not null then return json_build_object('tracking_code', v_code, 'claim_id', v_claim); end if;

  v_wrap := coalesce(p_wrap, false) and coalesce(pr.wrap_available, false);
  insert into orders(claim_id, event_id, vendor_id, product_id, item_name, item_image, unit_price, options,
                     buyer_name, buyer_phone, buyer_email, recipient_name, delivery_date, delivery_address,
                     is_gift, is_surprise, gift_wrap, wrap_price)
  values (v_claim, e.id, g.vendor_id, g.product_id, g.name, g.image_url, g.price, g.options,
          trim(p_name), trim(p_phone), nullif(trim(p_email), ''), e.celebrant_name, p_delivery_date, nullif(trim(p_address), ''),
          true, true, v_wrap, case when v_wrap then pr.wrap_price end)
  returning tracking_code into v_code;
  return json_build_object('tracking_code', v_code, 'claim_id', v_claim);
end $$;

-- ---------------------------------------------------------------------
-- 4. Annuler sa participation à un cadeau commun (jamais pour un cadeau simple)
-- ---------------------------------------------------------------------
create or replace function public.cancel_participation(p_token text, p_claim uuid, p_phone text) returns void
language plpgsql volatile security definer set search_path = public as $$
declare e events; c claims; g gifts; o orders; c2 claims; v_left int;
begin
  select * into e from events where (share_token = p_token or invite_token = p_token) and published;
  if not found then raise exception 'Liste introuvable.'; end if;
  if current_date > e.birthday_date then raise exception 'L''anniversaire est passé : la participation ne peut plus être annulée.'; end if;
  select * into c from claims where id = p_claim;
  if not found then raise exception 'Participation introuvable.'; end if;
  select * into g from gifts where id = c.gift_id and event_id = e.id for update;
  if not found then raise exception 'Participation introuvable.'; end if;
  if not g.multiple then raise exception 'Seule une participation à un cadeau commun peut être annulée.'; end if;
  if normalize_phone(c.friend_phone) <> normalize_phone(p_phone) then raise exception 'Ce numéro ne correspond pas à cette participation.'; end if;

  -- La commande du cadeau commun est rattachée à la 1re participation : on la confie à un autre participant
  select * into o from orders where claim_id = c.id;
  if found then
    select * into c2 from claims where gift_id = g.id and id <> c.id order by created_at limit 1;
    if found then
      update orders set claim_id = c2.id, buyer_name = c2.friend_name, buyer_phone = c2.friend_phone, buyer_email = c2.friend_email, updated_at = now()
       where id = o.id;
    elsif o.status not in ('recue', 'annulee') then
      raise exception 'La boutique prépare déjà ce cadeau : contactez-la pour annuler.';
    end if;
  end if;

  delete from claims where id = c.id;  -- supprime aussi la commande si c'était le dernier participant
  select count(*) into v_left from claims where gift_id = g.id;
  insert into notifications(user_id, title, body, kind)
  values (e.owner_id, 'Une participation a été annulée',
          format('%s participant(s) restant(s) pour ce cadeau commun.', v_left), 'claim');
end $$;
