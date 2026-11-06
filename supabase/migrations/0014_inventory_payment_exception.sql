-- Generic inventory payment arrangement, with A-01-3A as the first approved exception.
alter table public.sales
  add column if not exists inventory_payment_not_required boolean default false;

update public.sales
set inventory_required=true,
    inventory_payment_not_required=true,
    inventory_payment_received_at=null,
    inventory_payment_method=null,
    inventory_payment_reference=null
where upper(regexp_replace(unit_number,'[^A-Z0-9]','','g'))='A013A';
