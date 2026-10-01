-- Assign the named Aira Sales Team owner when that authenticated account exists.
insert into team_memberships (team_id, user_id, role)
select '00000000-0000-0000-0000-000000000001', id, 'owner'
from auth.users
where lower(email) = lower('katherine.chew@selangorproperties.com.my')
on conflict (team_id, user_id) do update set role = 'owner';
