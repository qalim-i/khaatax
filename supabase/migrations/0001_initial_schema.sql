-- Initial schema per docs/TRD.md Section 3. Treat the TRD as source of truth.

create table users (
  id            uuid primary key references auth.users,
  name          text not null,
  role          text not null check (role in ('owner','manager')),
  created_at    timestamptz default now()
);

create table parties (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null,
  contact            text,
  security_deposit   numeric not null default 0,
  balance            numeric not null default 0,
  created_at         timestamptz default now()
);

create sequence invoice_no_seq start 201;
create sequence dc_no_seq start 101;

create table transactions (
  id               uuid primary key default gen_random_uuid(),
  party_id         uuid not null references parties(id),
  date             date not null default current_date,
  invoice_no       integer not null unique,
  dc_no            integer not null unique,
  cylinder_type    text not null,
  filled_sent      integer not null default 0,
  empty_received   integer not null default 0,
  created_by       uuid not null references users(id),
  created_at       timestamptz default now()
);

create table stock (
  status      text primary key check (status in
              ('filled','empty','at_customer','under_refill','damaged')),
  quantity    integer not null default 0,
  updated_at  timestamptz default now()
);

insert into stock (status, quantity) values
  ('filled', 0),
  ('empty', 0),
  ('at_customer', 0),
  ('under_refill', 0),
  ('damaged', 0);

create table expenses (
  id           uuid primary key default gen_random_uuid(),
  date         date not null default current_date,
  amount       numeric not null check (amount > 0),
  category     text not null,
  note         text,
  created_by   uuid not null references users(id),
  created_at   timestamptz default now()
);

create table employees (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  role          text,
  monthly_pay   numeric not null check (monthly_pay >= 0),
  active        boolean not null default true,
  created_at    timestamptz default now()
);

-- Row-Level Security (TRD Section 5.2)

alter table users enable row level security;
alter table parties enable row level security;
alter table transactions enable row level security;
alter table stock enable row level security;
alter table expenses enable row level security;
alter table employees enable row level security;

create policy "read_own_user" on users
  for select using (id = auth.uid());

create policy "owner_and_manager_full_access" on parties
  for all
  using (auth.jwt() ->> 'role' in ('owner', 'manager'))
  with check (auth.jwt() ->> 'role' in ('owner', 'manager'));

create policy "owner_and_manager_full_access" on transactions
  for all
  using (auth.jwt() ->> 'role' in ('owner', 'manager'))
  with check (auth.jwt() ->> 'role' in ('owner', 'manager'));

create policy "owner_and_manager_full_access" on stock
  for all
  using (auth.jwt() ->> 'role' in ('owner', 'manager'))
  with check (auth.jwt() ->> 'role' in ('owner', 'manager'));

create policy "owner_and_manager_full_access" on expenses
  for all
  using (auth.jwt() ->> 'role' in ('owner', 'manager'))
  with check (auth.jwt() ->> 'role' in ('owner', 'manager'));

-- employees: owner only. No policy is defined for 'manager' — absence of a
-- matching policy means all access is denied by default under RLS.
create policy "owner_full_access" on employees
  for all
  using (auth.jwt() ->> 'role' = 'owner')
  with check (auth.jwt() ->> 'role' = 'owner');
