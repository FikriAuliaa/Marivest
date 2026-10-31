-- MARIVEST financial lifecycle: ALL amounts and fundings are SIMULATIONS, never real funds.
-- Additive migration; does not modify previously applied migrations.
begin;

alter table public.funding_projects
  add column if not exists term_months integer,
  add column if not exists risk_summary text;

do $$ begin
  if not exists (select 1 from pg_constraint where conname='funding_project_term_months_check' and conrelid='public.funding_projects'::regclass) then
    alter table public.funding_projects add constraint funding_project_term_months_check
      check (term_months is null or term_months between 1 and 36);
  end if;
  if not exists (select 1 from pg_constraint where conname='funding_project_risk_summary_check' and conrelid='public.funding_projects'::regclass) then
    alter table public.funding_projects add constraint funding_project_risk_summary_check
      check (risk_summary is null or char_length(btrim(risk_summary)) between 20 and 2000);
  end if;
end $$;

grant insert (term_months,risk_summary) on public.funding_projects to authenticated;
grant update (term_months,risk_summary) on public.funding_projects to authenticated;

-- Once the project is approved, the proposal and its risk disclosure cannot be silently edited.
create or replace function public.guard_approved_funding_terms()
returns trigger language plpgsql set search_path = '' as $$
begin
  if old.verification_status='approved' and
     (new.title is distinct from old.title or
      new.category is distinct from old.category or
      new.purpose is distinct from old.purpose or
      new.description is distinct from old.description or
      new.image_url is distinct from old.image_url or
      new.target_amount is distinct from old.target_amount or
      new.investor_share_ratio is distinct from old.investor_share_ratio or
      new.term_months is distinct from old.term_months or
      new.risk_summary is distinct from old.risk_summary or
      new.business_id is distinct from old.business_id) then
    raise exception 'Approved funding terms are immutable';
  end if;
  return new;
end;
$$;
drop trigger if exists guard_approved_funding_terms_trigger on public.funding_projects;
create trigger guard_approved_funding_terms_trigger
  before update on public.funding_projects for each row
  execute function public.guard_approved_funding_terms();

create table if not exists public.funding_project_reviews (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.funding_projects(id) on delete restrict,
  reviewer_id uuid not null references public.profiles(id) on delete restrict,
  decision text not null check (decision in ('approved','needs_revision')),
  note text not null default '',
  reviewed_at timestamptz not null default now()
);
create index if not exists funding_project_reviews_project_idx on public.funding_project_reviews(project_id,reviewed_at desc);
alter table public.funding_project_reviews enable row level security;
drop policy if exists funding_project_reviews_read on public.funding_project_reviews;
create policy funding_project_reviews_read on public.funding_project_reviews for select to authenticated using (
  (select public.is_superadmin()) or exists (
    select 1 from public.funding_projects f join public.business_profiles b on b.id=f.business_id
    where f.id=project_id and b.owner_id=(select auth.uid())
  )
);
revoke all on public.funding_project_reviews from anon,authenticated;
grant select on public.funding_project_reviews to authenticated;

create or replace function public.review_funding_project(p_project_id uuid,p_decision text,p_note text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_project public.funding_projects%rowtype;
  v_owner uuid;
  v_business_status text;
  v_note text := btrim(coalesce(p_note,''));
begin
  if v_uid is null or not public.is_superadmin() then raise exception 'SuperAdmin access required'; end if;
  if p_decision not in ('approved','needs_revision') or p_decision is null then raise exception 'Invalid review decision'; end if;
  if char_length(v_note)>1000 or (p_decision='needs_revision' and char_length(v_note)<8) then
    raise exception 'Revision must have an explanation of at least 8 characters';
  end if;
  select * into v_project from public.funding_projects where id=p_project_id for update;
  if not found then raise exception 'Project not found'; end if;
  if v_project.verification_status not in ('pending','needs_revision') or v_project.funding_status<>'open' then
    raise exception 'Project is not awaiting review';
  end if;
  if exists (select 1 from public.funding_commitments where project_id=p_project_id) then
    raise exception 'Cannot review a project that already has commitments';
  end if;
  select b.owner_id,b.verification_status into v_owner,v_business_status
  from public.business_profiles b where b.id=v_project.business_id;
  if p_decision='approved' then
    if v_business_status<>'approved' then raise exception 'Business profile is not approved'; end if;
    if v_project.term_months is null or v_project.risk_summary is null or char_length(btrim(v_project.risk_summary))<20 then
      raise exception 'Funding duration and business risk disclosure are required';
    end if;
  end if;
  update public.funding_projects set verification_status=p_decision, updated_at=now() where id=p_project_id;
  insert into public.funding_project_reviews(project_id,reviewer_id,decision,note)
  values(p_project_id,v_uid,p_decision,v_note);
  insert into public.notifications(user_id,title,body) values
  (v_owner,
   case when p_decision='approved' then 'Proyek pendanaan disetujui' else 'Pengajuan pendanaan perlu revisi' end,
   case when p_decision='approved' then 'Proyek '||v_project.title||' kini dapat dilihat Investor aktif. Semua pendanaan adalah simulasi.'
        else 'Proyek '||v_project.title||' perlu diperbaiki: '||v_note end);
end;
$$;
revoke all on function public.review_funding_project(uuid,text,text) from public,anon;
grant execute on function public.review_funding_project(uuid,text,text) to authenticated;

-- Project-specific revenue and cost, not Marketplace sales. Entries are append-only.
-- Project entries may only be added after the simulated funding target has been reached.
create or replace function public.guard_funding_financial_entry()
returns trigger language plpgsql set search_path = '' as $$
declare v_project public.funding_projects%rowtype;
begin
  if new.project_id is not null then
    select * into v_project from public.funding_projects where id=new.project_id for share;
    if not found or v_project.business_id<>new.business_id then
      raise exception 'Financial entry business does not match its project';
    end if;
    if v_project.verification_status<>'approved' or v_project.funding_status<>'funded' then
      raise exception 'Project reporting starts only after the funding target is reached';
    end if;
  end if;
  if new.period>(now() at time zone 'Asia/Jakarta')::date then raise exception 'Future financial periods are not allowed'; end if;
  if char_length(btrim(new.note)) not between 3 and 500 then raise exception 'Financial note must be 3 to 500 characters'; end if;
  return new;
end;
$$;
drop trigger if exists guard_funding_financial_entry_trigger on public.financial_entries;
create trigger guard_funding_financial_entry_trigger
  before insert on public.financial_entries for each row execute function public.guard_funding_financial_entry();

-- Aggregate read authorization. Approved projects are transparent to active Investors.
create or replace function public.can_read_funding_report(p_project_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.funding_projects f join public.business_profiles b on b.id=f.business_id
    where f.id=p_project_id and (
      b.owner_id=(select auth.uid()) or (select public.is_superadmin()) or
      (f.verification_status='approved' and b.verification_status='approved' and exists (
        select 1 from public.profiles p join public.investor_registrations r on r.user_id=p.id
        where p.id=(select auth.uid()) and p.role='mitra'::public.app_role and r.status='active'
      ))
    )
  );
$$;
revoke all on function public.can_read_funding_report(uuid) from public,anon;
grant execute on function public.can_read_funding_report(uuid) to authenticated;

-- Numerical model: every pro-rata share is floored. Every rounding remainder belongs to the seller.
-- No monetary movement, profit guarantee, principal return, or loss settlement is implemented.
create or replace function public.funding_financial_snapshot(p_project_id uuid)
returns table (
  total_committed bigint, investor_count integer, total_revenue bigint, total_cost bigint,
  net_profit bigint, investor_pool bigint, allocated_to_investors bigint,
  seller_share bigint, rounding_to_seller bigint, my_commitment bigint, my_profit_share bigint
)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_project public.funding_projects%rowtype;
  v_total bigint := 0;
  v_count integer := 0;
  v_revenue bigint := 0;
  v_cost bigint := 0;
  v_profit bigint := 0;
  v_pool bigint := 0;
  v_allocated bigint := 0;
  v_mine bigint := 0;
  v_my_share bigint := 0;
begin
  if (select auth.uid()) is null or not public.can_read_funding_report(p_project_id) then
    raise exception 'Funding project is not accessible';
  end if;
  select * into v_project from public.funding_projects where id=p_project_id;
  if not found then raise exception 'Project not found'; end if;
  select coalesce(sum(c.amount),0)::bigint, count(distinct c.investor_id)::integer
    into v_total,v_count from public.funding_commitments c where c.project_id=p_project_id;
  select coalesce(sum(e.amount) filter (where e.type='revenue'),0)::bigint,
         coalesce(sum(e.amount) filter (where e.type='cost'),0)::bigint
    into v_revenue,v_cost from public.financial_entries e where e.project_id=p_project_id;
  v_profit := v_revenue-v_cost;
  select coalesce(sum(c.amount),0)::bigint into v_mine from public.funding_commitments c
    where c.project_id=p_project_id and c.investor_id=(select auth.uid());
  if v_profit>0 and v_total>0 and v_project.funding_status='funded' then
    v_pool := floor(v_profit::numeric*v_project.investor_share_ratio)::bigint;
    select coalesce(sum(floor(v_pool::numeric*t.amount/v_total)::bigint),0)::bigint
    into v_allocated from (
      select c.investor_id,sum(c.amount)::bigint as amount
      from public.funding_commitments c where c.project_id=p_project_id group by c.investor_id
    ) t;
    v_my_share := floor(v_pool::numeric*v_mine/v_total)::bigint;
  end if;
  return query select v_total,v_count,v_revenue,v_cost,v_profit,v_pool,v_allocated,
     case when v_profit>0 and v_project.funding_status='funded' then v_profit-v_allocated else 0::bigint end,
     v_pool-v_allocated,v_mine,v_my_share;
end;
$$;
revoke all on function public.funding_financial_snapshot(uuid) from public,anon;
grant execute on function public.funding_financial_snapshot(uuid) to authenticated;

create or replace function public.funding_period_history(p_project_id uuid)
returns table (period_month date, revenue bigint, cost bigint, net bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null or not public.can_read_funding_report(p_project_id) then
    raise exception 'Funding project is not accessible';
  end if;
  return query
    select date_trunc('month',e.period)::date,
      coalesce(sum(e.amount) filter (where e.type='revenue'),0)::bigint,
      coalesce(sum(e.amount) filter (where e.type='cost'),0)::bigint,
      (coalesce(sum(e.amount) filter (where e.type='revenue'),0)-
       coalesce(sum(e.amount) filter (where e.type='cost'),0))::bigint
    from public.financial_entries e where e.project_id=p_project_id
    group by date_trunc('month',e.period)::date order by 1 desc;
end;
$$;
revoke all on function public.funding_period_history(uuid) from public,anon;
grant execute on function public.funding_period_history(uuid) to authenticated;

-- Do not hide fully funded projects: participants must be able to inspect their records.
create or replace function public.list_funding_opportunities()
returns table (
  id uuid, title text, category text, purpose text, description text,
  image_url text, business_name text, city text,
  target_amount bigint, raised_amount bigint, funding_status text,
  investor_share_ratio numeric
)
language plpgsql stable security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null or not exists (
    select 1 from public.profiles p join public.investor_registrations r on r.user_id=p.id
    where p.id=(select auth.uid()) and p.role='mitra'::public.app_role and r.status='active'
  ) then raise exception 'Active Investor registration required'; end if;
  return query
    select f.id,f.title,f.category,f.purpose,f.description,f.image_url,b.name,b.city,
      f.target_amount,coalesce((select sum(c.amount) from public.funding_commitments c where c.project_id=f.id),0)::bigint,
      f.funding_status,f.investor_share_ratio
    from public.funding_projects f join public.business_profiles b on b.id=f.business_id
    where f.verification_status='approved' and b.verification_status='approved'
    order by case when f.funding_status='open' then 0 else 1 end, f.created_at desc;
end;
$$;
revoke all on function public.list_funding_opportunities() from public,anon;
grant execute on function public.list_funding_opportunities() to authenticated;


-- Seller can resubmit a project flagged for revision, but never change approved terms.
create or replace function public.resubmit_funding_project(
  p_project_id uuid, p_title text, p_category text, p_purpose text,
  p_description text, p_target_amount bigint, p_investor_share_ratio numeric,
  p_term_months integer, p_risk_summary text
)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_project public.funding_projects%rowtype;
  v_owner uuid;
begin
  if (select auth.uid()) is null then raise exception 'Authentication required'; end if;
  select * into v_project from public.funding_projects where id=p_project_id for update;
  if not found or v_project.verification_status<>'needs_revision' or v_project.funding_status<>'open' then
    raise exception 'Only projects needing revision can be resubmitted';
  end if;
  select b.owner_id into v_owner from public.business_profiles b where b.id=v_project.business_id
    and b.verification_status='approved';
  if v_owner is distinct from (select auth.uid()) then raise exception 'Not the business owner'; end if;
  if exists (select 1 from public.funding_commitments c where c.project_id=p_project_id) then
    raise exception 'Cannot change terms after commitments';
  end if;
  if char_length(btrim(coalesce(p_title,''))) not between 3 and 160
     or char_length(btrim(coalesce(p_category,''))) not between 2 and 80
     or char_length(btrim(coalesce(p_purpose,''))) not between 5 and 500
     or char_length(coalesce(p_description,''))>2000
     or p_target_amount is null or p_target_amount not between 1 and 1000000000000
     or p_investor_share_ratio is null or p_investor_share_ratio<0 or p_investor_share_ratio>1
     or p_term_months is null or p_term_months not between 1 and 36
     or char_length(btrim(coalesce(p_risk_summary,''))) not between 20 and 2000 then
    raise exception 'Invalid project terms';
  end if;
  update public.funding_projects set
    title=btrim(p_title),category=btrim(p_category),purpose=btrim(p_purpose),
    description=btrim(coalesce(p_description,'')),target_amount=p_target_amount,
    investor_share_ratio=p_investor_share_ratio,term_months=p_term_months,
    risk_summary=btrim(p_risk_summary),verification_status='pending',updated_at=now()
    where id=p_project_id;
end;
$$;
revoke all on function public.resubmit_funding_project(uuid,text,text,text,text,bigint,numeric,integer,text) from public,anon;
grant execute on function public.resubmit_funding_project(uuid,text,text,text,text,bigint,numeric,integer,text) to authenticated;


-- Basic manual business verification supports new fisheries sellers without bypassing RBAC.
create table if not exists public.business_profile_reviews (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.business_profiles(id) on delete restrict,
  reviewer_id uuid not null references public.profiles(id) on delete restrict,
  decision text not null check (decision in ('approved','needs_revision')),
  note text not null default '',
  reviewed_at timestamptz not null default now()
);
create index if not exists business_profile_reviews_business_idx on public.business_profile_reviews(business_id,reviewed_at desc);
alter table public.business_profile_reviews enable row level security;
drop policy if exists business_profile_reviews_read on public.business_profile_reviews;
create policy business_profile_reviews_read on public.business_profile_reviews for select to authenticated using (
  (select public.is_superadmin()) or exists (
    select 1 from public.business_profiles b where b.id=business_id and b.owner_id=(select auth.uid())
  )
);
revoke all on public.business_profile_reviews from anon,authenticated;
grant select on public.business_profile_reviews to authenticated;

create or replace function public.review_business_profile(p_business_id uuid,p_decision text,p_note text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_business public.business_profiles%rowtype;
  v_note text := btrim(coalesce(p_note,''));
begin
  if v_uid is null or not public.is_superadmin() then raise exception 'SuperAdmin access required'; end if;
  if p_decision not in ('approved','needs_revision') or p_decision is null then raise exception 'Invalid decision'; end if;
  if char_length(v_note)>1000 or (p_decision='needs_revision' and char_length(v_note)<8) then
    raise exception 'Revision needs explanation of 8 to 1000 characters';
  end if;
  select * into v_business from public.business_profiles where id=p_business_id for update;
  if not found or v_business.verification_status not in ('pending','needs_revision') then
    raise exception 'Business is not awaiting verification';
  end if;
  update public.business_profiles set verification_status=p_decision, updated_at=now() where id=p_business_id;
  insert into public.business_profile_reviews(business_id,reviewer_id,decision,note)
    values(p_business_id,v_uid,p_decision,v_note);
  insert into public.notifications(user_id,title,body) values
    (v_business.owner_id,
     case when p_decision='approved' then 'Profil usaha disetujui' else 'Profil usaha perlu revisi' end,
     case when p_decision='approved' then 'Usaha '||v_business.name||' lolos verifikasi administratif.'
          else 'Profil usaha '||v_business.name||' perlu diperbaiki: '||v_note end);
end;
$$;
revoke all on function public.review_business_profile(uuid,text,text) from public,anon;
grant execute on function public.review_business_profile(uuid,text,text) to authenticated;


-- Optional reproducible MVP fixture. Nothing is funded in advance and review remains mandatory.
-- The proposed six-month cycle and listed costs/risks are demo assumptions, not verified facts.
insert into public.funding_projects (
  business_id,title,category,purpose,description,target_amount,investor_share_ratio,
  term_months,risk_summary,verification_status,funding_status
)
select b.id,
  'Penguatan Budidaya Ikan Bandeng Mina Bahari',
  'Budidaya',
  'Modal operasional budidaya ikan bandeng termasuk pakan dan perawatan kolam (asumsi simulasi).',
  'Proyek simulasi berdasarkan skenario Mina Bahari di proposal. Belum ada dana yang benar-benar diterima.',
  5000000,0.3000,6,
  'Risiko penyakit ikan, fluktuasi biaya pakan, kondisi cuaca, dan gagal panen dapat menyebabkan kerugian. Ini adalah asumsi risiko untuk demonstrasi.',
  'pending','open'
from public.business_profiles b join auth.users u on u.id=b.owner_id
where lower(u.email)='minabahari@gmail.com' and b.verification_status='approved'
  and not exists (
    select 1 from public.funding_projects f
    where f.business_id=b.id and f.title='Penguatan Budidaya Ikan Bandeng Mina Bahari'
  )
order by b.created_at asc limit 1;

commit;
