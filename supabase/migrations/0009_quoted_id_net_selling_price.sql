alter table public.sales
  add column if not exists quoted_id_net_selling_price numeric;
