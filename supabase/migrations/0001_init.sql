create table if not exists sales (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  sale_reference text not null,
  customer_name text not null,
  customer_ic text,
  customer_address text,
  customer_phone text,
  customer_email text,
  project_name text not null,
  unit_number text,
  unit_type text,
  floor_area numeric,
  purchase_price numeric not null,
  booking_fee numeric,
  spa_value numeric,
  loan_amount numeric,
  loan_percentage numeric,
  rebate_amount numeric,
  rebate_percentage numeric,
  salesperson_name text,
  sale_date date,
  status text not null default 'draft',
  created_at timestamptz not null default now()
);

create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  sale_id uuid not null,
  document_type text not null,
  content jsonb not null default '{}'::jsonb,
  status text not null default 'pending',
  generated_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists sales_sale_reference_idx on sales (sale_reference);
create unique index if not exists documents_sale_type_idx on documents (sale_id, document_type);

alter table sales enable row level security;
drop policy if exists "sales_v1_read" on sales;
create policy "sales_v1_read" on sales for select using (true);
drop policy if exists "sales_v1_write" on sales;
create policy "sales_v1_write" on sales for all using (true) with check (true);

alter table documents enable row level security;
drop policy if exists "documents_v1_read" on documents;
create policy "documents_v1_read" on documents for select using (true);
drop policy if exists "documents_v1_write" on documents;
create policy "documents_v1_write" on documents for all using (true) with check (true);
