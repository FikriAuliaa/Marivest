-- MARIVEST: checkout simulasi, biaya pengemasan, serta verifikasi/pengiriman oleh Seller.
-- Data dan pembayaran simulasi; tidak ada payment gateway atau integrasi logistik.
-- Semua perubahan skema dilakukan melalui migration-only.
begin;

create table if not exists public.checkout_sessions (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references public.profiles(id) on delete restrict,
  idempotency_key uuid not null unique,
  recipient_name text not null check (char_length(btrim(recipient_name)) between 2 and 120),
  shipping_phone text not null check (char_length(regexp_replace(shipping_phone, '[^0-9]', '', 'g')) between 8 and 16),
  shipping_address text not null check (char_length(btrim(shipping_address)) between 8 and 500),
  payment_method text not null check (payment_method in ('qris','bank_transfer','ovo','dana','shopeepay','credit_card')),
  payment_status text not null default 'simulated' check (payment_status = 'simulated'),
  subtotal bigint not null check (subtotal > 0),
  shipping_fee bigint not null default 15000 check (shipping_fee >= 0),
  handling_fee bigint not null default 10000 check (handling_fee >= 0),
  total_amount bigint not null check (total_amount = subtotal + shipping_fee + handling_fee),
  created_at timestamptz not null default now()
);
create index if not exists checkout_sessions_buyer_idx on public.checkout_sessions(buyer_id,created_at desc);
alter table public.checkout_sessions enable row level security;

alter table public.orders
  add column if not exists checkout_id uuid references public.checkout_sessions(id) on delete restrict,
  add column if not exists shipping_status text not null default 'not_shipped',
  add column if not exists shipped_at timestamptz,
  add column if not exists delivered_at timestamptz,
  add column if not exists shipping_note text;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'orders_shipping_status_check' and conrelid = 'public.orders'::regclass) then
    alter table public.orders add constraint orders_shipping_status_check
      check (shipping_status in ('not_shipped','in_transit','delivered'));
  end if;
end $$;
create index if not exists orders_checkout_idx on public.orders(checkout_id);

drop policy if exists checkout_sessions_select_participants on public.checkout_sessions;
drop policy if exists checkout_sessions_select_self on public.checkout_sessions;
create policy checkout_sessions_select_self on public.checkout_sessions
for select to authenticated using (
  buyer_id = (select auth.uid()) or (select public.is_superadmin())
);

revoke all on public.checkout_sessions from anon,authenticated;
grant select on public.checkout_sessions to authenticated;

-- Enforces a single atomic checkout including all products and snapshot pricing.
-- Lock order is profiles -> products (sorted UUID); cart operations share buyer profile lock.
create or replace function public.checkout_cart(
  p_payment_method text,
  p_recipient_name text,
  p_shipping_phone text,
  p_shipping_address text,
  p_idempotency_key uuid
)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_existing uuid;
  v_session_id uuid;
  v_line record;
  v_product public.products%rowtype;
  v_business public.business_profiles%rowtype;
  v_subtotal bigint := 0;
  v_count integer := 0;
begin
  if v_uid is null or not exists (select 1 from public.profiles p where p.id=v_uid and p.role='mitra'::public.app_role) then
    raise exception 'Hanya akun Mitra dapat membuat pesanan';
  end if;
  if p_idempotency_key is null then raise exception 'Idempotency key wajib diisi'; end if;
  if p_payment_method is null or p_payment_method not in ('qris','bank_transfer','ovo','dana','shopeepay','credit_card') then
    raise exception 'Metode pembayaran tidak valid';
  end if;
  if char_length(btrim(coalesce(p_recipient_name,''))) not between 2 and 120 then
    raise exception 'Nama penerima tidak valid';
  end if;
  if char_length(regexp_replace(coalesce(p_shipping_phone,''),'[^0-9]','','g')) not between 8 and 16 then
    raise exception 'Nomor penerima tidak valid';
  end if;
  if char_length(btrim(coalesce(p_shipping_address,''))) not between 8 and 500 then
    raise exception 'Alamat pengiriman tidak valid';
  end if;

  perform 1 from public.profiles where id=v_uid for update;
  select id into v_existing from public.checkout_sessions where buyer_id=v_uid and idempotency_key=p_idempotency_key;
  if found then return v_existing; end if;
  if exists (select 1 from public.checkout_sessions where idempotency_key=p_idempotency_key) then
    raise exception 'Idempotency key sudah digunakan';
  end if;

  -- Serialize product row reads and availability checks with seller confirmations.
  for v_line in select product_id,quantity from public.cart_items where buyer_id=v_uid order by product_id loop
    select * into v_product from public.products where id=v_line.product_id for update;
    if not found then raise exception 'Produk tidak ditemukan'; end if;
    select * into v_business from public.business_profiles where id=v_product.business_id;
    if not v_product.is_published or v_business.verification_status<>'approved' or v_line.quantity>v_product.stock then
      raise exception 'Produk tidak tersedia atau stok tidak cukup';
    end if;
    v_subtotal := v_subtotal + v_product.price * v_line.quantity;
    v_count := v_count + 1;
  end loop;
  if v_count=0 then raise exception 'Keranjang kosong'; end if;

  insert into public.checkout_sessions(
    buyer_id,idempotency_key,recipient_name,shipping_phone,shipping_address,
    payment_method,payment_status,subtotal,shipping_fee,handling_fee,total_amount
  ) values (
    v_uid,p_idempotency_key,btrim(p_recipient_name),btrim(p_shipping_phone),btrim(p_shipping_address),
    p_payment_method,'simulated',v_subtotal,15000,10000,v_subtotal+25000
  ) returning id into v_session_id;

  for v_line in select product_id,quantity from public.cart_items where buyer_id=v_uid order by product_id loop
    select * into v_product from public.products where id=v_line.product_id;
    select * into v_business from public.business_profiles where id=v_product.business_id;
    insert into public.orders(product_id,buyer_id,checkout_id,quantity,unit_price,total_amount,status)
    values(v_product.id,v_uid,v_session_id,v_line.quantity,v_product.price,v_product.price*v_line.quantity,'pending');
    insert into public.notifications(user_id,title,body)
    values(v_business.owner_id,'Pesanan baru','Ada pesanan produk yang menunggu konfirmasi.');
  end loop;
  delete from public.cart_items where buyer_id=v_uid;
  insert into public.notifications(user_id,title,body)
  values(v_uid,'Menunggu verifikasi penjual','Pembayaran simulasi tercatat. Pesanan menunggu konfirmasi penjual.');
  return v_session_id;
end;
$$;
-- Remove old signature so older clients cannot skip payment method or address.
drop function if exists public.checkout_cart();
revoke all on function public.checkout_cart(text,text,text,text,uuid) from public,anon;
grant execute on function public.checkout_cart(text,text,text,text,uuid) to authenticated;

-- Confirmation reserves stock. Cancellation before shipping returns stock.
create or replace function public.transition_order(p_order_id uuid,p_next_status text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := (select auth.uid()); v_order public.orders%rowtype; v_business public.business_profiles%rowtype;
begin
  select * into v_order from public.orders where id=p_order_id for update;
  if not found then raise exception 'Pesanan tidak ditemukan'; end if;
  select b.* into v_business from public.products p join public.business_profiles b on b.id=p.business_id
    where p.id=v_order.product_id;
  if v_uid is null or v_business.owner_id<>v_uid then raise exception 'Hanya penjual pemilik produk'; end if;
  if not (
    (v_order.status='pending' and p_next_status in ('confirmed','cancelled'))
    or (v_order.status='confirmed' and v_order.shipping_status='not_shipped' and p_next_status='cancelled')
  ) then raise exception 'Transisi pesanan tidak valid'; end if;
  if v_order.status='pending' and p_next_status='confirmed' then
    update public.products set stock=stock-v_order.quantity
      where id=v_order.product_id and stock>=v_order.quantity;
    if not found then raise exception 'Stok produk tidak cukup'; end if;
  elsif v_order.status='confirmed' and p_next_status='cancelled' then
    update public.products set stock=stock+v_order.quantity where id=v_order.product_id;
  end if;
  update public.orders set status=p_next_status,updated_at=now() where id=p_order_id;
  if p_next_status='confirmed' then
    insert into public.notifications(user_id,title,body)
      values (v_order.buyer_id,'Pesanan berhasil dibuat','Penjual sudah memverifikasi pesanan Anda.');
  else
    insert into public.notifications(user_id,title,body)
      values (v_order.buyer_id,'Pesanan dibatalkan','Pesanan dibatalkan oleh penjual.');
  end if;
end;
$$;
revoke all on function public.transition_order(uuid,text) from public,anon;
grant execute on function public.transition_order(uuid,text) to authenticated;

-- Seller contact information is available only through a filtered RPC.
-- The checkout_sessions table itself remains private to the buyer/admin.
create or replace function public.list_seller_orders()
returns table (
  id uuid, product_id uuid, buyer_id uuid, quantity integer,
  total_amount bigint, status text, shipping_status text, created_at timestamptz,
  product_name text, product_unit text, recipient_name text,
  shipping_phone text, shipping_address text, payment_method text
)
language sql stable security definer set search_path = '' as $$
  select o.id, o.product_id, o.buyer_id, o.quantity, o.total_amount,
    o.status, o.shipping_status, o.created_at,
    p.name, p.unit,
    coalesce(c.recipient_name,'Pembeli'),
    coalesce(c.shipping_phone,'Tidak tersedia'),
    coalesce(c.shipping_address,'Pesanan lama, alamat belum tersedia'),
    coalesce(c.payment_method,'Belum dicatat')
  from public.orders o
  join public.products p on p.id=o.product_id
  join public.business_profiles b on b.id=p.business_id
  left join public.checkout_sessions c on c.id=o.checkout_id
  where b.owner_id=(select auth.uid())
  order by o.created_at desc
  limit 150;
$$;
revoke all on function public.list_seller_orders() from public,anon;
grant execute on function public.list_seller_orders() to authenticated;

-- Dashboard product ranking uses all confirmed/completed orders (not just recent rows).
create or replace function public.seller_product_revenue()
returns table(product_id uuid, confirmed_total bigint)
language sql stable security definer set search_path = '' as $$
  select p.id,
         coalesce(sum(o.total_amount) filter (where o.status in ('confirmed','completed')),0)::bigint
  from public.products p
  join public.business_profiles b on b.id=p.business_id
  left join public.orders o on o.product_id=p.id
  where b.owner_id=(select auth.uid())
  group by p.id;
$$;
revoke all on function public.seller_product_revenue() from public,anon;
grant execute on function public.seller_product_revenue() to authenticated;

-- Recording simulated fulfillment (no actual courier integration).
create or replace function public.transition_shipping(p_order_id uuid,p_next_status text,p_shipping_note text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := (select auth.uid()); v_order public.orders%rowtype; v_business public.business_profiles%rowtype;
begin
  select * into v_order from public.orders where id=p_order_id for update;
  if not found then raise exception 'Pesanan tidak ditemukan'; end if;
  select b.* into v_business from public.products p join public.business_profiles b on b.id=p.business_id where p.id=v_order.product_id;
  if v_uid is null or v_uid<>v_business.owner_id then raise exception 'Hanya penjual pemilik produk'; end if;
  if p_shipping_note is not null and char_length(p_shipping_note)>250 then raise exception 'Catatan maksimal 250 karakter'; end if;
  if v_order.status='confirmed' and v_order.shipping_status='not_shipped' and p_next_status='in_transit' then
    update public.orders set shipping_status='in_transit',shipped_at=now(),shipping_note=nullif(btrim(coalesce(p_shipping_note,'')),''),updated_at=now()
      where id=p_order_id;
    insert into public.notifications(user_id,title,body)
      values(v_order.buyer_id,'Pesanan sedang dikirim','Penjual telah menandai pesanan sebagai dikirim.');
  elsif v_order.status='confirmed' and v_order.shipping_status='in_transit' and p_next_status='delivered' then
    update public.orders set shipping_status='delivered',delivered_at=now(),status='completed',updated_at=now()
      where id=p_order_id;
    insert into public.notifications(user_id,title,body)
      values(v_order.buyer_id,'Pesanan selesai','Penjual menandai pengiriman telah selesai.');
  else
    raise exception 'Transisi pengiriman tidak valid';
  end if;
end;
$$;
revoke all on function public.transition_shipping(uuid,text,text) from public,anon;
grant execute on function public.transition_shipping(uuid,text,text) to authenticated;

commit;
