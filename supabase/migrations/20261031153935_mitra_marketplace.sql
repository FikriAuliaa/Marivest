-- MARIVEST: investor enrichment and buyer marketplace (all transactions are simulations)
-- Additive migration. Run through `npx supabase db push`, never edit dashboard schema manually.
begin;

-- Richer Investor application. Existing records remain valid; newly registered users
-- must submit the expanded fields through the versioned RPC below.
alter table public.investor_registrations
  add column if not exists investor_type text,
  add column if not exists occupation text,
  add column if not exists monthly_income bigint,
  add column if not exists institution_name text,
  add column if not exists investment_interests text[] not null default '{}';

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'investor_type_check' and conrelid = 'public.investor_registrations'::regclass) then
    alter table public.investor_registrations add constraint investor_type_check
      check (investor_type is null or investor_type in ('individual','institutional','impact'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'investor_income_check' and conrelid = 'public.investor_registrations'::regclass) then
    alter table public.investor_registrations add constraint investor_income_check
      check (monthly_income is null or monthly_income between 0 and 1000000000000);
  end if;
end $$;

-- Retire the short registration endpoint to prevent bypassing the new data requirements.
drop function if exists public.register_investor(text, text, text);

create or replace function public.register_investor(
  p_phone text,
  p_city text,
  p_reason text,
  p_investor_type text,
  p_occupation text,
  p_monthly_income bigint,
  p_institution_name text,
  p_investment_interests text[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_phone text := btrim(coalesce(p_phone, ''));
  v_city text := btrim(coalesce(p_city, ''));
  v_occupation text := btrim(coalesce(p_occupation, ''));
  v_institution text := nullif(btrim(coalesce(p_institution_name, '')), '');
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  v_interests text[] := coalesce(p_investment_interests, '{}');
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if not exists (select 1 from public.profiles where id = v_uid and role = 'mitra'::public.app_role) then
    raise exception 'Only mitra accounts can register as investor';
  end if;
  if v_phone !~ '^[+]?[0-9][0-9 -]{6,20}$'
     or char_length(regexp_replace(v_phone,'[^0-9]','','g')) not between 8 and 16 then
    raise exception 'Invalid phone';
  end if;
  if char_length(v_city) not between 2 and 100 then raise exception 'Invalid city'; end if;
  if p_investor_type not in ('individual','institutional','impact') or p_investor_type is null then
    raise exception 'Invalid investor type';
  end if;
  if char_length(v_occupation) not between 2 and 100 then raise exception 'Invalid occupation'; end if;
  if p_monthly_income is not null and (p_monthly_income < 0 or p_monthly_income > 1000000000000) then
    raise exception 'Invalid monthly income';
  end if;
  if p_investor_type = 'institutional' and (v_institution is null or char_length(v_institution) < 2) then
    raise exception 'Institution name required';
  end if;
  if v_institution is not null and char_length(v_institution) > 150 then raise exception 'Invalid institution name'; end if;
  if v_reason is not null and char_length(v_reason) > 500 then raise exception 'Invalid reason'; end if;
  if coalesce(array_length(v_interests,1),0) > 6
     or exists (select 1 from unnest(v_interests) as x where x not in ('budidaya','nelayan','tambak','rantai_pasok','rumput_laut','umkm')) then
    raise exception 'Invalid interests';
  end if;

  insert into public.investor_registrations as registration
    (user_id, phone, city, reason, investor_type, occupation, monthly_income,
     institution_name, investment_interests, status, registered_at, revoked_at)
  values
    (v_uid, v_phone, v_city, v_reason, p_investor_type, v_occupation, p_monthly_income,
     v_institution, v_interests, 'active', now(), null)
  on conflict (user_id) do update
    set phone = excluded.phone,
        city = excluded.city,
        reason = excluded.reason,
        investor_type = excluded.investor_type,
        occupation = excluded.occupation,
        monthly_income = excluded.monthly_income,
        institution_name = excluded.institution_name,
        investment_interests = excluded.investment_interests,
        status = 'active',
        registered_at = now(),
        revoked_at = null,
        updated_at = now()
    where registration.status = 'revoked';
end;
$$;
revoke all on function public.register_investor(text,text,text,text,text,bigint,text,text[]) from public, anon;
grant execute on function public.register_investor(text,text,text,text,text,bigint,text,text[]) to authenticated;

create table if not exists public.business_profiles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 2 and 120),
  category text not null check (category in ('nelayan_tangkap','pembudidaya_ikan','petambak','petani_rumput_laut','umkm_perikanan')),
  city text not null default '',
  description text not null default '',
  verification_status text not null default 'pending'
    check (verification_status in ('pending','needs_revision','approved')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists business_profiles_owner_idx on public.business_profiles(owner_id);
alter table public.business_profiles enable row level security;
drop policy if exists business_profiles_select on public.business_profiles;
create policy business_profiles_select on public.business_profiles for select to authenticated using (
  verification_status = 'approved' or owner_id = (select auth.uid()) or (select public.is_superadmin())
);
drop policy if exists business_profiles_insert on public.business_profiles;
create policy business_profiles_insert on public.business_profiles for insert to authenticated with check (
  owner_id = (select auth.uid())
  and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'pelaku_usaha'::public.app_role)
  and verification_status = 'pending'
);
drop policy if exists business_profiles_update on public.business_profiles;
create policy business_profiles_update on public.business_profiles for update to authenticated using (
  owner_id = (select auth.uid())
) with check (owner_id = (select auth.uid()));
revoke all on public.business_profiles from anon,authenticated;
grant select on public.business_profiles to authenticated;
grant insert (owner_id,name,category,city,description) on public.business_profiles to authenticated;
grant update (name,category,city,description) on public.business_profiles to authenticated;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.business_profiles(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 2 and 150),
  category text not null check (char_length(btrim(category)) between 2 and 60),
  description text not null default '',
  price bigint not null check (price between 1 and 1000000000000),
  unit text not null default 'kg' check (unit in ('kg','pcs','ikat','box')),
  stock integer not null default 0 check (stock >= 0),
  image_url text,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists products_business_idx on public.products(business_id);
create index if not exists products_published_idx on public.products(is_published,created_at desc);
alter table public.products enable row level security;
drop policy if exists products_select on public.products;
create policy products_select on public.products for select to authenticated using (
  (is_published and exists (select 1 from public.business_profiles b where b.id = business_id and b.verification_status = 'approved'))
  or exists (select 1 from public.business_profiles b where b.id = business_id and b.owner_id = (select auth.uid()))
  or (select public.is_superadmin())
);
drop policy if exists products_insert on public.products;
create policy products_insert on public.products for insert to authenticated with check (
  exists (select 1 from public.business_profiles b where b.id = business_id and b.owner_id = (select auth.uid()))
);
drop policy if exists products_update on public.products;
create policy products_update on public.products for update to authenticated using (
  exists (select 1 from public.business_profiles b where b.id = business_id and b.owner_id = (select auth.uid()))
) with check (
  exists (select 1 from public.business_profiles b where b.id = business_id and b.owner_id = (select auth.uid()))
);
revoke all on public.products from anon, authenticated;
grant select on public.products to authenticated;
grant insert (business_id,name,category,description,price,unit,stock,image_url,is_published) on public.products to authenticated;
grant update (name,category,description,price,unit,image_url,is_published) on public.products to authenticated;
-- Stock is intentionally not directly updateable: order transition RPC owns stock adjustments.

create table if not exists public.cart_items (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  quantity integer not null check (quantity between 1 and 1000),
  created_at timestamptz not null default now(),
  unique(buyer_id,product_id)
);
create index if not exists cart_items_buyer_idx on public.cart_items(buyer_id);
alter table public.cart_items enable row level security;
drop policy if exists cart_items_select_self on public.cart_items;
create policy cart_items_select_self on public.cart_items for select to authenticated using (buyer_id = (select auth.uid()));
revoke all on public.cart_items from anon, authenticated;
grant select on public.cart_items to authenticated;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id),
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  quantity integer not null check (quantity between 1 and 1000),
  unit_price bigint not null check (unit_price > 0),
  total_amount bigint not null check (total_amount between 1 and 1000000000000000),
  status text not null default 'pending' check (status in ('pending','confirmed','completed','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists orders_buyer_idx on public.orders(buyer_id,created_at desc);
create index if not exists orders_product_idx on public.orders(product_id,created_at desc);
alter table public.orders enable row level security;
drop policy if exists orders_select_participant on public.orders;
create policy orders_select_participant on public.orders for select to authenticated using (
  buyer_id = (select auth.uid())
  or exists (
    select 1 from public.products p join public.business_profiles b on b.id = p.business_id
    where p.id = product_id and b.owner_id = (select auth.uid())
  )
  or (select public.is_superadmin())
);
revoke all on public.orders from anon,authenticated;
grant select on public.orders to authenticated;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text not null default '',
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications(user_id, created_at desc);
alter table public.notifications enable row level security;
drop policy if exists notifications_select_self on public.notifications;
create policy notifications_select_self on public.notifications for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists notifications_update_self on public.notifications;
create policy notifications_update_self on public.notifications for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
revoke all on public.notifications from anon, authenticated;
grant select on public.notifications to authenticated;
grant update(is_read) on public.notifications to authenticated;

-- Database RPCs enforce all cross-table and stock constraints atomically.
create or replace function public.cart_set_quantity(p_product_id uuid, p_quantity integer)
returns void language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := (select auth.uid()); v_product public.products%rowtype; v_business public.business_profiles%rowtype;
begin
  if v_uid is null or not exists (select 1 from public.profiles where id = v_uid and role = 'mitra'::public.app_role) then
    raise exception 'Only mitra accounts can use cart';
  end if;
  if p_quantity < 0 or p_quantity > 1000 or p_quantity is null then raise exception 'Invalid quantity'; end if;
  -- Serialize cart edits with checkout for the same buyer.
  perform 1 from public.profiles where id = v_uid for update;
  if p_quantity = 0 then
    delete from public.cart_items where buyer_id = v_uid and product_id = p_product_id;
    return;
  end if;
  select * into v_product from public.products where id = p_product_id for update;
  if not found then raise exception 'Product not found'; end if;
  select * into v_business from public.business_profiles where id = v_product.business_id;
  if not v_product.is_published or v_business.verification_status <> 'approved' then
    raise exception 'Product unavailable';
  end if;
  if p_quantity > v_product.stock then raise exception 'Insufficient stock'; end if;
  insert into public.cart_items (buyer_id,product_id,quantity)
  values (v_uid,p_product_id,p_quantity)
  on conflict (buyer_id,product_id) do update set quantity = excluded.quantity;
end;
$$;
revoke all on function public.cart_set_quantity(uuid,integer) from public, anon;
grant execute on function public.cart_set_quantity(uuid,integer) to authenticated;

create or replace function public.checkout_cart()
returns integer language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := (select auth.uid()); v_cart record; v_product public.products%rowtype; v_business public.business_profiles%rowtype; v_count integer := 0;
begin
  if v_uid is null or not exists (select 1 from public.profiles where id=v_uid and role='mitra'::public.app_role) then
    raise exception 'Only mitra accounts can checkout';
  end if;
  -- Serialize checkout for one buyer to avoid double-submit from parallel requests.
  perform 1 from public.profiles where id = v_uid for update;
  if not exists (select 1 from public.cart_items where buyer_id = v_uid) then raise exception 'Cart is empty'; end if;
  for v_cart in select product_id,quantity from public.cart_items where buyer_id = v_uid order by product_id loop
    select * into v_product from public.products where id = v_cart.product_id for update;
    select * into v_business from public.business_profiles where id = v_product.business_id;
    if not v_product.is_published or v_business.verification_status <> 'approved' or v_cart.quantity > v_product.stock then
      raise exception 'Product unavailable or insufficient stock';
    end if;
    insert into public.orders (product_id,buyer_id,quantity,unit_price,total_amount,status)
    values (v_product.id,v_uid,v_cart.quantity,v_product.price,v_product.price*v_cart.quantity,'pending');
    insert into public.notifications(user_id,title,body)
    values (v_business.owner_id,'Pesanan baru','Ada pesanan produk yang menunggu konfirmasi.');
    v_count := v_count + 1;
  end loop;
  delete from public.cart_items where buyer_id = v_uid;
  insert into public.notifications(user_id,title,body)
  values(v_uid,'Pesanan tersimpan','Pesanan Anda menunggu konfirmasi penjual.');
  return v_count;
end;
$$;
revoke all on function public.checkout_cart() from public,anon;
grant execute on function public.checkout_cart() to authenticated;

-- For later seller page: changes status and stock under a row lock.
create or replace function public.transition_order(p_order_id uuid, p_next_status text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := (select auth.uid()); v_order public.orders%rowtype; v_business public.business_profiles%rowtype; v_stock integer;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'Order not found'; end if;
  select b.* into v_business from public.products p join public.business_profiles b on b.id=p.business_id
    where p.id = v_order.product_id;
  if v_uid is null or v_business.owner_id <> v_uid then raise exception 'Only seller can change order'; end if;
  if not (
    (v_order.status='pending' and p_next_status in ('confirmed','cancelled')) or
    (v_order.status='confirmed' and p_next_status in ('completed','cancelled'))
  ) then raise exception 'Invalid order transition'; end if;
  if v_order.status='pending' and p_next_status='confirmed' then
    update public.products set stock = stock - v_order.quantity
    where id=v_order.product_id and stock>=v_order.quantity returning stock into v_stock;
    if not found then raise exception 'Insufficient stock'; end if;
  elsif v_order.status='confirmed' and p_next_status='cancelled' then
    update public.products set stock = stock + v_order.quantity where id=v_order.product_id;
  end if;
  update public.orders set status=p_next_status,updated_at=now() where id=p_order_id;
  insert into public.notifications(user_id,title,body)
    values(v_order.buyer_id,'Status pesanan diperbarui','Pesanan Anda sekarang: ' || p_next_status);
end;
$$;
revoke all on function public.transition_order(uuid,text) from public,anon;
grant execute on function public.transition_order(uuid,text) to authenticated;

commit;
