-- Core SplitSmart schema (applied as migration "splitsmart_core_schema" on 2026-10-17).

-- Tables ------------------------------------------------------------
create table public.groups (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (length(trim(name)) > 0),
  created_at timestamptz not null default now()
);

create table public.members (
  id       uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  name     text not null check (length(trim(name)) > 0)
);
create index members_group_id_idx on public.members (group_id);

create table public.expenses (
  id           uuid primary key default gen_random_uuid(),
  group_id     uuid not null references public.groups (id) on delete cascade,
  paid_by      uuid not null references public.members (id),
  amount_cents bigint not null check (amount_cents > 0),
  description  text not null check (length(trim(description)) > 0),
  created_at   timestamptz not null default now()
);
create index expenses_group_id_idx on public.expenses (group_id);
create index expenses_paid_by_idx  on public.expenses (paid_by);

create table public.expense_splits (
  expense_id   uuid not null references public.expenses (id) on delete cascade,
  member_id    uuid not null references public.members (id),
  amount_cents bigint not null check (amount_cents >= 0),
  primary key (expense_id, member_id)
);
create index expense_splits_member_id_idx on public.expense_splits (member_id);

-- Row Level Security (on, but permissive for this learning project) --
alter table public.groups         enable row level security;
alter table public.members        enable row level security;
alter table public.expenses       enable row level security;
alter table public.expense_splits enable row level security;

create policy "anyone can read groups"   on public.groups         for select to anon, authenticated using (true);
create policy "anyone can insert groups" on public.groups         for insert to anon, authenticated with check (true);
create policy "anyone can read members"   on public.members        for select to anon, authenticated using (true);
create policy "anyone can insert members" on public.members        for insert to anon, authenticated with check (true);
create policy "anyone can read expenses"   on public.expenses       for select to anon, authenticated using (true);
create policy "anyone can insert expenses" on public.expenses       for insert to anon, authenticated with check (true);
create policy "anyone can read splits"   on public.expense_splits for select to anon, authenticated using (true);
create policy "anyone can insert splits" on public.expense_splits for insert to anon, authenticated with check (true);

-- Balances view ------------------------------------------------------
create view public.balances
with (security_invoker = true) as
select
  m.id       as member_id,
  m.group_id,
  m.name,
  coalesce(p.total_paid, 0)                              as total_paid_cents,
  coalesce(s.total_share, 0)                             as total_share_cents,
  coalesce(p.total_paid, 0) - coalesce(s.total_share, 0) as net_cents
from public.members m
left join (select paid_by, sum(amount_cents) as total_paid
           from public.expenses group by paid_by) p on p.paid_by = m.id
left join (select member_id, sum(amount_cents) as total_share
           from public.expense_splits group by member_id) s on s.member_id = m.id;
