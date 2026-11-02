begin;

alter table public.messages
  add column assignment_tag text;

commit;
