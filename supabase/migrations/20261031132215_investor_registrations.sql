-- MARIVEST Investor registration and self-service access lifecycle.
-- The primary app role remains `mitra`; investor access is an additional capability.
-- Registration activates immediately after successful validation and persistence.

begin;

create table if not exists public.investor_registrations (
  user_id uuid primary key
    references public.profiles (id)
    on delete cascade,
  phone text not null,
  city text not null,
  reason text,
  status text not null default 'active',
  registered_at timestamptz not null default now(),
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint investor_registrations_phone_digits_check
    check (
      char_length(regexp_replace(phone, '[^0-9]', '', 'g')) between 8 and 16
    ),
  constraint investor_registrations_city_length_check
    check (char_length(btrim(city)) between 2 and 100),
  constraint investor_registrations_reason_length_check
    check (reason is null or char_length(reason) <= 500),
  constraint investor_registrations_status_check
    check (status in ('active', 'revoked')),
  constraint investor_registrations_revocation_state_check
    check (
      (status = 'active' and revoked_at is null)
      or (status = 'revoked' and revoked_at is not null)
    )
);

comment on table public.investor_registrations is
  'Pendaftaran dan status akses Investor untuk akun dengan role utama mitra.';
comment on column public.investor_registrations.user_id is
  'Relasi one-to-one ke profiles.id. Role profiles tetap mitra.';
comment on column public.investor_registrations.status is
  'active memberikan akses Investor; revoked mencabut akses dan menyimpan riwayat pendaftaran.';

create index if not exists investor_registrations_status_idx
  on public.investor_registrations (status);

alter table public.investor_registrations enable row level security;

drop policy if exists investor_registrations_select_self_or_superadmin
  on public.investor_registrations;

create policy investor_registrations_select_self_or_superadmin
  on public.investor_registrations
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or (select public.is_superadmin())
  );

-- No direct INSERT/UPDATE/DELETE grants are given to browser sessions.
-- Mutations are performed only through the checked SECURITY DEFINER RPCs.
revoke all on table public.investor_registrations from anon, authenticated;
grant select on table public.investor_registrations to authenticated;

create or replace function public.register_investor(
  p_phone text,
  p_city text,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  normalized_phone text := btrim(coalesce(p_phone, ''));
  normalized_city text := btrim(coalesce(p_city, ''));
  normalized_reason text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  if current_user_id is null then
    raise exception 'Authentication required.';
  end if;

  if not exists (
    select 1
    from public.profiles as profile
    where profile.id = current_user_id
      and profile.role = 'mitra'::public.app_role
  ) then
    raise exception 'Only mitra accounts can register as investor.';
  end if;

  if char_length(regexp_replace(normalized_phone, '[^0-9]', '', 'g')) not between 8 and 16 then
    raise exception 'Phone number must contain 8 to 16 digits.';
  end if;

  if char_length(normalized_city) not between 2 and 100 then
    raise exception 'City must contain 2 to 100 characters.';
  end if;

  if normalized_reason is not null and char_length(normalized_reason) > 500 then
    raise exception 'Reason must not exceed 500 characters.';
  end if;

  insert into public.investor_registrations as current_registration (
    user_id,
    phone,
    city,
    reason,
    status,
    registered_at,
    revoked_at,
    created_at,
    updated_at
  )
  values (
    current_user_id,
    normalized_phone,
    normalized_city,
    normalized_reason,
    'active',
    now(),
    null,
    now(),
    now()
  )
  on conflict (user_id) do update
    set phone = excluded.phone,
        city = excluded.city,
        reason = excluded.reason,
        status = 'active',
        registered_at = now(),
        revoked_at = null,
        updated_at = now()
    where current_registration.status = 'revoked';
end;
$$;

create or replace function public.revoke_investor_access()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
begin
  if current_user_id is null then
    raise exception 'Authentication required.';
  end if;

  update public.investor_registrations
  set status = 'revoked',
      revoked_at = now(),
      updated_at = now()
  where user_id = current_user_id
    and status = 'active';

  if not found then
    raise exception 'No active investor registration was found.';
  end if;
end;
$$;

revoke all on function public.register_investor(text, text, text)
  from public, anon;
revoke all on function public.revoke_investor_access()
  from public, anon;

grant execute on function public.register_investor(text, text, text)
  to authenticated;
grant execute on function public.revoke_investor_access()
  to authenticated;

commit;
