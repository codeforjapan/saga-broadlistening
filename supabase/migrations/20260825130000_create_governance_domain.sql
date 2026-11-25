-- ============================================================
-- 運用・ガバナンスドメイン（Epic #54 / Issue #58）
--
-- 行政サービスとして運用するために必要な、緊急停止・監査ログ・
-- AIガードレールの記録を保持するドメインを新設する。
-- ============================================================

-- ============================================================
-- portal_controls（1行だけの設定テーブル）
-- ============================================================

create table portal_controls (
  id text primary key default 'default' check (id = 'default'),
  emergency_stop boolean not null default false,
  policy_chat_stop boolean not null default false,
  interview_stop boolean not null default false,
  notice_message text,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into portal_controls (id) values ('default');

create trigger update_portal_controls_updated_at before update on portal_controls
  for each row execute function update_updated_at_column();

alter table portal_controls enable row level security;

comment on table portal_controls is 'サービス全体・製品別の緊急停止スイッチを管理する設定テーブル（常に1行）';
comment on column portal_controls.id is '固定値 default（1行しか存在しない）';
comment on column portal_controls.emergency_stop is 'サービス全体を緊急停止するかどうか（初期は admin にログインできる職員なら誰でも操作可）';
comment on column portal_controls.policy_chat_stop is '施策紹介AI（チャット）のみを停止するかどうか';
comment on column portal_controls.interview_stop is '意見作成AI（インタビュー）のみを停止するかどうか';
comment on column portal_controls.notice_message is '停止中に市民向けページへ表示する案内文';
comment on column portal_controls.updated_by is 'この設定を最後に操作した職員のユーザーID（履歴の正本は audit_logs）';

-- ============================================================
-- audit_logs（追記専用）
-- ============================================================

create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  actor_id uuid references auth.users(id) on delete set null,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index idx_audit_logs_created_at on audit_logs(created_at desc);
create index idx_audit_logs_entity on audit_logs(entity_type, entity_id);
create index idx_audit_logs_actor_id on audit_logs(actor_id);

-- 追記専用を DB 側で担保する。
-- アクセスは service role（RLS をバイパス）経由のため、RLS ではなくトリガで防ぐ。
create or replace function prevent_audit_logs_mutation()
returns trigger as $$
begin
  raise exception 'audit_logs is append-only';
end;
$$ language plpgsql;

create trigger audit_logs_append_only
  before update or delete on audit_logs
  for each row execute function prevent_audit_logs_mutation();

alter table audit_logs enable row level security;

comment on table audit_logs is '職員の操作やシステムの重要な出来事を記録する追記専用の監査ログ（updated_at は持たない）';
comment on column audit_logs.action is '「施策を公開した」等、何が行われたかを示す名前';
comment on column audit_logs.entity_type is '操作の対象が何の種類のデータかを示す名前';
comment on column audit_logs.entity_id is '操作の対象データの識別子';
comment on column audit_logs.actor_id is '操作した職員（またはシステム）のユーザーID';
comment on column audit_logs.metadata is '操作に関する詳細情報。意見本文・個人情報を記録しないこと';

-- ============================================================
-- guard_events
-- ============================================================

create type guard_product as enum ('policy_chat', 'interview');
create type guard_stage as enum ('input', 'in_dialogue', 'output');
create type guard_action as enum ('allow', 'rewrite', 'notice', 'block', 'hold_for_review');

comment on type guard_product is 'ガードレールの対象プロダクト（policy_chat: 施策紹介AI, interview: 意見作成AI）';
comment on type guard_stage is 'ガードレールが働いた段階（input: 入力時, in_dialogue: 対話中, output: 出力時）';
comment on type guard_action is 'ガードレールが実施した対応（allow / rewrite / notice / block / hold_for_review）';

create table guard_events (
  id uuid primary key default gen_random_uuid(),
  product guard_product not null,
  interview_session_id uuid references interview_sessions(id) on delete cascade,
  chat_session_id uuid references chat_sessions(id) on delete cascade,
  stage guard_stage not null,
  detector text not null,
  action guard_action not null,
  detail jsonb,
  created_at timestamptz not null default now(),
  -- product に応じて対応するセッション参照のみを持つ
  constraint guard_events_session_ref check (
    (product = 'interview'
      and interview_session_id is not null and chat_session_id is null)
    or (product = 'policy_chat'
      and chat_session_id is not null and interview_session_id is null)
  )
);

create index idx_guard_events_created_at on guard_events(created_at desc);
create index idx_guard_events_interview_session_id on guard_events(interview_session_id);
create index idx_guard_events_chat_session_id on guard_events(chat_session_id);
create index idx_guard_events_detector on guard_events(detector);

alter table guard_events enable row level security;

comment on table guard_events is 'AIの安全対策（ガードレール）が働いた記録。市民の入力・AIの出力を検知した際のログ';
comment on column guard_events.product is '対象プロダクト（policy_chat: 施策紹介AI, interview: 意見作成AI）';
comment on column guard_events.stage is '検知した段階（input: 入力時, in_dialogue: 対話中, output: 出力時）';
comment on column guard_events.detector is '検知した検出器（個人情報検出／指示無視の誘導検出／高リスク表現検出／話題逸脱検出など）';
comment on column guard_events.action is '実施した対応（allow: 許可, rewrite: 書き換え, notice: 案内表示, block: ブロック, hold_for_review: レビュー保留）';
comment on column guard_events.detail is '検知した内容の概要。設計方針として個人情報の原文は保存しない';
