
-- Promote the designated MARIVEST administrator.
-- This migration does not create or modify Auth credentials.

do $$
declare
  admin_user_id uuid;
begin
  select id
  into admin_user_id
  from auth.users
  where lower(email) = lower('admin@gmail.com')
  limit 1;

  if admin_user_id is null then
    raise exception
      'Admin account admin@gmail.com does not exist in Supabase Auth.';
  end if;

  insert into public.profiles (
    id,
    full_name,
    role
  )
  values (
    admin_user_id,
    'MARIVEST Administrator',
    'superadmin'::public.app_role
  )
  on conflict (id)
  do update set
    role = 'superadmin'::public.app_role,
    updated_at = now();
end;
$$;
