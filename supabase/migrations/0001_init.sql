-- Shared backend schema for expense-tracker (see openspec/changes/add-shared-backend/design.md)

create table categories (
  id           bigint generated always as identity primary key,
  name         text not null unique,
  is_daily     boolean not null default false,
  is_archived  boolean not null default false,
  sort_order   integer not null default 0
);

create table transactions (
  id                 bigint generated always as identity primary key,
  date               date not null,
  category_id        bigint not null references categories(id) on delete restrict,
  amount_cents       integer not null check (amount_cents <> 0),
  note               text not null default '',
  import_row_index   integer unique,
  created_at         timestamptz not null default now()
);

create table month_flags (
  id           bigint generated always as identity primary key,
  month        date not null unique,
  is_complete  boolean not null
);

create table average_exclusions (
  id           bigint generated always as identity primary key,
  category_id  bigint not null references categories(id) on delete restrict,
  month        date not null,
  reason       text not null default '',
  unique (category_id, month)
);

alter table categories enable row level security;
alter table transactions enable row level security;
alter table month_flags enable row level security;
alter table average_exclusions enable row level security;

create policy "authenticated full access" on categories
  for all to authenticated using (true) with check (true);

create policy "authenticated full access" on transactions
  for all to authenticated using (true) with check (true);

create policy "authenticated full access" on month_flags
  for all to authenticated using (true) with check (true);

create policy "authenticated full access" on average_exclusions
  for all to authenticated using (true) with check (true);
