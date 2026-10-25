-- =====================================================================
-- HAPPY — MISE À JOUR v5 (à exécuter après 1-schema.sql, sans perte de données)
-- Paiements et validations, stock, variantes, catégories, emballage,
-- deux liens de partage, confirmations de présence, notifications push.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Réglages (tarifs et numéros de paiement), modifiables par l'admin
-- ---------------------------------------------------------------------
create table if not exists public.settings (
  id int primary key default 1 check (id = 1),
  access_price_per_day numeric(12, 0) not null default 300,
  access_min_price numeric(12, 0) not null default 2000,
  vendor_fee numeric(12, 0) not null default 10000,
  vendor_fee_label text not null default 'Frais d''ouverture de boutique',
  wave_number text,
  orange_number text,
  mtn_number text,
  moov_number text,
  payment_instructions text,
  updated_at timestamptz not null default now()
);
insert into public.settings (id) values (1) on conflict do nothing;
alter table public.settings enable row level security;
drop policy if exists "reglages lecture" on public.settings;
create policy "reglages lecture" on public.settings for select using (true);
drop policy if exists "reglages admin" on public.settings;
create policy "reglages admin" on public.settings for update using (public.is_admin());

-- ---------------------------------------------------------------------
-- 2. Demande d'accès : période choisie + paiement
-- ---------------------------------------------------------------------
alter table public.access_requests
  add column if not exists start_date date,
  add column if not exists end_date date,
  add column if not exists amount numeric(12, 0),
  add column if not exists payment_method text,
  add column if not exists payment_ref text,
  add column if not exists proof_url text;

create or replace function public.admin_grant_until(p_user uuid, p_until date) returns timestamptz
language plpgsql volatile security definer set search_path = public as $$
declare v_exp timestamptz;
begin
  if not is_admin() then raise exception 'Accès refusé : ce compte n''est pas administrateur.'; end if;
  update profiles set access_expires_at = greatest(coalesce(access_expires_at, now()), (p_until + 1)::timestamptz)
   where id = p_user returning access_expires_at into v_exp;
  update access_requests set status = 'acceptee' where user_id = p_user and status = 'en_attente';
  insert into notifications(user_id, title, body, kind)
  values (p_user, 'Accès activé', 'Votre espace est actif jusqu''au ' || to_char(v_exp - interval '1 second', 'DD/MM/YYYY') || '. Vous pouvez publier votre liste.', 'access');
  return v_exp;
end $$;

create or replace function public.admin_handle_request(p_request uuid, p_approve boolean) returns void
language plpgsql volatile security definer set search_path = public as $$
declare r access_requests;
begin
  if not is_admin() then raise exception 'Accès refusé : ce compte n''est pas administrateur.'; end if;
  select * into r from access_requests where id = p_request and status = 'en_attente';
  if not found then raise exception 'Demande déjà traitée.'; end if;
  if p_approve then
    if r.end_date is not null then perform admin_grant_until(r.user_id, r.end_date);
    else perform admin_grant_access(r.user_id, r.days_requested); end if;
  else
    update access_requests set status = 'refusee' where id = p_request;
    insert into notifications(user_id, title, body, kind)
    values (r.user_id, case when r.kind = 'acces' then 'Demande d''accès refusée' else 'Prolongation refusée' end,
            'Paiement non vérifié ou demande incomplète. Contactez l''administrateur.', 'access');
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 3. Boutiques : validation après paiement, logo, couverture
-- ---------------------------------------------------------------------
alter table public.vendors
  add column if not exists status text not null default 'validee',
  add column if not exists logo_url text,
  add column if not exists cover_url text,
  add column if not exists payment_method text,
  add column if not exists payment_ref text,
  add column if not exists proof_url text;
alter table public.vendors drop constraint if exists vendors_status_check;
alter table public.vendors add constraint vendors_status_check check (status in ('en_attente', 'validee', 'refusee'));
alter table public.vendors alter column active set default false;

-- Une boutique ne peut pas s'auto-valider
create or replace function public.guard_vendor() returns trigger
language plpgsql as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    new.active := old.active;
    new.status := old.status;
    new.owner_id := old.owner_id;
  end if;
  return new;
end $$;
drop trigger if exists trg_guard_vendor on public.vendors;
create trigger trg_guard_vendor before update on public.vendors
for each row execute function public.guard_vendor();

create or replace function public.admin_validate_vendor(p_vendor uuid, p_approve boolean) returns void
language plpgsql volatile security definer set search_path = public as $$
declare v vendors;
begin
  if not is_admin() then raise exception 'Accès refusé : ce compte n''est pas administrateur.'; end if;
  update vendors set status = case when p_approve then 'validee' else 'refusee' end, active = p_approve
   where id = p_vendor returning * into v;
  if v.owner_id is not null then
    insert into notifications(user_id, title, body, kind)
    values (v.owner_id,
            case when p_approve then 'Boutique validée' else 'Boutique non validée' end,
            case when p_approve then 'Votre vitrine est en ligne : vos articles sont visibles par tous.'
                 else 'Paiement non vérifié. Contactez l''administrateur.' end, 'vendor');
  end if;
end $$;

-- Inscription : la boutique attend la validation
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
        v_role public.user_role := case when m->>'account_type' = 'vendor' then 'vendor'::public.user_role else 'celebrant'::public.user_role end;
        v_email text := case when new.email like '%@tel.happy.app' then null else new.email end;
        v_validated boolean := false; -- la validation se fait toujours par l'admin
begin
  insert into profiles(id, email, full_name, phone, role)
  values (new.id, v_email, m->>'full_name', m->>'phone', v_role);

  if v_role = 'vendor' then
    insert into vendors(owner_id, name, category, description, phone, email, address, status, active)
    values (new.id, coalesce(nullif(m->>'shop_name', ''), m->>'full_name', 'Ma boutique'),
            m->>'category', m->>'description', m->>'phone', v_email, m->>'address',
            case when v_validated then 'validee' else 'en_attente' end, v_validated);
    insert into notifications(user_id, title, body, kind)
    values (new.id, 'Bienvenue sur Happy',
            case when v_validated then 'Votre boutique est en ligne. Ajoutez vos articles.'
                 else 'Ajoutez vos articles et envoyez votre paiement : votre vitrine sera visible dès validation.' end, 'vendor');
    if not v_validated then
      insert into notifications(user_id, title, body, kind)
      select id, 'Nouvelle boutique à valider', coalesce(m->>'shop_name', 'Une boutique') || ' attend votre validation.', 'vendor'
      from profiles where role = 'admin';
    end if;
  else
    insert into notifications(user_id, title, body, kind)
    values (new.id, 'Bienvenue sur Happy', 'Préparez votre anniversaire puis demandez l''accès pour publier votre liste.', 'info');
  end if;
  return new;
end $$;

-- ---------------------------------------------------------------------
-- 4. Articles : catégories, variantes, stock, emballage
-- ---------------------------------------------------------------------
create table if not exists public.product_categories (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);
create unique index if not exists product_categories_unique on public.product_categories (vendor_id, lower(name));
alter table public.product_categories enable row level security;
drop policy if exists "categorie lecture" on public.product_categories;
create policy "categorie lecture" on public.product_categories for select using (true);
drop policy if exists "categorie gestion" on public.product_categories;
create policy "categorie gestion" on public.product_categories for all
  using (exists(select 1 from vendors v where v.id = vendor_id and v.owner_id = auth.uid()))
  with check (exists(select 1 from vendors v where v.id = vendor_id and v.owner_id = auth.uid()));

alter table public.products
  add column if not exists category_id uuid references public.product_categories on delete set null,
  add column if not exists options jsonb not null default '[]'::jsonb,   -- [{"name":"Taille","values":["S","M"]}]
  add column if not exists stock int check (stock is null or stock >= 0), -- null = stock non suivi
  add column if not exists wrap_available boolean not null default false,
  add column if not exists wrap_price numeric(12, 0);

create table if not exists public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products on delete cascade,
  kind text not null check (kind in ('inventaire', 'vente', 'annulation')),
  quantity int not null,
  stock_after int,
  note text,
  created_at timestamptz not null default now()
);
alter table public.inventory_movements enable row level security;
drop policy if exists "mouvements lecture" on public.inventory_movements;
create policy "mouvements lecture" on public.inventory_movements for select using (
  public.is_admin() or exists(select 1 from products p join vendors v on v.id = p.vendor_id where p.id = product_id and v.owner_id = auth.uid()));

-- Inventaire : la boutique saisit le nouveau stock
create or replace function public.vendor_set_stock(p_product uuid, p_stock int, p_note text default null) returns void
language plpgsql volatile security definer set search_path = public as $$
declare pr products;
begin
  select p.* into pr from products p join vendors v on v.id = p.vendor_id where p.id = p_product and v.owner_id = auth.uid();
  if not found then raise exception 'Article introuvable.'; end if;
  if p_stock is not null and p_stock < 0 then raise exception 'Le stock ne peut pas être négatif.'; end if;
  update products set stock = p_stock where id = p_product;
  insert into inventory_movements(product_id, kind, quantity, stock_after, note)
  values (p_product, 'inventaire', coalesce(p_stock, 0) - coalesce(pr.stock, 0), p_stock, nullif(trim(p_note), ''));
end $$;

alter table public.gifts add column if not exists options jsonb not null default '{}'::jsonb;  -- {"Taille":"M"}
alter table public.orders
  add column if not exists options jsonb not null default '{}'::jsonb,
  add column if not exists wrap_price numeric(12, 0),
  add column if not exists stock_applied boolean not null default false;

-- Validation de commande : le stock baisse ; annulation : il remonte
create or replace function public.vendor_update_order(p_order uuid, p_status public.order_status, p_paid boolean, p_note text default null)
returns void
language plpgsql volatile security definer set search_path = public as $$
declare o orders; pr products;
begin
  select * into o from orders
   where id = p_order and vendor_id in (select id from vendors where owner_id = auth.uid());
  if not found then raise exception 'Commande introuvable.'; end if;

  if o.product_id is not null then
    select * into pr from products where id = o.product_id;
    if p_status in ('acceptee', 'preparation', 'prete', 'livree') and not o.stock_applied and pr.stock is not null then
      if pr.stock < o.quantity then raise exception 'Stock insuffisant pour « % » (% restant). Faites un inventaire.', pr.name, pr.stock; end if;
      update products set stock = stock - o.quantity where id = pr.id;
      insert into inventory_movements(product_id, kind, quantity, stock_after, note)
      values (pr.id, 'vente', -o.quantity, pr.stock - o.quantity, 'Commande ' || o.tracking_code);
      o.stock_applied := true;
    elsif p_status = 'annulee' and o.stock_applied and pr.stock is not null then
      update products set stock = stock + o.quantity where id = pr.id;
      insert into inventory_movements(product_id, kind, quantity, stock_after, note)
      values (pr.id, 'annulation', o.quantity, pr.stock + o.quantity, 'Commande ' || o.tracking_code);
      o.stock_applied := false;
    end if;
  end if;

  update orders set status = p_status, paid = p_paid, vendor_note = nullif(trim(p_note), ''),
                    stock_applied = o.stock_applied, updated_at = now()
   where id = p_order;
end $$;

-- ---------------------------------------------------------------------
-- 5. Deux liens de partage + confirmations de présence
-- ---------------------------------------------------------------------
alter table public.events add column if not exists invite_token text unique default replace(gen_random_uuid()::text, '-', '');
update public.events set invite_token = replace(gen_random_uuid()::text, '-', '') where invite_token is null;

create table if not exists public.rsvps (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events on delete cascade,
  name text not null,
  phone text,
  attending text not null check (attending in ('oui', 'peut-etre', 'non')),
  guests int not null default 1 check (guests between 0 and 20),
  message text,
  created_at timestamptz not null default now()
);
alter table public.rsvps enable row level security;
drop policy if exists "presence lecture" on public.rsvps;
create policy "presence lecture" on public.rsvps for select
  using (public.is_admin() or exists(select 1 from events e where e.id = event_id and e.owner_id = auth.uid()));

create or replace function public.prepare_event() returns trigger
language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    new.birthday_date := public.next_birthday(new.birth_date);
    new.published := false;
    return new;
  end if;
  if new.published and not old.published and auth.uid() is not null
     and not public.is_admin() and not public.has_access(new.owner_id) then
    raise exception 'Votre accès doit être activé pour publier la liste.';
  end if;
  if old.published and auth.uid() is not null and not public.is_admin() then
    new.birth_date := old.birth_date;
    new.celebrant_name := old.celebrant_name;
    new.published := true;
    new.share_token := old.share_token;
    new.invite_token := old.invite_token;
  end if;
  if new.birth_date is distinct from old.birth_date then
    new.birthday_date := public.next_birthday(new.birth_date);
  end if;
  return new;
end $$;

create or replace function public.rsvp(p_token text, p_name text, p_phone text, p_attending text, p_guests int default 1, p_message text default null)
returns void
language plpgsql volatile security definer set search_path = public as $$
declare e events; v_owner uuid;
begin
  select * into e from events where invite_token = p_token and published and has_party;
  if not found then raise exception 'Invitation introuvable.'; end if;
  if coalesce(trim(p_name), '') = '' then raise exception 'Indiquez votre nom.'; end if;
  if p_attending not in ('oui', 'peut-etre', 'non') then raise exception 'Réponse invalide.'; end if;
  insert into rsvps(event_id, name, phone, attending, guests, message)
  values (e.id, trim(p_name), nullif(trim(p_phone), ''), p_attending,
          case when p_attending = 'non' then 0 else greatest(1, least(coalesce(p_guests, 1), 20)) end, nullif(trim(p_message), ''));
  insert into notifications(user_id, title, body, kind)
  values (e.owner_id, 'Nouvelle réponse à votre invitation',
          trim(p_name) || case p_attending when 'oui' then ' sera là' when 'peut-etre' then ' viendra peut-être' else ' ne pourra pas venir' end || '.', 'rsvp');
end $$;

-- Page publique : invitation et réponse uniquement avec le lien invités
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
        'claimed', exists(select 1 from claims c where c.gift_id = g.id)
      ) order by g.position, g.created_at)
      from gifts g left join vendors v on v.id = g.vendor_id left join products pr on pr.id = g.product_id
      where g.event_id = e.id
    ), '[]'::json)
  ) into r;
  return r;
end $$;

drop function if exists public.claim_gift(text, uuid, text, text, text, text, text, date);
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
  select * into g from gifts where id = p_gift_id and event_id = e.id;
  if not found then raise exception 'Cadeau introuvable.'; end if;
  if coalesce(trim(p_name), '') = '' or coalesce(trim(p_phone), '') = '' then
    raise exception 'Le nom et le téléphone sont obligatoires.';
  end if;
  if g.product_id is not null then
    select * into pr from products where id = g.product_id;
    if pr.stock is not null and pr.stock < 1 then raise exception 'Cet article est en rupture de stock chez la boutique.'; end if;
  end if;
  v_wrap := coalesce(p_wrap, false) and coalesce(pr.wrap_available, false);
  begin
    insert into claims(gift_id, friend_name, friend_phone, friend_email, friend_message)
    values (g.id, trim(p_name), trim(p_phone), nullif(trim(p_email), ''), nullif(trim(p_message), ''))
    returning id into v_claim;
  exception when unique_violation then
    raise exception 'Quelqu''un vient de prendre ce cadeau. Choisissez-en un autre.';
  end;
  insert into orders(claim_id, event_id, vendor_id, product_id, item_name, item_image, unit_price, options,
                     buyer_name, buyer_phone, buyer_email, recipient_name, delivery_date, delivery_address,
                     is_gift, is_surprise, gift_wrap, wrap_price)
  values (v_claim, e.id, g.vendor_id, g.product_id, g.name, g.image_url, g.price, g.options,
          trim(p_name), trim(p_phone), nullif(trim(p_email), ''), e.celebrant_name, p_delivery_date, nullif(trim(p_address), ''),
          true, true, v_wrap, case when v_wrap then pr.wrap_price end)
  returning tracking_code into v_code;
  return json_build_object('tracking_code', v_code);
end $$;

drop function if exists public.place_order(uuid, int, text, text, text, date, text, text, boolean, boolean, boolean, text);
create or replace function public.place_order(
  p_product uuid, p_quantity int, p_name text, p_phone text,
  p_email text default null, p_delivery_date date default null, p_address text default null,
  p_recipient text default null, p_is_gift boolean default false, p_surprise boolean default false,
  p_wrap boolean default false, p_gift_message text default null, p_options jsonb default '{}'::jsonb
) returns json
language plpgsql volatile security definer set search_path = public as $$
declare pr products; v vendors; v_code text; v_qty int := greatest(1, least(coalesce(p_quantity, 1), 99)); v_wrap boolean;
begin
  select * into pr from products where id = p_product and active;
  if not found then raise exception 'Article indisponible.'; end if;
  select * into v from vendors where id = pr.vendor_id and active;
  if not found then raise exception 'Boutique indisponible.'; end if;
  if pr.stock is not null and pr.stock < v_qty then
    raise exception 'Stock insuffisant : % disponible(s).', pr.stock;
  end if;
  if coalesce(trim(p_name), '') = '' or coalesce(trim(p_phone), '') = '' then
    raise exception 'Le nom et le téléphone sont obligatoires.';
  end if;
  v_wrap := coalesce(p_wrap, false) and pr.wrap_available;
  insert into orders(vendor_id, product_id, item_name, item_image, unit_price, quantity, options,
                     buyer_name, buyer_phone, buyer_email, recipient_name, delivery_date, delivery_address,
                     is_gift, is_surprise, gift_wrap, wrap_price, gift_message)
  values (v.id, pr.id, pr.name, pr.image_url, pr.price, v_qty, coalesce(p_options, '{}'::jsonb),
          trim(p_name), trim(p_phone), nullif(trim(p_email), ''), nullif(trim(p_recipient), ''), p_delivery_date, nullif(trim(p_address), ''),
          coalesce(p_is_gift, false), coalesce(p_is_gift, false) and coalesce(p_surprise, false), v_wrap,
          case when v_wrap then pr.wrap_price end, nullif(trim(p_gift_message), ''))
  returning tracking_code into v_code;
  return json_build_object('tracking_code', v_code);
end $$;

create or replace function public.get_order_tracking(p_code text) returns json
language plpgsql stable security definer set search_path = public as $$
declare r json;
begin
  select json_build_object(
    'tracking_code', o.tracking_code, 'status', o.status, 'paid', o.paid, 'payment_note', o.payment_note,
    'vendor_note', o.vendor_note, 'delivery_address', o.delivery_address, 'delivery_date', o.delivery_date,
    'quantity', o.quantity, 'created_at', o.created_at, 'is_gift', o.is_gift, 'gift_wrap', o.gift_wrap,
    'wrap_price', o.wrap_price, 'options', o.options,
    'item', json_build_object('name', o.item_name, 'image_url', o.item_image, 'price', o.unit_price),
    'vendor', case when v.id is null then null else json_build_object('id', v.id, 'name', v.name, 'phone', v.phone, 'address', v.address) end,
    'external_contact', g.external_contact,
    'celebrant_name', e.celebrant_name, 'birthday_date', e.birthday_date,
    'history', coalesce((select json_agg(json_build_object('status', h.status, 'note', h.note, 'at', h.created_at) order by h.created_at)
                         from order_events h where h.order_id = o.id), '[]'::json)
  ) into r
  from orders o
  left join vendors v on v.id = o.vendor_id
  left join events e on e.id = o.event_id
  left join claims c on c.id = o.claim_id
  left join gifts g on g.id = c.gift_id
  where o.tracking_code = upper(trim(p_code));
  return r;
end $$;

create or replace function public.get_vendor_orders() returns json
language plpgsql stable security definer set search_path = public as $$
declare v vendors;
begin
  select * into v from vendors where owner_id = auth.uid();
  if not found then return json_build_object('vendor', null, 'orders', '[]'::json); end if;
  return json_build_object(
    'vendor', row_to_json(v),
    'orders', coalesce((
      select json_agg(json_build_object(
        'id', o.id, 'tracking_code', o.tracking_code, 'status', o.status, 'paid', o.paid, 'vendor_note', o.vendor_note,
        'item_name', o.item_name, 'item_image', o.item_image, 'unit_price', o.unit_price, 'quantity', o.quantity, 'options', o.options,
        'buyer_name', o.buyer_name, 'buyer_phone', o.buyer_phone, 'buyer_email', o.buyer_email,
        'recipient_name', o.recipient_name, 'delivery_date', o.delivery_date, 'delivery_address', o.delivery_address,
        'is_gift', o.is_gift, 'is_surprise', o.is_surprise, 'gift_wrap', o.gift_wrap, 'wrap_price', o.wrap_price, 'gift_message', o.gift_message,
        'event_id', o.event_id, 'celebrant_name', e.celebrant_name, 'birthday_date', e.birthday_date,
        'created_at', o.created_at
      ) order by o.created_at desc)
      from orders o left join events e on e.id = o.event_id
      where o.vendor_id = v.id
    ), '[]'::json));
end $$;


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
        'claimed', c.id is not null,
        'friend_name', case when v_reveal then c.friend_name end,
        'friend_message', case when v_reveal then c.friend_message end
      ) order by g.position, g.created_at)
      from gifts g left join claims c on c.gift_id = g.id left join vendors v on v.id = g.vendor_id
      left join products pr on pr.id = g.product_id
      where g.event_id = e.id
    ), '[]'::json));
end $$;

-- ---------------------------------------------------------------------
-- 6. Notifications push (gratuites, même application fermée)
-- ---------------------------------------------------------------------
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_id uuid references public.profiles on delete cascade,
  event_id uuid references public.events on delete cascade,
  order_id uuid references public.orders on delete cascade,
  created_at timestamptz not null default now(),
  unique nulls not distinct (endpoint, user_id, event_id, order_id)
);
alter table public.push_subscriptions enable row level security; -- lecture réservée au serveur

create or replace function public.save_push_subscription(
  p_endpoint text, p_p256dh text, p_auth text, p_event_token text default null, p_order_code text default null
) returns void
language plpgsql volatile security definer set search_path = public as $$
declare v_event uuid; v_order uuid;
begin
  if p_event_token is not null then
    select id into v_event from events where share_token = p_event_token or invite_token = p_event_token;
  end if;
  if p_order_code is not null then
    select id into v_order from orders where tracking_code = upper(trim(p_order_code));
  end if;
  if auth.uid() is null and v_event is null and v_order is null then raise exception 'Abonnement impossible.'; end if;
  insert into push_subscriptions(endpoint, p256dh, auth, user_id, event_id, order_id)
  values (p_endpoint, p_p256dh, p_auth, case when v_event is null and v_order is null then auth.uid() end, v_event, v_order)
  on conflict (endpoint, user_id, event_id, order_id) do update set p256dh = excluded.p256dh, auth = excluded.auth;
end $$;

-- =====================================================================
-- Fin de la mise à jour v5
-- =====================================================================
