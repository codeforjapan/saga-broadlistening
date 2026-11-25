-- ============================================================
-- 施策ドメイン（Epic #54 / Issue #55）
--
-- 国政の「議案（bill）」を地方行政の「施策（policy）」へ再定義する。
-- 既存データの移行は行わず、新テーブルを作り直す。
--
-- 旧 bills / bill_contents / bills_tags はこの時点ではまだ
-- chats・topic_analysis_version から参照されているため DROP しない。
-- 掃除は Issue #59（旧スキーマの一括削除）で行う。
-- ============================================================

-- ============================================================
-- ENUM
-- ============================================================

-- 公開状態は draft / published の 2 段階のみ（現行の coming_soon は廃止）
create type policy_publish_status as enum ('draft', 'published');

comment on type policy_publish_status is '施策の公開状態（draft: 下書き, published: 公開済み）';

-- 難易度は既存の difficulty_level_enum ('normal', 'hard') をそのまま流用する

-- ============================================================
-- policies
-- ============================================================

create table policies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  department text,
  contact text,
  publish_status policy_publish_status not null default 'draft',
  published_at timestamptz,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  is_featured boolean not null default false,
  knowledge_source text,
  enable_ai_chat boolean not null default false,
  thumbnail_url text,
  share_thumbnail_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- 公開済みなら published_at は必須
  constraint policies_published_at_required
    check (publish_status <> 'published' or published_at is not null)
);

create index idx_policies_published_at on policies(published_at desc nulls last);
create index idx_policies_is_featured on policies(is_featured) where is_featured;

-- 公開状態での絞り込みと、オープンデータAPIの施策一覧が使う
-- キーセットページネーション（publish_status = 'published' かつ
-- created_at DESC, id DESC）を1本でまかなう
create index idx_policies_publish_status_created_at_id
  on policies (publish_status, created_at desc, id desc);

create trigger update_policies_updated_at before update on policies
  for each row execute function update_updated_at_column();

alter table policies enable row level security;

comment on table policies is '行政施策（政策）の基本情報と公開管理';
comment on column policies.name is '施策名';
comment on column policies.slug is '公開ページのURLに使う短い文字列（重複不可）';
comment on column policies.department is 'この施策を担当する市の部署名';
comment on column policies.contact is '市民からの問い合わせ先';
comment on column policies.publish_status is '公開状態（draft: 下書き, published: 公開済み）';
comment on column policies.published_at is '公開した日時';
comment on column policies.approved_by is '公開を承認した職員のユーザーID';
comment on column policies.approved_at is '承認した日時';
comment on column policies.is_featured is 'トップページに注目施策として表示するか';
comment on column policies.knowledge_source is 'AIが市民の質問に答える際に参照する参考情報の本文（プロンプトに直接埋め込む）';
comment on column policies.enable_ai_chat is 'AI質問機能を有効にするか';
comment on column policies.thumbnail_url is '一覧・詳細ページに表示するサムネイル画像のURL';
comment on column policies.share_thumbnail_url is 'SNSシェア時に表示される画像のURL';

-- ============================================================
-- policy_contents
-- ============================================================

create table policy_contents (
  id uuid primary key default gen_random_uuid(),
  policy_id uuid not null references policies(id) on delete cascade,
  title text not null,
  summary text,
  content text not null,
  difficulty_level difficulty_level_enum not null default 'normal',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (policy_id, difficulty_level)
);

create trigger update_policy_contents_updated_at before update on policy_contents
  for each row execute function update_updated_at_column();

alter table policy_contents enable row level security;

comment on table policy_contents is '施策の難易度別説明コンテンツ';
comment on column policy_contents.title is '難易度ごとの見出し';
comment on column policy_contents.summary is '一覧に表示する短い要約';
comment on column policy_contents.content is '本文（Markdown形式）';
comment on column policy_contents.difficulty_level is '難易度（normal: 標準, hard: もっと詳しく）';

-- ============================================================
-- policies_tags
-- ============================================================

create table policies_tags (
  policy_id uuid not null references policies(id) on delete cascade,
  tag_id uuid not null references tags(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (policy_id, tag_id)
);

create index idx_policies_tags_tag_id on policies_tags(tag_id);

alter table policies_tags enable row level security;

comment on table policies_tags is '施策とタグを結びつける中間テーブル';

-- ============================================================
-- preview_tokens（policy_id 参照で作り直し）
-- ============================================================

drop table preview_tokens;

create table preview_tokens (
  id uuid primary key default gen_random_uuid(),
  policy_id uuid not null references policies(id) on delete cascade,
  token text not null unique,
  created_by text,
  expires_at timestamptz not null default (now() + interval '1 month'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_preview_tokens_policy_id on preview_tokens(policy_id);
create index idx_preview_tokens_expires_at on preview_tokens(expires_at);

create trigger update_preview_tokens_updated_at before update on preview_tokens
  for each row execute function update_updated_at_column();

alter table preview_tokens enable row level security;

comment on table preview_tokens is '公開前の施策を担当課が限定的に確認するための一時的なアクセストークン';
comment on column preview_tokens.token is 'このトークンを知っていれば未公開ページを閲覧できる文字列。漏洩に注意';
comment on column preview_tokens.created_by is 'トークンを発行した職員名';
comment on column preview_tokens.expires_at is 'トークンの有効期限（デフォルト: 発行から1か月。発行数の上限は設けない）';

-- ============================================================
-- 国政固有テーブルの削除
-- ============================================================

drop function if exists set_active_diet_session(uuid);
-- bills の insert/update トリガ（published_at ↔ submitted_date の同期）ごと落とす
drop function if exists sync_bills_published_submitted() cascade;

drop table mirai_stances;
-- bills.diet_session_id の FK ごと削除
alter table bills drop column if exists diet_session_id;
drop table diet_sessions;

-- ============================================================
-- storage bucket
--
-- ポリシーは既存の bill-thumbnails と同じ「読み取りは公開・書き込みは
-- 管理者のみ」に揃える（20250921000001_fix_storage_policies_admin_only.sql）。
-- ============================================================

insert into storage.buckets (id, name, public)
values ('policy-thumbnails', 'policy-thumbnails', true);

create policy "Public read policy thumbnails"
on storage.objects
for select
using (bucket_id = 'policy-thumbnails');

create policy "Admin users can upload policy thumbnails"
on storage.objects
for insert
with check (
  bucket_id = 'policy-thumbnails'
  and public.is_admin()
);

create policy "Admin users can update policy thumbnails"
on storage.objects
for update
using (
  bucket_id = 'policy-thumbnails'
  and public.is_admin()
);

create policy "Admin users can delete policy thumbnails"
on storage.objects
for delete
using (
  bucket_id = 'policy-thumbnails'
  and public.is_admin()
);
