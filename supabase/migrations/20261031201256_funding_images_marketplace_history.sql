-- MARIVEST: gambar pengajuan pendanaan dan riwayat omzet Marketplace simulasi.
-- Laporan Marketplace tidak dicampurkan dengan financial_entries milik proyek pendanaan.
begin;

-- Kolom sudah ada sejak migration pendanaan awal, tetapi dibuat defensif untuk skema lama.
alter table public.funding_projects add column if not exists image_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('funding-images', 'funding-images', true, 5242880, array['image/jpeg','image/png'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists marivest_funding_images_seller_insert on storage.objects;
create policy marivest_funding_images_seller_insert on storage.objects
for insert to authenticated with check (
  bucket_id = 'funding-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'pelaku_usaha'::public.app_role
  )
);

drop policy if exists marivest_funding_images_seller_delete on storage.objects;
create policy marivest_funding_images_seller_delete on storage.objects
for delete to authenticated using (
  bucket_id = 'funding-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'pelaku_usaha'::public.app_role
  )
);
-- Tidak ada policy UPDATE. Objek tidak boleh ditimpa.
-- Gambar proyek adalah materi publik; jangan simpan dokumen pribadi di bucket ini.

-- Waktu konfirmasi adalah periode omzet, bukan waktu checkout atau tanggal pengiriman.
alter table public.orders add column if not exists confirmed_at timestamptz;

create or replace function public.mark_marketplace_order_confirmation()
returns trigger language plpgsql set search_path = '' as $$
begin
  if old.status = 'pending' and new.status = 'confirmed' and new.confirmed_at is null then
    new.confirmed_at := now();
  end if;
  return new;
end;
$$;
drop trigger if exists mark_marketplace_order_confirmation_trigger on public.orders;
create trigger mark_marketplace_order_confirmation_trigger
  before update of status on public.orders
  for each row execute function public.mark_marketplace_order_confirmation();

-- Tanggal konfirmasi historis sebelum migration tidak dicatat.
-- Perkiraan memakai updated_at (fallback created_at); data baru memakai waktu konfirmasi sebenarnya.
update public.orders
set confirmed_at = coalesce(updated_at, created_at)
where status in ('confirmed','completed') and confirmed_at is null;
create index if not exists orders_confirmed_at_idx
  on public.orders (confirmed_at) where status in ('confirmed','completed');

-- Hanya mengembalikan agregat bulanan, tanpa identitas/alamat pembeli.
-- Seller bisa melihat bisnisnya sendiri; Investor aktif hanya boleh membaca bisnis approved
-- yang mempunyai proyek approved; SuperAdmin dapat meninjau semuanya.
create or replace function public.business_marketplace_history(p_business_id uuid)
returns table(month_start date, verified_order_value bigint, verified_order_count bigint)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_owner uuid;
  v_status text;
  v_started timestamptz;
begin
  if v_uid is null or p_business_id is null then
    raise exception 'Authentication required';
  end if;
  select b.owner_id, b.verification_status, b.created_at
    into v_owner, v_status, v_started
    from public.business_profiles b where b.id = p_business_id;
  if not found then raise exception 'Business not found'; end if;
  if not (
    v_owner = v_uid
    or public.is_superadmin()
    or (
      v_status = 'approved'
      and exists (
        select 1 from public.profiles p
        join public.investor_registrations r on r.user_id = p.id
        where p.id = v_uid and p.role = 'mitra'::public.app_role and r.status = 'active'
      )
      and exists (
        select 1 from public.funding_projects f
        where f.business_id = p_business_id and f.verification_status = 'approved'
      )
    )
  ) then
    raise exception 'Business history is not accessible';
  end if;

  return query
  with months as (
    select generate_series(
      date_trunc('month', v_started at time zone 'Asia/Jakarta'),
      date_trunc('month', now() at time zone 'Asia/Jakarta'),
      interval '1 month'
    )::date as period_date
  ), totals as (
    select date_trunc('month', o.confirmed_at at time zone 'Asia/Jakarta')::date as period_date,
      sum(o.total_amount)::bigint as amount,
      count(o.id)::bigint as order_count
    from public.orders o
    join public.products p on p.id = o.product_id
    where p.business_id = p_business_id
      and o.status in ('confirmed','completed')
      and o.confirmed_at is not null
    group by 1
  )
  select m.period_date,
    coalesce(t.amount,0)::bigint,
    coalesce(t.order_count,0)::bigint
  from months m left join totals t using (period_date)
  order by m.period_date;
end;
$$;
revoke all on function public.business_marketplace_history(uuid) from public, anon;
grant execute on function public.business_marketplace_history(uuid) to authenticated;

commit;
