begin;

alter table public.conversations
  add column if not exists ta_looped_in boolean not null default false;

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
        from public.conversations conversation
        join public.courses course on course.id = conversation.course_id
        where conversation.id = p_conversation_id
          and (
            conversation.student_id = auth.uid()
            or course.instructor_id = auth.uid()
            or (
              conversation.ta_looped_in
              and course.teaching_assistant_id = auth.uid()
            )
          )
      )
    );
$$;

revoke all
on function public.can_access_conversation(uuid)
from public;

grant execute
on function public.can_access_conversation(uuid)
to authenticated;

create or replace function public.loop_in_teaching_assistant(
  p_conversation_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  conversation_instructor_id uuid;
  course_ta_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required to loop in a teaching assistant.';
  end if;

  select course.instructor_id, course.teaching_assistant_id
  into conversation_instructor_id, course_ta_id
  from public.conversations conversation
  join public.courses course on course.id = conversation.course_id
  where conversation.id = p_conversation_id
  for update of conversation;

  if not found then
    raise exception 'Conversation not found.';
  end if;

  if conversation_instructor_id is distinct from auth.uid() then
    raise exception 'Only the course instructor can loop in its teaching assistant.';
  end if;

  if course_ta_id is null then
    raise exception 'No teaching assistant is assigned to this course.';
  end if;

  update public.conversations
  set ta_looped_in = true
  where id = p_conversation_id;
end;
$$;

revoke all
on function public.loop_in_teaching_assistant(uuid)
from public;

grant execute
on function public.loop_in_teaching_assistant(uuid)
to authenticated;

commit;
