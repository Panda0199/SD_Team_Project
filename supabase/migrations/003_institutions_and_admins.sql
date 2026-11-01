begin;

create table if not exists public.institutions (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

insert into public.institutions (id, name)
values ('00000000-0000-0000-0000-000000000001', 'Quickly University')
on conflict (id) do update
set name = excluded.name;

alter table public.profiles
  add column if not exists institution_id uuid
  references public.institutions(id) on delete restrict;

update public.profiles
set institution_id = '00000000-0000-0000-0000-000000000001'
where institution_id is null;

alter table public.profiles
  alter column institution_id set not null;

create index if not exists profiles_institution_id_idx
  on public.profiles(institution_id);

alter table public.institutions
  enable row level security;

drop policy if exists institutions_select_own on public.institutions;
create policy institutions_select_own
on public.institutions
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.institution_id = institutions.id
  )
);

create or replace function public.enforce_max_two_institution_admins()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  admin_count integer;
begin
  if new.role = 'admin' then
    perform pg_advisory_xact_lock(hashtextextended(new.institution_id::text, 0));

    select count(*)
    into admin_count
    from public.profiles p
    where p.institution_id = new.institution_id
      and p.role = 'admin'
      and p.id <> new.id;

    if admin_count >= 2 then
      raise exception 'An institution can have a maximum of two administrators.'
        using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_enforce_max_two_admins on public.profiles;
create trigger profiles_enforce_max_two_admins
before insert or update of role, institution_id on public.profiles
for each row
execute function public.enforce_max_two_institution_admins();

commit;
