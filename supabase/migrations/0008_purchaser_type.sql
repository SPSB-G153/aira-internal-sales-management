-- Selects the matching individual or company supporting-document wording.
alter table sales add column if not exists purchaser_type text not null default 'individual'
  check (purchaser_type in ('individual', 'company'));
