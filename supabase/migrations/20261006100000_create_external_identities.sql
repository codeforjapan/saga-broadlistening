-- ============================================================
-- 外部ID（外部アプリの利用者識別子）と Supabase ユーザーの紐付け
-- Epic #147 / #143
--
-- 佐賀市スーパーアプリは外部ID連携元（provider）の一つとして扱う。
-- 連携元の表示名・案内URL・UIDの受け取り仕様はコード側のレジストリ
-- （packages/shared/src/external-identity/providers.ts）で管理し、
-- DB には連携元の識別子（provider_key）だけを持つ。
-- ============================================================

create table external_identities (
  id uuid primary key default gen_random_uuid(),
  provider_key text not null,
  external_uid text not null,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint external_identities_provider_uid_unique unique (provider_key, external_uid)
);

create trigger update_external_identities_updated_at before update on external_identities
  for each row execute function update_updated_at_column();

alter table external_identities enable row level security;

comment on table external_identities is '外部アプリ（連携元）から受け取った利用者識別子。属性データとの突合キーとして平文で保持する。本人確認の証明としては扱わない';
comment on column external_identities.provider_key is '連携元の識別子。佐賀市スーパーアプリは saga_super_app。表示名等はコード側のレジストリで管理する';
comment on column external_identities.external_uid is '連携元が発行した利用者識別子（平文）。公開エンドポイントのレスポンスやLLMへの入力には含めないこと';
comment on column external_identities.first_seen_at is 'この外部IDを最初に受け取った日時';
comment on column external_identities.last_seen_at is 'この外部IDを最後に受け取った日時（再訪のたびに更新）';

-- 外部IDと Supabase（匿名）ユーザーの紐付け。
-- ブラウザと WebView で Supabase セッションが別になるため、
-- 同じ外部IDに複数のユーザーが紐付くことを許容する（多対多）。
-- 会話の閲覧・操作権限は interview_sessions.user_id で判定し、
-- 外部IDの一致だけでは別セッションの会話にアクセスさせない。
create table external_identity_users (
  external_identity_id uuid not null references external_identities(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  linked_at timestamptz not null default now(),
  primary key (external_identity_id, user_id)
);

create index idx_external_identity_users_user_id on external_identity_users(user_id);

alter table external_identity_users enable row level security;

comment on table external_identity_users is '外部IDと Supabase ユーザー（匿名認証）の紐付け。同じ外部IDに複数ユーザーが紐付くことを許容する';
comment on column external_identity_users.linked_at is '紐付けを作成した日時';

-- 回答（セッション）に外部IDを記録する。
-- 参加条件（participation_mode）に関係なく、外部IDが紐付いていれば保存する
-- （属性データの突合は public テーマの回答も対象になるため）。
-- 既存の user_id は会話の所有者として維持する。
alter table interview_sessions
  add column external_identity_id uuid references external_identities(id) on delete set null;

create index idx_interview_sessions_external_identity_id
  on interview_sessions(external_identity_id);

comment on column interview_sessions.external_identity_id is '回答時に紐付いていた外部ID（external_identities.id）。参加条件に関係なく、紐付きがあれば保存する。公開エンドポイントのレスポンスには含めないこと';
