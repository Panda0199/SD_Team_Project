create or replace function public.set_conversation_unread_on_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  sender_role text;
begin
  select role
  into sender_role
  from public.profiles
  where id = new.author_id;

  if sender_role = 'student' then
    update public.conversations
    set staff_unread = true
    where id = new.conversation_id;

  elsif sender_role in ('instructor', 'teaching_assistant') then
    update public.conversations
    set student_unread = true
    where id = new.conversation_id;
  end if;

  return new;
end;
$$;

drop trigger if exists messages_set_conversation_unread
on public.messages;

create trigger messages_set_conversation_unread
after insert on public.messages
for each row
execute function public.set_conversation_unread_on_message();