-- Tracking-only fields for solicitor-managed SPA and MOT progression.
-- These fields never generate or alter either legal instrument.
alter table public.sales
  add column if not exists foreign_consent_required boolean default false,
  add column if not exists foreign_consent_application_at date,
  add column if not exists foreign_consent_received_at date,
  add column if not exists purchase_funding_method text check (purchase_funding_method in ('cash','financing')),
  add column if not exists financier_undertaking_received_at date,
  add column if not exists differential_sum_received_at date,
  add column if not exists spa_sent_to_developer_at date,
  add column if not exists spa_developer_executed_at date,
  add column if not exists mot_signed_at date,
  add column if not exists mot_adjudication_submitted_at date,
  add column if not exists mot_stamp_duty_paid_at date,
  add column if not exists balance_purchase_price_received_at date,
  add column if not exists original_title_requested_at date,
  add column if not exists original_title_released_at date,
  add column if not exists mot_registration_submitted_at date,
  add column if not exists mot_registered_at date,
  add column if not exists vacant_possession_delivered_at date;
