-- ============================================================
-- AIインタビューの目的別テンプレートと、コード側のターン制御のための列を追加する
--
-- - interview_configs: 目的（5型）・市がこれから決めること・決まっていること
-- - interview_questions: 列は足さない（follow_up_guide は「観点」として使い続ける）
-- - interview_sessions: ステージ（chat/summary/summary_complete）をサーバー側で持つ。
--   要約の段階の場面・再開の有無は、assistant メッセージに残す記録から決めるので列を持たない
-- - ai_prompts: 聞き手の人物像と初回指示を、ほかのインタビュー用プロンプトと同じく版管理する
-- ============================================================

create type interview_purpose_type_enum as enum (
  'understand', 'discover', 'verify', 'evaluate', 'envision'
);
create type interview_session_stage_enum as enum ('chat', 'summary', 'summary_complete');

-- ------------------------------------------------------------
-- interview_configs
-- ------------------------------------------------------------
alter table interview_configs
  add column purpose_type interview_purpose_type_enum,
  add column opinion_focus text,
  add column decided_matters text;

comment on column interview_configs.purpose_type is 'インタビューの目的（understand: わかる / discover: 見つける / verify: 確かめる / evaluate: 評価する / envision: 描く）。NULL は目的未設定（汎用の聞き方で動く）';
comment on column interview_configs.opinion_focus is '意見がほしい点（市がこれから決めること）';
comment on column interview_configs.decided_matters is '決まっていること（賛否を聞かない事項）。施策型のときだけ使う';

-- ------------------------------------------------------------
-- interview_questions
-- ------------------------------------------------------------
comment on column interview_questions.follow_up_guide is '観点。聞けたら話が豊かになること（満たすべき条件ではない）';

-- ------------------------------------------------------------
-- interview_sessions
-- ------------------------------------------------------------
alter table interview_sessions
  add column stage interview_session_stage_enum not null default 'chat';

comment on column interview_sessions.stage is '対話のステージ。サーバーがターンごとに決める（chat → summary → summary_complete）';

-- 既存セッションのステージを、これまでのやり取りから埋める
update interview_sessions
set stage = 'summary_complete'
where completed_at is not null;

update interview_sessions s
set stage = 'summary'
where s.completed_at is null
  and exists (
    select 1
    from (
      select m.content
      from interview_messages m
      where m.interview_session_id = s.id
        and m.role = 'assistant'
      order by m.created_at desc
      limit 1
    ) last_assistant
    where last_assistant.content ~ '"report"\s*:\s*\{'
  );

-- ------------------------------------------------------------
-- ai_prompts: 人物像と初回指示も版管理する
-- ------------------------------------------------------------
insert into public.ai_prompts (key, name) values
  ('interview-persona', 'AIインタビュー・聞き手の人物像'),
  ('interview-initial-system', 'AIインタビュー・初回の発話')
on conflict (key) do nothing;
