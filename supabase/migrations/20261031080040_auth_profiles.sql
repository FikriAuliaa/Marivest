-- Template isi migrasi auth_profiles.
-- Buat file migrasi resmi dengan:
-- npx supabase migration new auth_profiles
-- Lalu salin seluruh isi file ini ke file timestamp yang dihasilkan CLI.

do $$
begin
  create type public.app_role as enum (
    'pelaku_usaha',
    'mitra',
    'superadmin'
  );
exception
  when duplicate_object then null;
end
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default 'Pengguna',
  role public.app_role not null default 'mitra',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists full_name text not null default 'Pengguna',
  add column if not exists role public.app_role not null default 'mitra',
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

update public.profiles
set full_name = 'Pengguna'
where full_name is null or btrim(full_name) = '';

alter table public.profiles
  alter column full_name set default 'Pengguna',
  alter column full_name set not null,
  alter column role set default 'mitra',
  alter column role set not null;

create index if not exists profiles_role_idx
  on public.profiles (role);

create or replace function public.is_superadmin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles as profile
    where profile.id = (select auth.uid())
      and profile.role = 'superadmin'::public.app_role
  );
$$;

revoke all on function public.is_superadmin() from public, anon;
grant execute on function public.is_superadmin() to authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_role public.app_role;
  new_full_name text;
begin
  new_role := case new.raw_user_meta_data ->> 'role'
    when 'pelaku_usaha' then 'pelaku_usaha'::public.app_role
    when 'mitra' then 'mitra'::public.app_role
    else 'mitra'::public.app_role
  end;

  new_full_name := nullif(
    btrim(coalesce(new.raw_user_meta_data ->> 'full_name', '')),
    ''
  );

  if new_full_name is null then
    new_full_name := coalesce(
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'Pengguna'
    );
  end if;

  insert into public.profiles (id, full_name, role)
  values (new.id, new_full_name, new_role)
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- Fungsi ini hanya dipakai oleh trigger, bukan endpoint RPC publik.
revoke all on function public.handle_new_user() from public, anon, authenticated;

create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.role is distinct from old.role
    and (select auth.uid()) = old.id
    and not public.is_superadmin()
  then
    raise exception 'Role tidak dapat diubah oleh pemilik akun.';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_protect_role on public.profiles;

create trigger profiles_protect_role
  before update on public.profiles
  for each row
  execute function public.protect_profile_role();

alter table public.profiles enable row level security;

drop policy if exists profiles_select_self_or_superadmin
  on public.profiles;

create policy profiles_select_self_or_superadmin
  on public.profiles
  for select
  to authenticated
  using (
    id = (select auth.uid())
    or (select public.is_superadmin())
  );

drop policy if exists profiles_update_self
  on public.profiles;

create policy profiles_update_self
  on public.profiles
  for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

grant usage on schema public to authenticated;

revoke all on table public.profiles from anon, authenticated;
grant select on table public.profiles to authenticated;
grant update (full_name) on table public.profiles to authenticated;

-- Tidak ada policy INSERT publik: profile dibuat oleh trigger auth.users.
-- Role tidak diberikan hak UPDATE kepada authenticated.
