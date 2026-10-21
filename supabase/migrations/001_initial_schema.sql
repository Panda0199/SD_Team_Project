begin;

create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  university_id text not null unique,
  display_name text not null,
  role text not null check (
    role in ('student', 'instructor', 'teaching_assistant', 'admin')
  ),
  availability boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  instructor_id uuid not null references public.profiles(id) on delete restrict,
  teaching_assistant_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    teaching_assistant_id is null
    or teaching_assistant_id <> instructor_id
  )
);

create table public.course_enrollments (
  course_id uuid not null references public.courses(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (course_id, student_id)
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  resolved boolean not null default false,
  urgent boolean not null default false,
  student_unread boolean not null default false,
  staff_unread boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (course_id, student_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (length(trim(body)) > 0),
  status text not null default 'Sent'
    check (status in ('Sent', 'Seen', 'Replied')),
  created_at timestamptz not null default now()
);

create index courses_instructor_idx
  on public.courses(instructor_id);

create index courses_ta_idx
  on public.courses(teaching_assistant_id);

create index enrollments_student_idx
  on public.course_enrollments(student_id);

create index conversations_course_idx
  on public.conversations(course_id);

create index conversations_student_idx
  on public.conversations(student_id);

create index conversations_updated_idx
  on public.conversations(updated_at desc);

create index messages_conversation_idx
  on public.messages(conversation_id, created_at);

create index messages_author_idx
  on public.messages(author_id);


create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

create trigger courses_set_updated_at
before update on public.courses
for each row
execute function public.set_updated_at();

create trigger conversations_set_updated_at
before update on public.conversations
for each row
execute function public.set_updated_at();


create or replace function public.current_app_role()
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p.role
  from public.profiles p
  where p.id = auth.uid()
  limit 1;
$$;


create or replace function public.is_app_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    public.current_app_role() = 'admin',
    false
  );
$$;


create or replace function public.protect_profile_privileged_fields()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is not null
     and not public.is_app_admin() then

    if new.id is distinct from old.id
       or new.university_id is distinct from old.university_id
       or new.role is distinct from old.role then

      raise exception
        'Only an admin can change profile identity, university ID, or role';

    end if;
  end if;

  return new;
end;
$$;

create trigger profiles_protect_privileged_fields
before update on public.profiles
for each row
execute function public.protect_profile_privileged_fields();


create or replace function public.can_access_course(
  p_course_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    auth.uid() is not null
    and (
      public.is_app_admin()

      or exists (
        select 1
        from public.courses c
        where c.id = p_course_id
          and (
            c.instructor_id = auth.uid()

            or c.teaching_assistant_id = auth.uid()

            or exists (
              select 1
              from public.course_enrollments ce
              where ce.course_id = c.id
                and ce.student_id = auth.uid()
            )
          )
      )
    );
$$;


create or replace function public.can_access_conversation(
  p_conversation_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    auth.uid() is not null
    and (
      public.is_app_admin()

      or exists (
        select 1
        from public.conversations c
        where c.id = p_conversation_id
          and (
            c.student_id = auth.uid()
            or public.can_access_course(c.course_id)
          )
      )
    );
$$;


create or replace function public.can_view_profile(
  p_profile_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    auth.uid() is not null
    and (
      p_profile_id = auth.uid()

      or public.is_app_admin()

      or exists (
        select 1
        from public.courses c
        where public.can_access_course(c.id)
          and (
            c.instructor_id = p_profile_id

            or c.teaching_assistant_id = p_profile_id

            or exists (
              select 1
              from public.course_enrollments ce
              where ce.course_id = c.id
                and ce.student_id = p_profile_id
            )
          )
      )
    );
$$;


create or replace function public.ensure_conversation_for_enrollment()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.conversations (
    course_id,
    student_id
  )
  values (
    new.course_id,
    new.student_id
  )
  on conflict (course_id, student_id)
  do nothing;

  return new;
end;
$$;

create trigger course_enrollment_create_conversation
after insert on public.course_enrollments
for each row
execute function public.ensure_conversation_for_enrollment();


create or replace function public.create_course_group(
  p_name text,
  p_instructor_id uuid,
  p_student_ids uuid[],
  p_teaching_assistant_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_course_id uuid;
  v_expected integer;
  v_valid integer;
begin

  if not public.is_app_admin() then
    raise exception 'Admin role required';
  end if;

  if trim(p_name) = '' then
    raise exception 'Course name is required';
  end if;

  if not exists (
    select 1
    from public.profiles
    where id = p_instructor_id
      and role = 'instructor'
  ) then
    raise exception 'Selected instructor is invalid';
  end if;

  if p_teaching_assistant_id is not null
     and not exists (
       select 1
       from public.profiles
       where id = p_teaching_assistant_id
         and role = 'teaching_assistant'
     ) then

    raise exception
      'Selected teaching assistant is invalid';

  end if;

  v_expected :=
    coalesce(array_length(p_student_ids, 1), 0);

  if v_expected > 0 then

    select count(*)
    into v_valid
    from public.profiles
    where id = any(p_student_ids)
      and role = 'student';

    if v_valid <> v_expected then
      raise exception
        'One or more selected students are invalid';
    end if;

  end if;

  insert into public.courses (
    name,
    instructor_id,
    teaching_assistant_id
  )
  values (
    trim(p_name),
    p_instructor_id,
    p_teaching_assistant_id
  )
  returning id
  into v_course_id;

  if v_expected > 0 then

    insert into public.course_enrollments (
      course_id,
      student_id
    )
    select
      v_course_id,
      unnest(p_student_ids)
    on conflict do nothing;

  end if;

  return v_course_id;

end;
$$;


alter table public.profiles
enable row level security;

alter table public.courses
enable row level security;

alter table public.course_enrollments
enable row level security;

alter table public.conversations
enable row level security;

alter table public.messages
enable row level security;


create policy profiles_select_related
on public.profiles
for select
to authenticated
using (
  public.can_view_profile(id)
);


create policy profiles_insert_admin
on public.profiles
for insert
to authenticated
with check (
  public.is_app_admin()
);


create policy profiles_update_self_or_admin
on public.profiles
for update
to authenticated
using (
  id = auth.uid()
  or public.is_app_admin()
)
with check (
  id = auth.uid()
  or public.is_app_admin()
);


create policy profiles_delete_admin
on public.profiles
for delete
to authenticated
using (
  public.is_app_admin()
);


create policy courses_select_accessible
on public.courses
for select
to authenticated
using (
  public.can_access_course(id)
);


create policy courses_insert_admin
on public.courses
for insert
to authenticated
with check (
  public.is_app_admin()
);


create policy courses_update_admin
on public.courses
for update
to authenticated
using (
  public.is_app_admin()
)
with check (
  public.is_app_admin()
);


create policy courses_delete_admin
on public.courses
for delete
to authenticated
using (
  public.is_app_admin()
);


create policy course_enrollments_select_accessible
on public.course_enrollments
for select
to authenticated
using (
  public.is_app_admin()
  or student_id = auth.uid()
  or public.can_access_course(course_id)
);


create policy course_enrollments_insert_admin
on public.course_enrollments
for insert
to authenticated
with check (
  public.is_app_admin()
);


create policy course_enrollments_delete_admin
on public.course_enrollments
for delete
to authenticated
using (
  public.is_app_admin()
);


create policy conversations_select_accessible
on public.conversations
for select
to authenticated
using (
  public.can_access_conversation(id)
);


create policy conversations_insert_student_or_admin
on public.conversations
for insert
to authenticated
with check (
  public.is_app_admin()

  or (
    student_id = auth.uid()
    and public.current_app_role() = 'student'
    and public.can_access_course(course_id)
  )
);


create policy conversations_update_accessible
on public.conversations
for update
to authenticated
using (
  public.can_access_conversation(id)
)
with check (
  public.can_access_conversation(id)
);


create policy messages_select_accessible
on public.messages
for select
to authenticated
using (
  public.can_access_conversation(conversation_id)
);


create policy messages_insert_authorized
on public.messages
for insert
to authenticated
with check (
  author_id = auth.uid()

  and public.can_access_conversation(conversation_id)

  and (
    public.is_app_admin()

    or (
      public.current_app_role() = 'student'
      and status = 'Sent'

      and exists (
        select 1
        from public.conversations c
        where c.id = conversation_id
          and c.student_id = auth.uid()
          and not c.resolved
      )
    )

    or (
      public.current_app_role()
        in ('instructor', 'teaching_assistant')

      and status in ('Sent', 'Replied')

      and exists (
        select 1
        from public.conversations c
        where c.id = conversation_id
          and public.can_access_course(c.course_id)
          and not c.resolved
      )
    )
  )
);


create policy messages_update_staff_status
on public.messages
for update
to authenticated
using (
  public.is_app_admin()

  or (
    public.current_app_role()
      in ('instructor', 'teaching_assistant')

    and public.can_access_conversation(
      conversation_id
    )
  )
)
with check (
  public.is_app_admin()

  or (
    public.current_app_role()
      in ('instructor', 'teaching_assistant')

    and public.can_access_conversation(
      conversation_id
    )
  )
);


create policy messages_delete_admin
on public.messages
for delete
to authenticated
using (
  public.is_app_admin()
);


revoke all
on public.profiles
from anon;

revoke all
on public.courses
from anon;

revoke all
on public.course_enrollments
from anon;

revoke all
on public.conversations
from anon;

revoke all
on public.messages
from anon;


grant usage
on schema public
to authenticated;

grant select, insert, update, delete
on public.profiles
to authenticated;

grant select, insert, update, delete
on public.courses
to authenticated;

grant select, insert, delete
on public.course_enrollments
to authenticated;

grant select, insert, update
on public.conversations
to authenticated;

grant select, insert, update, delete
on public.messages
to authenticated;


revoke all
on function public.current_app_role()
from public;

revoke all
on function public.is_app_admin()
from public;

revoke all
on function public.can_access_course(uuid)
from public;

revoke all
on function public.can_access_conversation(uuid)
from public;

revoke all
on function public.can_view_profile(uuid)
from public;

revoke all
on function public.create_course_group(
  text,
  uuid,
  uuid[],
  uuid
)
from public;


grant execute
on function public.current_app_role()
to authenticated;

grant execute
on function public.is_app_admin()
to authenticated;

grant execute
on function public.can_access_course(uuid)
to authenticated;

grant execute
on function public.can_access_conversation(uuid)
to authenticated;

grant execute
on function public.can_view_profile(uuid)
to authenticated;

grant execute
on function public.create_course_group(
  text,
  uuid,
  uuid[],
  uuid
)
to authenticated;


alter table public.profiles
replica identity full;

alter table public.courses
replica identity full;

alter table public.course_enrollments
replica identity full;

alter table public.conversations
replica identity full;

alter table public.messages
replica identity full;


do $$
declare
  t text;
begin

  foreach t in array array[
    'profiles',
    'courses',
    'course_enrollments',
    'conversations',
    'messages'
  ]

  loop

    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = t
    ) then

      execute format(
        'alter publication supabase_realtime add table public.%I',
        t
      );

    end if;

  end loop;

end;
$$;


commit;