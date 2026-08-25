-- ============================================================
-- AIチャットドメイン（Epic #54 / Issue #56）
--
-- 1行=1メッセージだった chats を、セッション単位の
-- chat_sessions + chat_messages に分割する。
-- あわせて chat_usage_events（AIコスト計測）を廃止し、
-- コスト計測は Langfuse へ一本化する（#41 / #50 と連動）。
--
-- 旧 chats テーブル自体の DROP は Issue #59 で行う。
-- ============================================================

-- ============================================================
-- chat_sessions
-- ============================================================

create table chat_sessions (
  id uuid primary key default gen_random_uuid(),
  policy_id uuid not null references policies(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_chat_sessions_user_id on chat_sessions(user_id);
-- 施策 × 利用者で進行中セッションを引く（初回送信時のセッション再利用）
create index idx_chat_sessions_policy_user_created
  on chat_sessions(policy_id, user_id, created_at desc);

create trigger update_chat_sessions_updated_at before update on chat_sessions
  for each row execute function update_updated_at_column();

alter table chat_sessions enable row level security;

comment on table chat_sessions is '施策ページの「AIに質問する」機能における市民とAIの対話セッション';
comment on column chat_sessions.policy_id is '質問対象の施策';
comment on column chat_sessions.user_id is '発言した利用者の匿名認証ID。公開エンドポイントのレスポンスには含めないこと';

-- ============================================================
-- chat_messages
-- ============================================================

-- role は既存の chat_role_enum ('user', 'system', 'assistant') を流用する
create table chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references chat_sessions(id) on delete cascade,
  role chat_role_enum not null,
  message text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_chat_messages_session_created on chat_messages(session_id, created_at);

create trigger update_chat_messages_updated_at before update on chat_messages
  for each row execute function update_updated_at_column();

alter table chat_messages enable row level security;

comment on table chat_messages is '施策ページの「AIに質問する」機能における市民とAIの対話メッセージ';
comment on column chat_messages.session_id is '対話セッションID';
comment on column chat_messages.role is '発言者（user: 利用者, system: システム, assistant: AI）';
comment on column chat_messages.message is '質問・回答の本文。市民が入力した原文をそのまま保持する（PII の仮名化は未実装。導入時は #46 のガードレール実装とあわせて検討する）';

-- ============================================================
-- AIコスト集計の Langfuse への移管（Issue #56）
--
-- 分析用の集計 RPC（get_chat_usage_metrics）は Langfuse ダッシュボードへ
-- 移すため削除する。admin の MCP ツール get_chat_usage_metrics も併せて廃止する。
--
-- ただし chat_usage_events テーブルと sum_chat_usage_cost は **残す**。
-- この2つは分析用ではなく、チャット API の実行時ガード
-- （利用者ごとの日次上限 / システム全体の日次・月次予算上限。
--   web/src/features/chat/server/services/{cost-tracker,system-cost-guard}.ts）
-- の判定に同期的に使われている。Langfuse は非同期の可観測性基盤であり、
-- リクエストごとの予算判定には使えないため、先に代替のガードを用意せずに
-- 落とすと支出上限が無効化される。
-- 代替ガードの設計は #41 / #50 とあわせて別途行う。
-- ============================================================

drop function if exists public.get_chat_usage_metrics(timestamptz, timestamptz, uuid);
