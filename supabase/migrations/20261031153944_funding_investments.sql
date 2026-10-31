-- MARIVEST funding commitments: simulation only. No deposits, transfers, or promised returns.
begin;

create table if not exists public.funding_projects (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.business_profiles(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 3 and 160),
  category text not null default 'Budidaya',
  purpose text not null check (char_length(btrim(purpose)) between 5 and 500),
  description text not null default '',
  image_url text,
  target_amount bigint not null check (target_amount between 1 and 1000000000000),
  investor_share_ratio numeric(5,4) not null default 0.3000 check (investor_share_ratio between 0 and 1),
  verification_status text not null default 'pending'
    check (verification_status in ('pending','needs_revision','approved')),
  funding_status text not null default 'open' check (funding_status in ('open','funded')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists funding_projects_business_idx on public.funding_projects(business_id);
create index if not exists funding_projects_public_idx on public.funding_projects(verification_status,funding_status,created_at desc);
alter table public.funding_projects enable row level security;
drop policy if exists funding_projects_select on public.funding_projects;
create policy funding_projects_select on public.funding_projects for select to authenticated using (
  (verification_status = 'approved' and exists (
    select 1 from public.business_profiles b where b.id = business_id and b.verification_status = 'approved'
  ) and exists (
    select 1 from public.investor_registrations r where r.user_id = (select auth.uid()) and r.status = 'active'
  ))
  or exists (select 1 from public.business_profiles b where b.id=business_id and b.owner_id=(select auth.uid()))
  or (select public.is_superadmin())
);
drop policy if exists funding_projects_insert on public.funding_projects;
create policy funding_projects_insert on public.funding_projects for insert to authenticated with check (
  exists (select 1 from public.business_profiles b where b.id=business_id and b.owner_id=(select auth.uid()))
  and verification_status = 'pending' and funding_status = 'open'
);
drop policy if exists funding_projects_update on public.funding_projects;
create policy funding_projects_update on public.funding_projects for update to authenticated using (
  exists (select 1 from public.business_profiles b where b.id=business_id and b.owner_id=(select auth.uid()))
) with check (
  exists (select 1 from public.business_profiles b where b.id=business_id and b.owner_id=(select auth.uid()))
);
revoke all on public.funding_projects from anon,authenticated;
grant select on public.funding_projects to authenticated;
grant insert (business_id,title,category,purpose,description,image_url,target_amount,investor_share_ratio) on public.funding_projects to authenticated;
grant update (title,category,purpose,description,image_url) on public.funding_projects to authenticated;

create table if not exists public.funding_commitments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.funding_projects(id) on delete restrict,
  investor_id uuid not null references public.profiles(id) on delete restrict,
  amount bigint not null check (amount > 0),
  idempotency_key uuid not null unique,
  created_at timestamptz not null default now()
);
create index if not exists funding_commitments_project_idx on public.funding_commitments(project_id);
create index if not exists funding_commitments_investor_idx on public.funding_commitments(investor_id, created_at desc);
alter table public.funding_commitments enable row level security;
drop policy if exists funding_commitments_select on public.funding_commitments;
create policy funding_commitments_select on public.funding_commitments for select to authenticated using (
  investor_id = (select auth.uid())
  or exists (
    select 1 from public.funding_projects f join public.business_profiles b on b.id = f.business_id
    where f.id = project_id and b.owner_id = (select auth.uid())
  )
  or (select public.is_superadmin())
);
revoke all on public.funding_commitments from anon, authenticated;
grant select on public.funding_commitments to authenticated;

create table if not exists public.financial_entries (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.business_profiles(id) on delete cascade,
  project_id uuid references public.funding_projects(id) on delete set null,
  type text not null check (type in ('revenue','cost')),
  amount bigint not null check (amount >= 0),
  period date not null,
  note text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists financial_entries_business_idx on public.financial_entries(business_id);
create index if not exists financial_entries_project_idx on public.financial_entries(project_id);
alter table public.financial_entries enable row level security;
drop policy if exists financial_entries_select on public.financial_entries;
create policy financial_entries_select on public.financial_entries for select to authenticated using (
  exists (select 1 from public.business_profiles b where b.id = business_id and b.owner_id = (select auth.uid()))
  or (select public.is_superadmin())
);
drop policy if exists financial_entries_insert on public.financial_entries;
create policy financial_entries_insert on public.financial_entries for insert to authenticated with check (
  exists (select 1 from public.business_profiles b where b.id = business_id and b.owner_id = (select auth.uid()))
  and (project_id is null or exists (select 1 from public.funding_projects f where f.id = project_id and f.business_id = business_id))
);
revoke all on public.financial_entries from anon,authenticated;
grant select on public.financial_entries to authenticated;
grant insert (business_id,project_id,type,amount,period,note) on public.financial_entries to authenticated;

-- Readonly opportunities, only accessible after active investor registration.
-- Total committed amount is calculated from rows rather than a cached counter.
create or replace function public.list_funding_opportunities()
returns table (
  id uuid, title text, category text, purpose text, description text,
  image_url text, business_name text, city text,
  target_amount bigint, raised_amount bigint, funding_status text,
  investor_share_ratio numeric
)
language plpgsql stable security definer set search_path = '' as $$
declare v_uid uuid := (select auth.uid());
begin
  if v_uid is null or not exists (
    select 1 from public.investor_registrations r where r.user_id=v_uid and r.status='active'
  ) then raise exception 'Active investor registration required'; end if;
  return query
  select f.id, f.title, f.category, f.purpose, f.description, f.image_url,
         b.name, b.city, f.target_amount,
         coalesce((select sum(c.amount) from public.funding_commitments c where c.project_id=f.id),0)::bigint,
         f.funding_status, f.investor_share_ratio
  from public.funding_projects f
  join public.business_profiles b on b.id=f.business_id
  where f.verification_status='approved' and b.verification_status='approved'
    and f.funding_status='open'
  order by f.created_at desc;
end;
$$;
revoke all on function public.list_funding_opportunities() from public,anon;
grant execute on function public.list_funding_opportunities() to authenticated;

create or replace function public.commit_funding(p_project_id uuid,p_amount bigint,p_idempotency_key uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := (select auth.uid()); v_project public.funding_projects%rowtype; v_business public.business_profiles%rowtype;
        v_existing public.funding_commitments%rowtype; v_total bigint; v_id uuid;
begin
  if v_uid is null or not exists (select 1 from public.profiles p where p.id=v_uid and p.role='mitra'::public.app_role) then
    raise exception 'Only mitra accounts can commit funding';
  end if;
  if not exists (select 1 from public.investor_registrations r where r.user_id=v_uid and r.status='active') then
    raise exception 'Active investor registration required';
  end if;
  if p_idempotency_key is null then raise exception 'Idempotency key required'; end if;
  if p_amount is null or p_amount<=0 then raise exception 'Invalid commitment amount'; end if;
  -- Retry safety: the exact same request returns the original ID.
  select * into v_existing from public.funding_commitments c where c.idempotency_key=p_idempotency_key;
  if found then
    if v_existing.investor_id=v_uid and v_existing.project_id=p_project_id and v_existing.amount=p_amount then
      return v_existing.id;
    end if;
    raise exception 'Idempotency key conflict';
  end if;
  select * into v_project from public.funding_projects where id=p_project_id for update;
  if not found then raise exception 'Funding project not found'; end if;
  -- Check again after the project lock: concurrent retries must be idempotent.
  select * into v_existing from public.funding_commitments c where c.idempotency_key=p_idempotency_key;
  if found then
    if v_existing.investor_id=v_uid and v_existing.project_id=p_project_id and v_existing.amount=p_amount then
      return v_existing.id;
    end if;
    raise exception 'Idempotency key conflict';
  end if;
  select * into v_business from public.business_profiles where id=v_project.business_id;
  if v_project.verification_status<>'approved' or v_business.verification_status<>'approved'
    or v_project.funding_status<>'open' then raise exception 'Funding project not open'; end if;
  select coalesce(sum(amount),0) into v_total from public.funding_commitments where project_id=p_project_id;
  if p_amount > v_project.target_amount-v_total then raise exception 'Commitment exceeds remaining target'; end if;
  insert into public.funding_commitments(project_id,investor_id,amount,idempotency_key)
  values(p_project_id,v_uid,p_amount,p_idempotency_key) returning id into v_id;
  if v_total+p_amount = v_project.target_amount then
    update public.funding_projects set funding_status='funded',updated_at=now() where id=p_project_id;
  end if;
  insert into public.notifications(user_id,title,body)
  values(v_uid,'Komitmen tercatat','Komitmen pendanaan Anda telah tersimpan tanpa perpindahan dana.'),
        (v_business.owner_id,'Komitmen baru','Ada komitmen pendanaan baru untuk proyek usaha Anda.');
  return v_id;
end;
$$;
revoke all on function public.commit_funding(uuid,bigint,uuid) from public,anon;
grant execute on function public.commit_funding(uuid,bigint,uuid) to authenticated;

commit;
