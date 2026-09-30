-- Team tenancy foundation. The fixed demo team keeps the public, no-login demo
-- working while authenticated users can be scoped through team memberships.

create table if not exists teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists team_memberships (
  team_id uuid not null references teams(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  primary key (team_id, user_id)
);

create table if not exists team_invitations (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  email text not null,
  role text not null default 'member' check (role in ('admin', 'member')),
  token uuid not null default gen_random_uuid() unique,
  invited_by uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  accepted_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create unique index if not exists team_invitations_pending_email_idx
  on team_invitations (team_id, lower(email)) where accepted_at is null;

insert into teams (id, name, slug)
values ('00000000-0000-0000-0000-000000000001', 'Aira Demo Team', 'aira-demo')
on conflict (id) do update set name = excluded.name;

alter table sales add column if not exists team_id uuid references teams(id) on delete restrict;
update sales set team_id = '00000000-0000-0000-0000-000000000001' where team_id is null;
alter table sales alter column team_id set default '00000000-0000-0000-0000-000000000001';
alter table sales alter column team_id set not null;

alter table documents add column if not exists team_id uuid references teams(id) on delete restrict;
update documents d set team_id = s.team_id from sales s where d.sale_id = s.id and d.team_id is null;
alter table documents alter column team_id set default '00000000-0000-0000-0000-000000000001';
alter table documents alter column team_id set not null;

drop index if exists sales_sale_reference_idx;
create unique index if not exists sales_team_reference_idx on sales (team_id, sale_reference);
create index if not exists sales_team_created_idx on sales (team_id, created_at desc);
create index if not exists documents_team_created_idx on documents (team_id, created_at desc);
create index if not exists team_memberships_user_idx on team_memberships (user_id);

-- Security-definer helpers prevent recursive membership-policy evaluation.
create or replace function public.is_team_member(requested_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from team_memberships
    where team_id = requested_team_id and user_id = auth.uid()
  );
$$;

create or replace function public.has_team_role(requested_team_id uuid, allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from team_memberships
    where team_id = requested_team_id
      and user_id = auth.uid()
      and role = any(allowed_roles)
  );
$$;

revoke all on function public.is_team_member(uuid) from public;
revoke all on function public.has_team_role(uuid, text[]) from public;
grant execute on function public.is_team_member(uuid) to anon, authenticated;
grant execute on function public.has_team_role(uuid, text[]) to authenticated;

create or replace function public.create_team(team_name text, team_slug text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_team_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  if length(trim(team_name)) < 2 or team_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then
    raise exception 'Invalid team name or slug';
  end if;

  insert into teams (name, slug, created_by)
  values (trim(team_name), lower(team_slug), auth.uid())
  returning id into new_team_id;
  insert into team_memberships (team_id, user_id, role)
  values (new_team_id, auth.uid(), 'owner');
  return new_team_id;
end;
$$;

revoke all on function public.create_team(text, text) from public;
grant execute on function public.create_team(text, text) to authenticated;

create or replace function public.accept_team_invitation(invitation_token uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  invitation team_invitations%rowtype;
  account_email text;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  account_email := lower(coalesce(auth.jwt() ->> 'email', ''));
  select * into invitation from team_invitations
    where token = invitation_token and accepted_at is null and expires_at > now()
    for update;
  if invitation.id is null then raise exception 'Invitation is invalid or expired'; end if;
  if lower(invitation.email) <> account_email then raise exception 'Invitation email does not match this account'; end if;

  insert into team_memberships (team_id, user_id, role)
  values (invitation.team_id, auth.uid(), invitation.role)
  on conflict (team_id, user_id) do nothing;
  update team_invitations set accepted_at = now(), accepted_by = auth.uid() where id = invitation.id;
  return invitation.team_id;
end;
$$;

revoke all on function public.accept_team_invitation(uuid) from public;
grant execute on function public.accept_team_invitation(uuid) to authenticated;

alter table teams enable row level security;
alter table team_memberships enable row level security;
alter table team_invitations enable row level security;

drop policy if exists "teams_read" on teams;
create policy "teams_read" on teams for select
using (id = '00000000-0000-0000-0000-000000000001' or public.is_team_member(id));

drop policy if exists "teams_update_admin" on teams;
create policy "teams_update_admin" on teams for update
using (public.has_team_role(id, array['owner', 'admin']))
with check (public.has_team_role(id, array['owner', 'admin']));

drop policy if exists "memberships_read" on team_memberships;
create policy "memberships_read" on team_memberships for select
using (user_id = auth.uid() or public.has_team_role(team_id, array['owner', 'admin']));

drop policy if exists "memberships_manage_admin" on team_memberships;
create policy "memberships_manage_admin" on team_memberships for all
using (public.has_team_role(team_id, array['owner', 'admin']))
with check (public.has_team_role(team_id, array['owner', 'admin']));

drop policy if exists "invitations_read" on team_invitations;
create policy "invitations_read" on team_invitations for select
using (public.has_team_role(team_id, array['owner', 'admin']) or lower(email) = lower(auth.jwt() ->> 'email'));
drop policy if exists "invitations_create_admin" on team_invitations;
create policy "invitations_create_admin" on team_invitations for insert
with check (public.has_team_role(team_id, array['owner', 'admin']) and invited_by = auth.uid());
drop policy if exists "invitations_delete_admin" on team_invitations;
create policy "invitations_delete_admin" on team_invitations for delete
using (public.has_team_role(team_id, array['owner', 'admin']));

-- Replace the v1 global policies with team-aware policies. The demo team stays
-- public by design; non-demo teams always require membership.
drop policy if exists "sales_v1_read" on sales;
drop policy if exists "sales_v1_write" on sales;
drop policy if exists "sales_team_read" on sales;
drop policy if exists "sales_team_write" on sales;
create policy "sales_team_read" on sales for select
using (team_id = '00000000-0000-0000-0000-000000000001' or public.is_team_member(team_id));
create policy "sales_team_write" on sales for all
using (team_id = '00000000-0000-0000-0000-000000000001' or public.is_team_member(team_id))
with check (team_id = '00000000-0000-0000-0000-000000000001' or public.is_team_member(team_id));

drop policy if exists "documents_v1_read" on documents;
drop policy if exists "documents_v1_write" on documents;
drop policy if exists "documents_team_read" on documents;
drop policy if exists "documents_team_write" on documents;
create policy "documents_team_read" on documents for select
using (team_id = '00000000-0000-0000-0000-000000000001' or public.is_team_member(team_id));
create policy "documents_team_write" on documents for all
using (team_id = '00000000-0000-0000-0000-000000000001' or public.is_team_member(team_id))
with check (
  (team_id = '00000000-0000-0000-0000-000000000001' or public.is_team_member(team_id))
  and exists (select 1 from sales where sales.id = documents.sale_id and sales.team_id = documents.team_id)
);
