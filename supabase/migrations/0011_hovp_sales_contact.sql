-- Sales personnel contact details printed in item 5 of the HOVP letter.
alter table sales add column if not exists salesperson_designation text;
alter table sales add column if not exists salesperson_mobile text;
alter table sales add column if not exists salesperson_email text;
