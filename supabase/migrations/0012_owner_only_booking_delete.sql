-- Preserve existing read/insert/update behaviour, but allow only an
-- authenticated team owner to delete bookings and their generated letters.

drop policy if exists "sales_team_write" on sales;
drop policy if exists "sales_team_insert" on sales;
drop policy if exists "sales_team_update" on sales;
drop policy if exists "sales_owner_delete" on sales;

create policy "sales_team_insert" on sales for insert
with check (team_id = '00000000-0000-0000-0000-000000000001' or public.is_team_member(team_id));

create policy "sales_team_update" on sales for update
using (team_id = '00000000-0000-0000-0000-000000000001' or public.is_team_member(team_id))
with check (team_id = '00000000-0000-0000-0000-000000000001' or public.is_team_member(team_id));

create policy "sales_owner_delete" on sales for delete
using (auth.uid() is not null and public.has_team_role(team_id, array['owner']));

drop policy if exists "documents_team_write" on documents;
drop policy if exists "documents_team_insert" on documents;
drop policy if exists "documents_team_update" on documents;
drop policy if exists "documents_owner_delete" on documents;

create policy "documents_team_insert" on documents for insert
with check (
  (team_id = '00000000-0000-0000-0000-000000000001' or public.is_team_member(team_id))
  and exists (select 1 from sales where sales.id = documents.sale_id and sales.team_id = documents.team_id)
);

create policy "documents_team_update" on documents for update
using (team_id = '00000000-0000-0000-0000-000000000001' or public.is_team_member(team_id))
with check (
  (team_id = '00000000-0000-0000-0000-000000000001' or public.is_team_member(team_id))
  and exists (select 1 from sales where sales.id = documents.sale_id and sales.team_id = documents.team_id)
);

create policy "documents_owner_delete" on documents for delete
using (auth.uid() is not null and public.has_team_role(team_id, array['owner']));

-- This function is one transaction: either the selected booking and its
-- letters are all deleted, or nothing is deleted.
create or replace function public.delete_sale_with_documents(
  target_sale_id uuid,
  confirmation_reference text
)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
declare
  target_sale sales%rowtype;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;

  select * into target_sale from sales where id = target_sale_id for update;
  if target_sale.id is null then raise exception 'Booking not found'; end if;
  if not public.has_team_role(target_sale.team_id, array['owner']) then
    raise exception 'Only the workspace owner can delete a booking';
  end if;
  if confirmation_reference is distinct from target_sale.sale_reference then
    raise exception 'The booking reference does not match';
  end if;

  delete from documents where sale_id = target_sale.id and team_id = target_sale.team_id;
  delete from sales where id = target_sale.id and team_id = target_sale.team_id;
  return true;
end;
$$;

revoke all on function public.delete_sale_with_documents(uuid, text) from public;
grant execute on function public.delete_sale_with_documents(uuid, text) to authenticated;
