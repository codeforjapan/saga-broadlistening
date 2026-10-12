-- ============================================================
-- AIインタビューの目的別テンプレートと、コード側のターン制御のための列を追加する
--
-- - interview_configs: 目的（5型）・市がこれから決めること・決まっていること・結果のお知らせ
-- - interview_questions: 話題の種類・発話予算・必須/任意・観点（follow_up_guide を hint に改名）
-- - interview_sessions: ステージ（chat/summary/summary_complete）をサーバー側で持つ
-- - ai_prompts: 聞き手の人物像と初回指示を、ほかのインタビュー用プロンプトと同じく版管理する
-- ============================================================

create type interview_purpose_type_enum as enum (
  'understand', 'discover', 'verify', 'evaluate', 'envision'
);
create type interview_publication_place_enum as enum ('chikat', 'city_web', 'koho');
create type interview_publication_mode_enum as enum ('scheduled', 'when_ready');
create type interview_step_kind_enum as enum (
  'fact', 'episode', 'reason', 'evaluation', 'add_more'
);
create type interview_session_stage_enum as enum ('chat', 'summary', 'summary_complete');
create type interview_summary_phase_enum as enum ('first', 'reply');
create type interview_end_reason_enum as enum (
  'completed', 'end_button', 'end_request', 'turn_limit'
);

-- ------------------------------------------------------------
-- interview_configs
-- ------------------------------------------------------------
alter table interview_configs
  add column purpose_type interview_purpose_type_enum,
  add column opinion_focus text,
  add column decided_matters text,
  add column publication_timing text,
  add column publication_place interview_publication_place_enum,
  add column publication_mode interview_publication_mode_enum not null default 'when_ready';

comment on column interview_configs.purpose_type is 'インタビューの目的（understand: わかる / discover: 見つける / verify: 確かめる / evaluate: 評価する / envision: 描く）。NULL は目的未設定（汎用の聞き方で動く）';
comment on column interview_configs.opinion_focus is '意見がほしい点（市がこれから決めること）';
comment on column interview_configs.decided_matters is '決まっていること（賛否を聞かない事項）。施策型のときだけ使う';
comment on column interview_configs.publication_timing is '結果を知らせる時期（例「2027年3月ごろ」）。publication_mode が scheduled のときに使う';
comment on column interview_configs.publication_place is '結果を知らせる場所（chikat: CHIKAT / city_web: 市ホームページ / koho: 広報紙）';
comment on column interview_configs.publication_mode is 'scheduled: 時期と場所を決めて知らせる / when_ready: まとまり次第 CHIKAT の結果ページで知らせる';

-- ------------------------------------------------------------
-- interview_questions
-- ------------------------------------------------------------
alter table interview_questions rename column follow_up_guide to hint;

alter table interview_questions
  add column step_key text,
  add column step_kind interview_step_kind_enum not null default 'episode',
  add column turn_budget integer not null default 3,
  add column required boolean not null default true,
  add constraint interview_questions_turn_budget_range check (turn_budget between 1 and 4);

comment on column interview_questions.hint is '聞けたら話が豊かになる観点（満たすべき条件ではない）。旧 follow_up_guide';
comment on column interview_questions.step_key is 'テンプレート内の話題の識別子（例 scene）。テンプレート外の質問は NULL';
comment on column interview_questions.step_kind is '話題の種類（fact: 事実 / episode: 場面 / reason: 理由 / evaluation: 受け止め / add_more: 言い足し）。プロンプトの表示と要約で使う';
comment on column interview_questions.turn_budget is 'その話題で使えるAIの発話の数（最初の質問を含む、1〜4）';
comment on column interview_questions.required is '必須の話題か。任意の話題は残りの発話数に余裕があるときだけ聞く';

-- ------------------------------------------------------------
-- interview_sessions
-- ------------------------------------------------------------
alter table interview_sessions
  add column stage interview_session_stage_enum not null default 'chat',
  add column summary_phase interview_summary_phase_enum,
  add column resume_used boolean not null default false,
  add column end_reason interview_end_reason_enum;

comment on column interview_sessions.stage is '対話のステージ。サーバーがターンごとに決める（chat → summary → summary_complete）';
comment on column interview_sessions.summary_phase is 'summary ステージ内の場面（first: 初回の要約を出す / reply: 要約への返事を受ける）';
comment on column interview_sessions.resume_used is 'summary から chat に戻る再開を使ったか（1回まで）';
comment on column interview_sessions.end_reason is 'summary に入ったきっかけ（completed / end_button / end_request / turn_limit）';

-- 既存セッションのステージを、これまでのやり取りから埋める
update interview_sessions
set stage = 'summary_complete'
where completed_at is not null;

update interview_sessions s
set stage = 'summary', summary_phase = 'reply'
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
