alter table sales add column if not exists approved_selling_price numeric;
alter table sales add column if not exists additional_revenue numeric;
alter table sales add column if not exists repeat_buyer_discount numeric;
alter table sales add column if not exists pop_introduction_agent text;
alter table sales add column if not exists pop_introduction_spsb text;
alter table sales add column if not exists pop_assisting_member_2 text;
alter table sales add column if not exists pop_conditions_note text;
