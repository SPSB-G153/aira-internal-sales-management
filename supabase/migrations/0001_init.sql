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

insert into sales (sale_reference, customer_name, customer_ic, customer_address, customer_phone, customer_email, project_name, unit_number, unit_type, floor_area, purchase_price, booking_fee, spa_value, loan_amount, loan_percentage, rebate_amount, rebate_percentage, salesperson_name, sale_date, status) values
('S-2025-001', 'Tan Wei Ming', '880123-14-5678', '12 Jalan Bukit Bintang, 55100 Kuala Lumpur', '+60 12-345 6789', 'weiming.tan@email.com', 'Aira Heights', 'A-12-03', '3-Bedroom Condominium', 1200, 850000, 10000, 850000, 680000, 80, 42500, 5, 'Lee Chong Wei', '2025-01-15', 'confirmed'),
('S-2025-002', 'Nurul Aisyah binti Rahman', '901028-08-1234', '45 Taman Tun Dr Ismail, 60000 Kuala Lumpur', '+60 17-888 4321', 'aisyah.rahman@email.com', 'Aira Heights', 'B-08-15', '2-Bedroom Condominium', 950, 650000, 8000, 650000, 520000, 80, 32500, 5, 'Lim Chee Keong', '2025-01-22', 'confirmed'),
('S-2025-003', 'Raj a/l Kumar', '850315-14-9876', '78 Jalan PJU 8/1, Damansara Perdana, 47820 Petaling Jaya', '+60 13-222 8765', 'raj.kumar@email.com', 'Aira Residence', 'C-05-01', 'Studio Apartment', 650, 420000, 5000, 420000, 336000, 80, 21000, 5, 'Lee Chong Wei', '2025-02-03', 'draft'),
('S-2025-004', 'Siti Aminah binti Ismail', '920711-10-3456', '23 Jalan Seri Hartamas, 50480 Kuala Lumpur', '+60 19-666 1122', 'siti.aminah@email.com', 'Aira Heights', 'D-20-10', 'Penthouse', 2400, 1850000, 20000, 1850000, 1480000, 80, 92500, 5, 'Lim Chee Keong', '2025-02-10', 'confirmed')
on conflict (sale_reference) do nothing;

insert into documents (sale_id, document_type, content, status, generated_at)
select id, 'pre_booking_form', jsonb_build_object('sale_reference', sale_reference, 'customer_name', customer_name, 'customer_ic', customer_ic, 'customer_address', customer_address, 'customer_phone', customer_phone, 'project_name', project_name, 'unit_number', unit_number, 'unit_type', unit_type, 'floor_area', floor_area, 'purchase_price', purchase_price, 'booking_fee', booking_fee, 'salesperson_name', salesperson_name, 'sale_date', sale_date), 'generated', now()
from sales where sale_reference = 'S-2025-001'
on conflict (sale_id, document_type) do nothing;

insert into documents (sale_id, document_type, content, status, generated_at)
select id, 'acceptance_letter', jsonb_build_object('sale_reference', sale_reference, 'customer_name', customer_name, 'customer_ic', customer_ic, 'project_name', project_name, 'unit_number', unit_number, 'purchase_price', purchase_price, 'spa_value', spa_value, 'sale_date', sale_date), 'generated', now()
from sales where sale_reference = 'S-2025-001'
on conflict (sale_id, document_type) do nothing;

insert into documents (sale_id, document_type, content, status, generated_at)
select id, 'hovp_letter', jsonb_build_object('sale_reference', sale_reference, 'customer_name', customer_name, 'customer_ic', customer_ic, 'project_name', project_name, 'unit_number', unit_number, 'purchase_price', purchase_price, 'loan_amount', loan_amount, 'loan_percentage', loan_percentage, 'sale_date', sale_date), 'generated', now()
from sales where sale_reference = 'S-2025-001'
on conflict (sale_id, document_type) do nothing;

insert into documents (sale_id, document_type, content, status, generated_at)
select id, 'rebate_letter', jsonb_build_object('sale_reference', sale_reference, 'customer_name', customer_name, 'customer_ic', customer_ic, 'project_name', project_name, 'unit_number', unit_number, 'purchase_price', purchase_price, 'rebate_amount', rebate_amount, 'rebate_percentage', rebate_percentage, 'sale_date', sale_date), 'generated', now()
from sales where sale_reference = 'S-2025-001'
on conflict (sale_id, document_type) do nothing;

insert into documents (sale_id, document_type, content, status, generated_at)
select id, 'pre_booking_form', jsonb_build_object('sale_reference', sale_reference, 'customer_name', customer_name, 'customer_ic', customer_ic, 'project_name', project_name, 'unit_number', unit_number, 'purchase_price', purchase_price, 'booking_fee', booking_fee, 'salesperson_name', salesperson_name, 'sale_date', sale_date), 'generated', now()
from sales where sale_reference = 'S-2025-002'
on conflict (sale_id, document_type) do nothing;

insert into documents (sale_id, document_type, content, status, generated_at)
select id, 'acceptance_letter', jsonb_build_object('sale_reference', sale_reference, 'customer_name', customer_name, 'customer_ic', customer_ic, 'project_name', project_name, 'unit_number', unit_number, 'purchase_price', purchase_price, 'spa_value', spa_value, 'sale_date', sale_date), 'generated', now()
from sales where sale_reference = 'S-2025-002'
on conflict (sale_id, document_type) do nothing;