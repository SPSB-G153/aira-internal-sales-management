alter table public.sales
  add column if not exists payment_method text check (payment_method in ('cheque', 'bank_transfer')),
  add column if not exists payment_reference text;
