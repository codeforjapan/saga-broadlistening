-- 最初の質問（AI の初回発話）は、セッションごとに 1 件だけ保存する。
-- 生成中にページを再読み込みすると生成がもう一度走り、同じセッションに最初の質問が 2 件保存されていた。
alter table interview_messages
  add column is_initial_question boolean not null default false;

create unique index interview_messages_one_initial_question
  on interview_messages (interview_session_id)
  where is_initial_question;

-- 最初の質問を保存する。すでに保存されていれば何もせず、保存済みの 1 件を返す。
-- サーバー（service_role）からだけ呼ぶ
create or replace function public.insert_initial_interview_message(
  p_session_id uuid,
  p_content text
)
returns interview_messages
language plpgsql
set search_path = public
as $$
declare
  v_message interview_messages;
begin
  insert into interview_messages (interview_session_id, role, content, is_initial_question)
  values (p_session_id, 'assistant', p_content, true)
  on conflict (interview_session_id) where is_initial_question do nothing
  returning * into v_message;

  if v_message.id is null then
    select * into v_message
    from interview_messages
    where interview_session_id = p_session_id
      and is_initial_question;
  end if;

  return v_message;
end;
$$;

revoke execute on function public.insert_initial_interview_message(uuid, text) from public;
revoke execute on function public.insert_initial_interview_message(uuid, text) from anon;
revoke execute on function public.insert_initial_interview_message(uuid, text) from authenticated;
grant execute on function public.insert_initial_interview_message(uuid, text) to service_role;
