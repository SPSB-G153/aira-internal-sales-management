-- Internal follow-up after a Notice of Acceptance is issued.
-- These fields do not alter any approved document template or snapshot.
alter table public.sales
  add column if not exists notice_issued_at date,
  add column if not exists spa_signing_due_at date,
  add column if not exists spa_signing_scheduled_at date,
  add column if not exists spa_signed_at date,
  add column if not exists balance_deposit_received_at date,
  add column if not exists balance_deposit_payment_method text check (balance_deposit_payment_method in ('cheque', 'bank_transfer', 'cash')),
  add column if not exists balance_deposit_reference text,
  add column if not exists inventory_required boolean,
  add column if not exists inventory_payment_amount numeric,
  add column if not exists inventory_payment_received_at date,
  add column if not exists inventory_payment_method text check (inventory_payment_method in ('cheque', 'bank_transfer', 'cash')),
  add column if not exists inventory_payment_reference text;

-- Initialise the three revised Notices supplied on 6 November 2026.
update public.sales set notice_issued_at='2026-11-10', spa_signing_due_at='2026-11-24'
where upper(regexp_replace(unit_number,'[^A-Z0-9]','','g'))='A013A';

update public.sales set notice_issued_at='2026-11-05', spa_signing_due_at='2026-11-19'
where upper(regexp_replace(unit_number,'[^A-Z0-9]','','g')) in ('A0303','B0801');

-- Approved show-unit inventory master supplied on 6 November 2026.
update public.sales
set inventory_required=true,
    inventory_payment_amount=case upper(regexp_replace(unit_number,'[^A-Z0-9]','','g'))
      when 'AG02' then 850000
      when 'A013A' then 800000
      when 'B13A03' then 500000
      when 'B3A03' then 450000
      when 'B0801' then 450000
      when 'B0104' then 520000
    end
where upper(regexp_replace(unit_number,'[^A-Z0-9]','','g')) in ('AG02','A013A','B13A03','B3A03','B0801','B0104');
