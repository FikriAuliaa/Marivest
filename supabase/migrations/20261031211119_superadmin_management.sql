-- MARIVEST SuperAdmin management extension.
-- Create a timestamped migration with:
--   npx supabase migration new superadmin_management
-- Then copy this file's contents into the generated migration file.
-- This migration extends RLS; it does not disable RLS or change public registration.

create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  entity text not null,
  entity_id text not null,
  action text not null check (action in ('insert', 'update', 'delete', 'create')),
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_logs_created_at_idx
  on public.admin_audit_logs (created_at desc);
create index if not exists admin_audit_logs_entity_idx
  on public.admin_audit_logs (entity, entity_id);

alter table public.admin_audit_logs enable row level security;
revoke all on table public.admin_audit_logs from anon;
grant select on table public.admin_audit_logs to authenticated;

drop policy if exists "superadmin_read_admin_audit_logs" on public.admin_audit_logs;
create policy "superadmin_read_admin_audit_logs"
  on public.admin_audit_logs
  for select
  to authenticated
  using (public.is_superadmin());

-- SuperAdmin policies are additive. Existing owner/investor policies remain active.
alter table public.profiles enable row level security;
drop policy if exists "superadmin_manage_profiles" on public.profiles;
create policy "superadmin_manage_profiles"
  on public.profiles
  for all
  to authenticated
  using (public.is_superadmin())
  with check (public.is_superadmin());

alter table public.business_profiles enable row level security;
drop policy if exists "superadmin_manage_business_profiles" on public.business_profiles;
create policy "superadmin_manage_business_profiles"
  on public.business_profiles
  for all
  to authenticated
  using (public.is_superadmin())
  with check (public.is_superadmin());

alter table public.funding_projects enable row level security;
drop policy if exists "superadmin_manage_funding_projects" on public.funding_projects;
create policy "superadmin_manage_funding_projects"
  on public.funding_projects
  for all
  to authenticated
  using (public.is_superadmin())
  with check (public.is_superadmin());

alter table public.funding_commitments enable row level security;
drop policy if exists "superadmin_manage_funding_commitments" on public.funding_commitments;
create policy "superadmin_manage_funding_commitments"
  on public.funding_commitments
  for all
  to authenticated
  using (public.is_superadmin())
  with check (public.is_superadmin());

alter table public.products enable row level security;
drop policy if exists "superadmin_manage_products" on public.products;
create policy "superadmin_manage_products"
  on public.products
  for all
  to authenticated
  using (public.is_superadmin())
  with check (public.is_superadmin());

alter table public.orders enable row level security;
drop policy if exists "superadmin_manage_orders" on public.orders;
create policy "superadmin_manage_orders"
  on public.orders
  for all
  to authenticated
  using (public.is_superadmin())
  with check (public.is_superadmin());

alter table public.financial_entries enable row level security;
drop policy if exists "superadmin_manage_financial_entries" on public.financial_entries;
create policy "superadmin_manage_financial_entries"
  on public.financial_entries
  for all
  to authenticated
  using (public.is_superadmin())
  with check (public.is_superadmin());


-- Authenticated panel users cannot promote, demote, or delete SuperAdmin accounts.
-- Manual team-level administration through Supabase SQL/Service Role remains possible.
create or replace function public.guard_superadmin_accounts()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() = 'authenticated' then
    if tg_op = 'INSERT' and new.role = 'superadmin' then
      raise exception 'SuperAdmin hanya dapat dibuat manual oleh tim';
    elsif tg_op = 'UPDATE' and new.role = 'superadmin' and old.role <> 'superadmin' then
      raise exception 'Promosi menjadi SuperAdmin hanya dapat dilakukan manual oleh tim';
    elsif tg_op = 'UPDATE' and old.role = 'superadmin' and new.role <> 'superadmin' then
      raise exception 'Role SuperAdmin dilindungi';
    elsif tg_op = 'DELETE' and old.role = 'superadmin' then
      raise exception 'Akun SuperAdmin dilindungi';
    end if;
  end if;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists guard_superadmin_accounts on public.profiles;
create trigger guard_superadmin_accounts
  before insert or update or delete on public.profiles
  for each row execute function public.guard_superadmin_accounts();

-- Audit all SuperAdmin mutations to the core MARIVEST entities.
create or replace function public.audit_superadmin_mutation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old jsonb;
  v_new jsonb;
  v_entity_id text;
begin
  if not public.is_superadmin() then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;

  if tg_op = 'INSERT' then
    v_new := to_jsonb(new);
    v_entity_id := v_new ->> 'id';
  elsif tg_op = 'UPDATE' then
    v_old := to_jsonb(old);
    v_new := to_jsonb(new);
    v_entity_id := v_new ->> 'id';
  else
    v_old := to_jsonb(old);
    v_entity_id := v_old ->> 'id';
  end if;

  insert into public.admin_audit_logs (
    actor_id, entity, entity_id, action, old_data, new_data
  ) values (
    auth.uid(),
    tg_table_name,
    coalesce(v_entity_id, 'unknown'),
    lower(tg_op),
    v_old,
    v_new
  );

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists audit_superadmin_profiles on public.profiles;
create trigger audit_superadmin_profiles
  after insert or update or delete on public.profiles
  for each row execute function public.audit_superadmin_mutation();

drop trigger if exists audit_superadmin_business_profiles on public.business_profiles;
create trigger audit_superadmin_business_profiles
  after insert or update or delete on public.business_profiles
  for each row execute function public.audit_superadmin_mutation();

drop trigger if exists audit_superadmin_funding_projects on public.funding_projects;
create trigger audit_superadmin_funding_projects
  after insert or update or delete on public.funding_projects
  for each row execute function public.audit_superadmin_mutation();

drop trigger if exists audit_superadmin_funding_commitments on public.funding_commitments;
create trigger audit_superadmin_funding_commitments
  after insert or update or delete on public.funding_commitments
  for each row execute function public.audit_superadmin_mutation();

drop trigger if exists audit_superadmin_products on public.products;
create trigger audit_superadmin_products
  after insert or update or delete on public.products
  for each row execute function public.audit_superadmin_mutation();

drop trigger if exists audit_superadmin_orders on public.orders;
create trigger audit_superadmin_orders
  after insert or update or delete on public.orders
  for each row execute function public.audit_superadmin_mutation();

drop trigger if exists audit_superadmin_financial_entries on public.financial_entries;
create trigger audit_superadmin_financial_entries
  after insert or update or delete on public.financial_entries
  for each row execute function public.audit_superadmin_mutation();

-- Controlled admin correction for investor commitments.
-- The project row lock and SUM check preserve the target invariant.
create or replace function public.admin_create_funding_commitment(
  p_project_id uuid,
  p_investor_id uuid,
  p_amount bigint
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project public.funding_projects%rowtype;
  v_total bigint;
  v_id uuid;
  v_role text;
  v_investor_status text;
begin
  if not public.is_superadmin() then
    raise exception 'Akses hanya untuk SuperAdmin';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'Nominal komitmen harus lebih dari nol';
  end if;

  select * into v_project
  from public.funding_projects
  where id = p_project_id
  for update;

  if not found then raise exception 'Proyek tidak ditemukan'; end if;
  if v_project.verification_status <> 'approved' or v_project.funding_status <> 'open' then
    raise exception 'Proyek harus disetujui dan masih terbuka';
  end if;

  select role into v_role from public.profiles where id = p_investor_id;
  if v_role is distinct from 'mitra' then
    raise exception 'Investor harus merupakan akun Mitra';
  end if;

  select status into v_investor_status
  from public.investor_registrations
  where user_id = p_investor_id;

  if v_investor_status is distinct from 'active' then
    raise exception 'Investor harus memiliki status registrasi aktif';
  end if;

  select coalesce(sum(amount), 0)::bigint into v_total
  from public.funding_commitments
  where project_id = p_project_id;

  if p_amount > v_project.target_amount - v_total then
    raise exception 'Nominal melebihi sisa target pendanaan';
  end if;

  insert into public.funding_commitments (
    project_id, investor_id, amount, idempotency_key
  ) values (
    p_project_id, p_investor_id, p_amount, gen_random_uuid()
  )
  returning id into v_id;

  if v_total + p_amount >= v_project.target_amount then
    update public.funding_projects set funding_status = 'funded' where id = p_project_id;
  end if;

  return v_id;
end;
$$;

create or replace function public.admin_delete_funding_commitment(p_commitment_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project_id uuid;
  v_target bigint;
  v_total bigint;
begin
  if not public.is_superadmin() then
    raise exception 'Akses hanya untuk SuperAdmin';
  end if;

  select project_id into v_project_id
  from public.funding_commitments
  where id = p_commitment_id;

  if not found then raise exception 'Komitmen tidak ditemukan'; end if;

  select target_amount into v_target
  from public.funding_projects
  where id = v_project_id
  for update;

  delete from public.funding_commitments where id = p_commitment_id;

  select coalesce(sum(amount), 0)::bigint into v_total
  from public.funding_commitments
  where project_id = v_project_id;

  update public.funding_projects
  set funding_status = case when v_total >= v_target then 'funded' else 'open' end
  where id = v_project_id;
end;
$$;

-- Controlled admin order creation/status/deletion keeps inventory consistent.
create or replace function public.admin_create_order(
  p_product_id uuid,
  p_buyer_id uuid,
  p_quantity integer
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_product public.products%rowtype;
  v_buyer_role text;
  v_id uuid;
  v_total bigint;
begin
  if not public.is_superadmin() then
    raise exception 'Akses hanya untuk SuperAdmin';
  end if;
  if p_quantity is null or p_quantity < 1 or p_quantity > 1000 then
    raise exception 'Kuantitas pesanan tidak valid';
  end if;

  select * into v_product
  from public.products
  where id = p_product_id
  for update;

  if not found then raise exception 'Produk tidak ditemukan'; end if;
  if v_product.stock < p_quantity then raise exception 'Stok produk tidak mencukupi'; end if;
  if not v_product.is_published then raise exception 'Produk belum dipublikasikan'; end if;
  if not exists (
    select 1 from public.business_profiles
    where id = v_product.business_id and verification_status = 'approved'
  ) then
    raise exception 'Profil usaha penjual belum disetujui';
  end if;

  select role into v_buyer_role from public.profiles where id = p_buyer_id;
  if v_buyer_role is distinct from 'mitra' then
    raise exception 'Pembeli harus merupakan akun Mitra';
  end if;

  v_total := v_product.price * p_quantity;

  insert into public.orders (product_id, buyer_id, quantity, total_amount, status)
  values (p_product_id, p_buyer_id, p_quantity, v_total, 'pending')
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.admin_update_order_status(
  p_order_id uuid,
  p_next_status text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_next_status public.orders.status%type;
  v_stock integer;
begin
  if not public.is_superadmin() then
    raise exception 'Akses hanya untuk SuperAdmin';
  end if;
  v_next_status := p_next_status;
  if v_next_status not in ('pending', 'confirmed', 'completed', 'cancelled') then
    raise exception 'Status pesanan tidak valid';
  end if;

  select * into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then raise exception 'Pesanan tidak ditemukan'; end if;
  if v_order.status = v_next_status then return; end if;

  if v_order.status = 'pending' and v_next_status = 'confirmed' then
    select stock into v_stock from public.products where id = v_order.product_id for update;
    if v_stock is null or v_stock < v_order.quantity then
      raise exception 'Stok produk tidak mencukupi untuk konfirmasi';
    end if;
    update public.products set stock = stock - v_order.quantity where id = v_order.product_id;
  elsif v_order.status = 'confirmed' and v_next_status = 'cancelled' then
    if v_order.shipping_status = 'in_transit' then
      raise exception 'Pesanan yang sedang dikirim tidak dapat dibatalkan melalui panel admin';
    end if;
    update public.products set stock = stock + v_order.quantity where id = v_order.product_id;
  elsif not (
    (v_order.status = 'pending' and v_next_status = 'cancelled') or
    (v_order.status = 'confirmed' and v_next_status = 'completed')
  ) then
    raise exception 'Transisi status pesanan tidak diizinkan';
  end if;

  if v_next_status = 'completed' then
    update public.orders
    set status = v_next_status, shipping_status = 'delivered'
    where id = p_order_id;
  else
    update public.orders set status = v_next_status where id = p_order_id;
  end if;
end;
$$;

create or replace function public.admin_delete_order(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
begin
  if not public.is_superadmin() then
    raise exception 'Akses hanya untuk SuperAdmin';
  end if;

  select * into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then raise exception 'Pesanan tidak ditemukan'; end if;
  if v_order.shipping_status = 'in_transit' then
    raise exception 'Pesanan yang sedang dikirim tidak dapat dihapus';
  end if;

  if v_order.status in ('confirmed', 'completed') then
    update public.products
    set stock = stock + v_order.quantity
    where id = v_order.product_id;
  end if;

  delete from public.orders where id = p_order_id;
end;
$$;

revoke all on function public.audit_superadmin_mutation() from public, anon;
revoke all on function public.guard_superadmin_accounts() from public, anon;
revoke all on function public.admin_create_funding_commitment(uuid, uuid, bigint) from public, anon;
revoke all on function public.admin_delete_funding_commitment(uuid) from public, anon;
revoke all on function public.admin_create_order(uuid, uuid, integer) from public, anon;
revoke all on function public.admin_update_order_status(uuid, text) from public, anon;
revoke all on function public.admin_delete_order(uuid) from public, anon;

grant execute on function public.admin_create_funding_commitment(uuid, uuid, bigint) to authenticated;
grant execute on function public.admin_delete_funding_commitment(uuid) to authenticated;
grant execute on function public.admin_create_order(uuid, uuid, integer) to authenticated;
grant execute on function public.admin_update_order_status(uuid, text) to authenticated;
grant execute on function public.admin_delete_order(uuid) to authenticated;
