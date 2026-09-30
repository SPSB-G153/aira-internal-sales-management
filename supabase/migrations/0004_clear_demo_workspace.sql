-- Remove generated mock records from the public demo workspace.
delete from documents
where team_id = '00000000-0000-0000-0000-000000000001';

delete from sales
where team_id = '00000000-0000-0000-0000-000000000001';
