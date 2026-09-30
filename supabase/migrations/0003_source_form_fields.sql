-- Fields required by the source Aira Booking Form, Notice of Acceptance and Rebate Letter.
-- All are nullable so existing sales and teams remain compatible.

alter table sales add column if not exists customer_name_2 text;
alter table sales add column if not exists customer_ic_2 text;
alter table sales add column if not exists customer_salutation text;
alter table sales add column if not exists customer_tin text;
alter table sales add column if not exists customer_nationality text;
alter table sales add column if not exists customer_sex text;
alter table sales add column if not exists customer_race text;
alter table sales add column if not exists bumi_status boolean;
alter table sales add column if not exists customer_occupation text;
alter table sales add column if not exists contact_person text;
alter table sales add column if not exists storey_number text;
alter table sales add column if not exists floor_area_sqm numeric;
alter table sales add column if not exists car_parking_bay text;
alter table sales add column if not exists agent_company text;
alter table sales add column if not exists proprietor_name text;
alter table sales add column if not exists solicitor_name text;
alter table sales add column if not exists authorised_signatory_name text;
alter table sales add column if not exists authorised_signatory_position text;
