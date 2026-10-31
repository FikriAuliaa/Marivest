
-- Backfill profile untuk pengguna yang sudah terdaftar
-- tetapi belum memiliki record di public.profiles.

insert into public.profiles (
  id,
  full_name,
  role
)
select
  users.id,

  coalesce(
    nullif(
      btrim(users.raw_user_meta_data ->> 'full_name'),
      ''
    ),
    nullif(
      split_part(coalesce(users.email, ''), '@', 1),
      ''
    ),
    'Pengguna'
  ),

  case
    when users.raw_user_meta_data ->> 'role' = 'pelaku_usaha'
      then 'pelaku_usaha'::public.app_role

    when users.raw_user_meta_data ->> 'role' = 'mitra'
      then 'mitra'::public.app_role

    else 'mitra'::public.app_role
  end

from auth.users as users

on conflict (id) do nothing;
