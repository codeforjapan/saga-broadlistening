-- ============================================================
-- 意見収集・分析ドメイン（Epic #54 / Issue #57）
--
-- 1. interview_configs を「意見募集（テーマ）」の独立した単位にする。
--    施策とは policies_interview_configs による多対多で紐づける。
-- 2. interview_report → opinions。AIが作る「レポート」から、市民が
--    最終確認・修正して提出する「確定版の意見」へ位置づけを変える。
-- 3. topic_analysis_* の参照先を bill_id → interview_config_id、
--    interview_report_id → opinion_id へ張り替える。
--
-- FK 依存が連鎖するため、意見収集ドメインと分析ドメインは
-- ひとつのマイグレーションで完結させる。
-- ============================================================

-- ============================================================
-- 旧テーブルの削除（依存の葉から順に）
-- ============================================================

drop table if exists topic_opinion;
drop table if exists topic;
drop table if exists topic_analysis_version;
drop table if exists topic_analysis_classifications;
drop table if exists topic_analysis_topics;
drop table if exists topic_analysis_versions;
drop table if exists report_reactions;
drop table if exists interview_opinion;
drop table if exists interview_report;
drop table if exists interview_rating_feedbacks;
drop table if exists interview_messages;
drop table if exists interview_sessions;
drop table if exists interview_questions;
drop table if exists interview_configs;
drop table if exists expert_registrations;

-- 旧 RPC も落とす（新しい参照先・シグネチャで作り直す）
drop function if exists bulk_publish_reports(uuid, integer, integer);
drop function if exists count_bulk_publish_targets(uuid, integer, integer);
drop function if exists count_public_reports_by_stance(uuid);
drop function if exists count_reactions_by_report_ids(uuid[]);
drop function if exists count_sessions_by_config_ids(uuid[]);
drop function if exists find_open_data_interview_reports(integer, integer, timestamptz, uuid);
drop function if exists find_public_reports_by_bill_id_ordered_by_reactions(uuid, int, int, text, text);
drop function if exists find_sessions_ordered_by_helpful_count(uuid, boolean, int, int, text, text, text, text);
drop function if exists find_sessions_ordered_by_message_count(uuid, boolean, int, int, text, text, text, text);
drop function if exists find_sessions_ordered_by_moderation_score(uuid, boolean, int, int, text, text, text, text);
drop function if exists find_sessions_ordered_by_total_content_richness(uuid, boolean, int, int, text, text, text, text);
drop function if exists get_interview_message_counts(uuid[]);
drop function if exists get_interview_metrics_by_bill(uuid);
drop function if exists get_interview_statistics(uuid);
drop function if exists get_question_answer_counts(uuid);
drop function if exists mark_opinions_extracted(uuid[], timestamptz);
drop function if exists publish_topic_analysis_version(uuid);
drop function if exists unpublish_reports_by_config_id(uuid);

-- ============================================================
-- ENUM
-- ============================================================

-- 現行は ('public', 'closed') の 2 値。下書き状態を加えた 3 値に作り直す
drop type if exists interview_config_status_enum;
create type interview_config_status_enum as enum ('draft', 'open', 'closed');
comment on type interview_config_status_enum is '意見募集の状態（draft: 下書き, open: 募集中, closed: 終了）';

create type opinion_review_status as enum ('published', 'pending_review', 'hidden');
comment on type opinion_review_status is '意見の公開状態（published: 公開済み, pending_review: レビュー保留中, hidden: 非公開）';

-- 既存の interview_role_enum ('assistant', 'user') /
-- interview_feedback_tag_enum / moderation_status_enum / topic_analysis_status は流用する

-- ============================================================
-- interview_configs（意見募集の単位。テーブル名は据え置き）
-- ============================================================

create table interview_configs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  status interview_config_status_enum not null default 'draft',
  starts_at timestamptz,
  ends_at timestamptz,
  deliberation_enabled boolean not null default false,
  chat_model text not null,
  estimated_duration integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint interview_configs_period_order
    check (starts_at is null or ends_at is null or starts_at < ends_at),
  constraint interview_configs_estimated_duration_positive
    check (estimated_duration is null or estimated_duration > 0)
);

create index idx_interview_configs_status on interview_configs(status);

create trigger update_interview_configs_updated_at before update on interview_configs
  for each row execute function update_updated_at_column();

alter table interview_configs enable row level security;

comment on table interview_configs is '市民から意見を募集する単位（テーマ）。施策とは policies_interview_configs による多対多で紐づく（施策0件＝抽象テーマ型）';
comment on column interview_configs.name is 'テーマ名（例：「佐賀市のみらい」）';
comment on column interview_configs.slug is '公開ページのURLに使う短い文字列（重複不可）';
comment on column interview_configs.description is '職員が設定するテーマの説明文（抽象テーマ型ではAIへの指示材料にもなる）';
comment on column interview_configs.status is '状態（draft: 下書き, open: 募集中, closed: 終了）';
comment on column interview_configs.starts_at is '意見募集の開始日時';
comment on column interview_configs.ends_at is '意見募集の終了日時';
comment on column interview_configs.deliberation_enabled is '他の意見グループの視点を提示する熟議エンジンを使うか';
comment on column interview_configs.chat_model is '対話に使用するAIモデル';
comment on column interview_configs.estimated_duration is '対話の想定所要時間（分）';

-- ============================================================
-- policies_interview_configs（施策 ↔ 意見募集 の多対多）
-- ============================================================

create table policies_interview_configs (
  policy_id uuid not null references policies(id) on delete cascade,
  interview_config_id uuid not null references interview_configs(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (policy_id, interview_config_id)
);

create index idx_policies_interview_configs_interview_config_id
  on policies_interview_configs(interview_config_id);

alter table policies_interview_configs enable row level security;

comment on table policies_interview_configs is '施策と意見募集を結びつける中間テーブル。1施策に複数の意見募集、1つの意見募集に複数施策を紐づけられる。どちらも0件を許容する';

-- ============================================================
-- interview_questions
-- ============================================================

create table interview_questions (
  id uuid primary key default gen_random_uuid(),
  interview_config_id uuid not null references interview_configs(id) on delete cascade,
  question text not null,
  question_order integer not null,
  quick_replies text[],
  follow_up_guide text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (interview_config_id, question_order)
);

create trigger update_interview_questions_updated_at before update on interview_questions
  for each row execute function update_updated_at_column();

alter table interview_questions enable row level security;

comment on table interview_questions is '対話の中でAIが尋ねる固定質問。生成AIによる動的応答の前に固定で聞きたい質問を入れる';
comment on column interview_questions.question_order is 'テーマ内での出題順（意見募集ごとに一意）';
comment on column interview_questions.quick_replies is '言葉が出てこない人向けのボタン選択肢';
comment on column interview_questions.follow_up_guide is '回答後にAIがさらに深掘りする際の指針';

-- ============================================================
-- interview_sessions
-- ============================================================

create table interview_sessions (
  id uuid primary key default gen_random_uuid(),
  interview_config_id uuid not null references interview_configs(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  archived_at timestamptz,
  rating smallint check (rating is null or rating between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_interview_sessions_config_id on interview_sessions(interview_config_id);
create index idx_interview_sessions_user_id on interview_sessions(user_id);
create index idx_interview_sessions_started_at on interview_sessions(started_at);

create trigger update_interview_sessions_updated_at before update on interview_sessions
  for each row execute function update_updated_at_column();

alter table interview_sessions enable row level security;

comment on table interview_sessions is '市民が意見作成AIと対話した1回分のセッション記録';
comment on column interview_sessions.user_id is '回答者の匿名認証ID（イベント経由の場合はNULL）。公開エンドポイントのレスポンスには含めないこと';
comment on column interview_sessions.completed_at is '対話の完了日時（NULLなら途中離脱）';
comment on column interview_sessions.archived_at is '「もう一度新たに回答する」等でセッションを打ち切った日時';
comment on column interview_sessions.rating is '対話の満足度評価（1〜5）';

-- ============================================================
-- interview_messages
-- ============================================================

create table interview_messages (
  id uuid primary key default gen_random_uuid(),
  interview_session_id uuid not null references interview_sessions(id) on delete cascade,
  role interview_role_enum not null,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_interview_messages_session_created
  on interview_messages(interview_session_id, created_at);

create trigger update_interview_messages_updated_at before update on interview_messages
  for each row execute function update_updated_at_column();

alter table interview_messages enable row level security;

comment on table interview_messages is '対話セッション内で交わされたAIと市民のやり取り本文';
comment on column interview_messages.content is '対話の本文（送信前にPII仮名化処理済み）';

-- ============================================================
-- interview_rating_feedbacks
-- ============================================================

create table interview_rating_feedbacks (
  id uuid primary key default gen_random_uuid(),
  interview_session_id uuid not null references interview_sessions(id) on delete cascade,
  tag interview_feedback_tag_enum not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (interview_session_id, tag)
);

create trigger update_interview_rating_feedbacks_updated_at
  before update on interview_rating_feedbacks
  for each row execute function update_updated_at_column();

alter table interview_rating_feedbacks enable row level security;

comment on table interview_rating_feedbacks is '対話の満足度評価が低かった場合に理由として選択されたタグ';

-- ============================================================
-- opinions（旧 interview_report）
-- ============================================================

create table opinions (
  id uuid primary key default gen_random_uuid(),
  interview_session_id uuid not null unique
    references interview_sessions(id) on delete cascade,
  final_text text not null,
  summary text,
  role_title text,
  role_description text,
  content_richness jsonb,
  total_content_richness integer generated always as (
    case
      when content_richness is not null
        and content_richness->>'total' is not null
        and content_richness->>'total' ~ '^\d+$'
      then (content_richness->>'total')::integer
      else null
    end
  ) stored,
  moderation_score integer,
  moderation_status moderation_status_enum generated always as (
    case
      when moderation_score is null then null
      when moderation_score >= 70 then 'ng'::moderation_status_enum
      when moderation_score >= 30 then 'warning'::moderation_status_enum
      else 'ok'::moderation_status_enum
    end
  ) stored,
  moderation_reasoning text,
  review_status opinion_review_status not null default 'pending_review',
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  is_public_by_user boolean not null default false,
  is_public_by_admin boolean not null default false,
  -- 二次利用（オープンデータAPI）への提供許諾。公開同意とは別の意思表示のため
  -- review_status には統合しない（app/api/open-data/interviews が唯一のゲート）
  is_data_reuse_consented boolean not null default false,
  -- 意見の再抽出（opinion_segments の作り直し）ウォーターマーク
  opinions_reextracted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint opinions_moderation_score_range
    check (moderation_score is null or moderation_score between 0 and 100)
);

create index idx_opinions_review_status on opinions(review_status);
create index idx_opinions_moderation_status on opinions(moderation_status);
create index idx_opinions_total_content_richness
  on opinions(total_content_richness desc nulls last);

-- 公開データAPIのフィルタ用（二次利用許諾済みの公開意見のキーセットページネーション）
create index idx_opinions_data_reuse_public
  on opinions (created_at desc, id desc)
  where review_status = 'published' and is_data_reuse_consented;

-- k-匿名性ゲートの集計用（二次利用許諾を条件に含めない公開意見の集計）
create index idx_opinions_published_session
  on opinions (interview_session_id)
  where review_status = 'published';

-- 再抽出バックフィルの対象抽出用。
-- findOpinionsToReextract は is_public_by_user desc, created_at asc で並べるため、
-- 並び順どおりのキーにしないとソートが index を使えない。
create index idx_opinions_reextraction_pending
  on opinions (is_public_by_user desc, created_at asc)
  where opinions_reextracted_at is null;

create trigger update_opinions_updated_at before update on opinions
  for each row execute function update_updated_at_column();

alter table opinions enable row level security;

comment on table opinions is '対話の結果として市民が最終確認・修正のうえ提出した確定版の意見';
comment on column opinions.interview_session_id is '元になった対話セッション（1意見1セッション）';
comment on column opinions.final_text is '市民が最終確認・修正して提出した意見文';
comment on column opinions.summary is 'AIが作成した意見の要約';
comment on column opinions.role_title is '意見カードに表示する立場・文脈（例：「子育て中の市民」）';
comment on column opinions.role_description is '立場・文脈の補足説明';
comment on column opinions.content_richness is '意見の情報充実度の詳細データ';
comment on column opinions.total_content_richness is '情報充実度の総合スコア（content_richness->>total から自動生成）';
comment on column opinions.moderation_score is 'モデレーションスコア（0-100）: 0が最も適切、100が最も不適切';
comment on column opinions.moderation_status is 'モデレーション判定（generated column）: ok / warning / ng';
comment on column opinions.review_status is '公開状態の正本（published: 公開済み, pending_review: レビュー保留中, hidden: 非公開）。is_public_by_user と is_public_by_admin が両方 true になったときに published へ遷移する';
comment on column opinions.reviewed_by is 'レビューした職員のユーザーID';
comment on column opinions.reviewed_at is 'レビューした日時';
comment on column opinions.is_public_by_user is '市民本人が公開に同意したか（review_status の入力条件）';
comment on column opinions.is_public_by_admin is '職員が公開を許可したか（review_status の入力条件）';
comment on column opinions.is_data_reuse_consented is '公開データAPI（CC BY 4.0）での二次利用に同意したか。公開同意とは別の意思表示';
comment on column opinions.opinions_reextracted_at is '意見の再抽出（opinion_segments の作り直し）を試行した時刻。NULL=未実施';

-- ============================================================
-- opinion_segments（旧 interview_opinion）
-- ============================================================

create table opinion_segments (
  id uuid primary key default gen_random_uuid(),
  opinion_id uuid not null references opinions(id) on delete cascade,
  opinion_index smallint not null,
  title text not null,
  content text not null,
  source_message_id uuid references interview_messages(id) on delete set null,
  contextual_quote text,
  richness integer,
  concern text,
  proposal text,
  reasoning_types text[] not null default '{}',
  tags_extracted_at timestamptz,
  topic_extracted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (opinion_id, opinion_index)
);

-- タグ未抽出の意見を引くための部分インデックス（タグバックフィルの対象抽出）
create index idx_opinion_segments_tags_pending
  on opinion_segments (opinion_id)
  where tags_extracted_at is null;

-- reasoning_types の包含検索（専門家フィルタ）用
create index idx_opinion_segments_reasoning_types
  on opinion_segments using gin (reasoning_types);

create trigger update_opinion_segments_updated_at before update on opinion_segments
  for each row execute function update_updated_at_column();

alter table opinion_segments enable row level security;

comment on table opinion_segments is '1件の意見から抽出した個別の論点単位の意見（トピック分析用の正規化プロジェクション）';
comment on column opinion_segments.opinion_index is '意見内の順序（0始まり）';
comment on column opinion_segments.contextual_quote is '文脈込みの自己完結した引用（個人名等の固有名詞は含めない）';
comment on column opinion_segments.richness is 'この論点単体の情報充実度';
comment on column opinion_segments.concern is '意見が示す懸念の要点（20-50字）。懸念でなければ NULL';
comment on column opinion_segments.proposal is '意見が示す具体的な提案・要望の要点（20-50字）。提案でなければ NULL';
comment on column opinion_segments.reasoning_types is '発言の根拠の種類（personal_experience / family_observation / professional_expertise / research_reference / overseas_example / intuition / none）。「未抽出」は tags_extracted_at IS NULL が表すため、本列は NOT NULL DEFAULT {} とし空配列と NULL を区別しない';
comment on column opinion_segments.tags_extracted_at is 'タグ（concern/proposal/reasoning_types）を抽出した時刻。NULL=未抽出';
comment on column opinion_segments.topic_extracted_at is 'トピック抽出済みウォーターマーク。NULL=未抽出';

-- ============================================================
-- opinion_reactions（旧 report_reactions）
-- ============================================================

create table opinion_reactions (
  id uuid primary key default gen_random_uuid(),
  opinion_id uuid not null references opinions(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  reaction_type text not null check (reaction_type in ('helpful', 'hmm')),
  created_at timestamptz not null default now(),
  unique (opinion_id, user_id)
);

create index idx_opinion_reactions_user_id on opinion_reactions(user_id);

alter table opinion_reactions enable row level security;

comment on table opinion_reactions is '公開された意見へのリアクション。1ユーザー1意見につき1件';
comment on column opinion_reactions.reaction_type is 'リアクション種別（helpful: 参考になった, hmm: そうかな）';

-- ============================================================
-- topic_analysis_*（職員向け。interview_config_id / opinion_id 基準で再作成）
-- ============================================================

create table topic_analysis_versions (
  id uuid primary key default gen_random_uuid(),
  interview_config_id uuid not null references interview_configs(id) on delete cascade,
  version integer not null,
  status topic_analysis_status not null default 'pending',
  current_step text,
  started_at timestamptz,
  completed_at timestamptz,
  error_message text,
  summary_md text,
  intermediate_results jsonb,
  phase_data jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (interview_config_id, version)
);

create trigger update_topic_analysis_versions_updated_at
  before update on topic_analysis_versions
  for each row execute function update_updated_at_column();

alter table topic_analysis_versions enable row level security;

comment on table topic_analysis_versions is '意見募集（テーマ）単位で職員向けに実行する論点解析バッチの実行記録';
comment on column topic_analysis_versions.version is 'テーマごとの連番';
comment on column topic_analysis_versions.status is '解析ステータス: pending / running / completed / failed';
comment on column topic_analysis_versions.summary_md is '解析結果の全体サマリー（Markdown）。職員向けの分析資料であり閲覧権限を職員に限定する';
comment on column topic_analysis_versions.intermediate_results is '中間結果（デバッグ・参照用）';
comment on column topic_analysis_versions.phase_data is 'フェーズ間で引き継ぐ作業データ';

create table topic_analysis_topics (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null references topic_analysis_versions(id) on delete cascade,
  name text not null,
  description_md text,
  representative_opinions jsonb not null default '[]',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_topic_analysis_topics_version_id on topic_analysis_topics(version_id);

create trigger update_topic_analysis_topics_updated_at
  before update on topic_analysis_topics
  for each row execute function update_updated_at_column();

alter table topic_analysis_topics enable row level security;

comment on table topic_analysis_topics is '論点解析によって抽出された個別の論点';
comment on column topic_analysis_topics.representative_opinions is 'この論点を代表する意見の一覧。個人情報を含む引用を入れないこと';

create table topic_analysis_classifications (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null references topic_analysis_versions(id) on delete cascade,
  topic_id uuid not null references topic_analysis_topics(id) on delete cascade,
  opinion_id uuid not null references opinions(id) on delete cascade,
  opinion_index integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (version_id, topic_id, opinion_id, opinion_index)
);

create index idx_topic_analysis_classifications_topic_id
  on topic_analysis_classifications(topic_id);
create index idx_topic_analysis_classifications_opinion_id
  on topic_analysis_classifications(opinion_id);

create trigger update_topic_analysis_classifications_updated_at
  before update on topic_analysis_classifications
  for each row execute function update_updated_at_column();

alter table topic_analysis_classifications enable row level security;

comment on table topic_analysis_classifications is 'どの意見がどの論点に当てはまるかを対応づける多対多の分類データ';
comment on column topic_analysis_classifications.opinion_index is '意見内の論点インデックス（opinion_segments.opinion_index に対応）';

-- ============================================================
-- 市民向けトピック分析（旧フェーズ連鎖版）
--
-- Issue #51 で削除が予定されているが未完了のため、
-- 同じ方針（interview_config_id / opinion_id 基準）で作り直す。
-- ============================================================

create table topic_analysis_version (
  id uuid primary key default gen_random_uuid(),
  interview_config_id uuid not null references interview_configs(id) on delete cascade,
  version integer not null,
  status topic_analysis_status not null default 'pending',
  is_published boolean not null default false,
  current_step text,
  progress jsonb,
  trigger text not null,
  model text,
  prompt_version text,
  source_opinion_count integer,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (interview_config_id, version)
);

-- 公開はテーマごとに最大1版
create unique index one_published_per_interview_config
  on topic_analysis_version (interview_config_id) where is_published;

-- 実行中（pending/running）はテーマごとに最大1版（二重起動の原子的ガード）
create unique index one_active_version_per_interview_config
  on topic_analysis_version (interview_config_id) where status in ('pending', 'running');

alter table topic_analysis_version enable row level security;

comment on table topic_analysis_version is '市民向けトピック分析のバージョン（テーマ内連番・公開管理の中心）';
comment on column topic_analysis_version.is_published is '公開フラグ。テーマ毎に最大1版（部分unique）';
comment on column topic_analysis_version.current_step is '実行中のステップ: extract | merge | assign | group | done';
comment on column topic_analysis_version.progress is 'フェーズ間の中間結果（抽出候補・最終トピック・割当）';
comment on column topic_analysis_version.trigger is '起動契機: cron | manual';
comment on column topic_analysis_version.source_opinion_count is '分析時点の対象意見数（watermark）';

create table topic (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null references topic_analysis_version(id) on delete cascade,
  title text not null,
  description text not null,
  parent_topic_id uuid,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint topic_version_id_id_key unique (version_id, id),
  constraint topic_parent_same_version_fkey
    foreign key (version_id, parent_topic_id)
    references topic (version_id, id) on delete cascade
);

create index idx_topic_parent on topic (parent_topic_id);

alter table topic enable row level security;

comment on table topic is 'トピック（主張文体タイトル＋論点説明）';
comment on column topic.title is '主張文体・20字程度';
comment on column topic.description is '論点の説明 60〜80字';
comment on column topic.parent_topic_id is '親トピック（大トピック）。同一 version 内のみ参照可。NULL=大トピックまたは旧データの葉。「大トピックか」は子の有無で判定する';

create table topic_opinion (
  topic_id uuid not null,
  opinion_segment_id uuid not null references opinion_segments(id) on delete cascade,
  version_id uuid not null references topic_analysis_version(id) on delete cascade,
  primary key (version_id, opinion_segment_id),
  constraint topic_opinion_topic_fk
    foreign key (version_id, topic_id)
    references topic (version_id, id) on delete cascade
);

create index idx_topic_opinion_topic on topic_opinion(topic_id);

alter table topic_opinion enable row level security;

comment on table topic_opinion is '意見（論点単位）→トピックの割当（version スコープ・1意見最大1トピック）';
comment on column topic_opinion.opinion_segment_id is '割り当てられた論点単位の意見（opinion_segments.id）';

-- ============================================================
-- RPC
-- ============================================================

-- 複数のテーマに対するセッション数を一括取得する
create function count_sessions_by_config_ids(p_config_ids uuid[])
returns table (
  interview_config_id uuid,
  session_count bigint
)
language sql
stable
as $$
  select
    s.interview_config_id,
    count(s.id) as session_count
  from interview_sessions s
  where s.interview_config_id = any(p_config_ids)
  group by s.interview_config_id;
$$;

comment on function count_sessions_by_config_ids(uuid[]) is
  '複数の意見募集に対する対話セッション数を一括で数える';

-- 複数意見のリアクション数をDB側で集約して返す
create function count_reactions_by_opinion_ids(opinion_ids uuid[])
returns table (
  opinion_id uuid,
  reaction_type text,
  cnt bigint
)
language sql
stable
as $$
  select
    r.opinion_id,
    r.reaction_type,
    count(*) as cnt
  from opinion_reactions r
  where r.opinion_id = any(opinion_ids)
  group by r.opinion_id, r.reaction_type;
$$;

comment on function count_reactions_by_opinion_ids(uuid[]) is
  '複数の意見に対するリアクション数を種別ごとに集約して返す';

-- 公開意見の取得（おすすめ順 / 新着順）
create function find_public_opinions_by_config_id_ordered_by_reactions(
  p_interview_config_id uuid,
  p_limit int default 1000,
  p_offset int default 0,
  p_sort_order text default 'recommended'
)
returns table (
  id uuid,
  role_title text,
  summary text,
  final_text text,
  total_content_richness integer,
  created_at timestamptz
) as $$
begin
  return query
  select
    o.id,
    o.role_title,
    o.summary,
    o.final_text,
    o.total_content_richness,
    o.created_at
  from opinions o
  inner join interview_sessions s on s.id = o.interview_session_id
  -- 集約を意見1件に閉じる（全 opinion_reactions を GROUP BY しない）
  left join lateral (
    select count(*) as helpful_count
    from opinion_reactions orx
    where orx.opinion_id = o.id
      and orx.reaction_type = 'helpful'
  ) rc on true
  where o.review_status = 'published'
    and s.interview_config_id = p_interview_config_id
  order by
    case when p_sort_order = 'newest' then null
         else (coalesce(rc.helpful_count, 0) + coalesce(o.total_content_richness, 0))
    end desc nulls last,
    o.created_at desc,
    o.id desc
  limit p_limit
  offset p_offset;
end;
$$ language plpgsql stable;

comment on function find_public_opinions_by_config_id_ordered_by_reactions(uuid, int, int, text) is
  '意見募集に紐づく公開済み意見を、おすすめ順（リアクション＋情報充実度）または新着順で返す';

-- 職員向け一覧のソート RPC。stance / role は廃止したためフィルタから外している
create function find_sessions_ordered_by_message_count(
  p_config_id uuid,
  p_ascending boolean default false,
  p_offset int default 0,
  p_limit int default 30,
  p_status text default null,
  p_visibility text default null
)
returns table (session_id uuid) as $$
begin
  return query
  select s.id as session_id
  from interview_sessions s
  left join (
    select im.interview_session_id, count(*)::bigint as cnt
    from interview_messages im
    inner join interview_sessions iss
      on iss.id = im.interview_session_id
    where iss.interview_config_id = p_config_id
    group by im.interview_session_id
  ) mc on mc.interview_session_id = s.id
  left join opinions o on o.interview_session_id = s.id
  where s.interview_config_id = p_config_id
    and (p_status is null or
         (p_status = 'completed' and s.completed_at is not null) or
         (p_status = 'in_progress' and s.completed_at is null and s.archived_at is null) or
         (p_status = 'archived' and s.completed_at is null and s.archived_at is not null))
    and (p_visibility is null or
         (p_visibility = 'public' and o.review_status = 'published') or
         (p_visibility = 'private' and (o.review_status is null or o.review_status <> 'published')))
  order by
    case when p_ascending then coalesce(mc.cnt, 0) end asc,
    case when not p_ascending then coalesce(mc.cnt, 0) end desc,
    s.started_at desc,
    s.id desc
  offset p_offset
  limit p_limit;
end;
$$ language plpgsql stable;

create function find_sessions_ordered_by_total_content_richness(
  p_config_id uuid,
  p_ascending boolean default false,
  p_offset int default 0,
  p_limit int default 30,
  p_status text default null,
  p_visibility text default null
)
returns table (session_id uuid) as $$
begin
  return query
  select s.id as session_id
  from interview_sessions s
  left join opinions o on o.interview_session_id = s.id
  where s.interview_config_id = p_config_id
    and (p_status is null or
         (p_status = 'completed' and s.completed_at is not null) or
         (p_status = 'in_progress' and s.completed_at is null and s.archived_at is null) or
         (p_status = 'archived' and s.completed_at is null and s.archived_at is not null))
    and (p_visibility is null or
         (p_visibility = 'public' and o.review_status = 'published') or
         (p_visibility = 'private' and (o.review_status is null or o.review_status <> 'published')))
  order by
    case when p_ascending then o.total_content_richness end asc nulls last,
    case when not p_ascending then o.total_content_richness end desc nulls last,
    s.started_at desc,
    s.id desc
  offset p_offset
  limit p_limit;
end;
$$ language plpgsql stable;

create function find_sessions_ordered_by_helpful_count(
  p_config_id uuid,
  p_ascending boolean default false,
  p_offset int default 0,
  p_limit int default 30,
  p_status text default null,
  p_visibility text default null
)
returns table (session_id uuid) as $$
begin
  return query
  select s.id as session_id
  from interview_sessions s
  left join opinions o on o.interview_session_id = s.id
  -- 集約を意見1件に閉じる（全 opinion_reactions を GROUP BY しない）
  left join lateral (
    select count(*)::bigint as cnt
    from opinion_reactions orx
    where orx.opinion_id = o.id
      and orx.reaction_type = 'helpful'
  ) hc on true
  where s.interview_config_id = p_config_id
    and (p_status is null or
         (p_status = 'completed' and s.completed_at is not null) or
         (p_status = 'in_progress' and s.completed_at is null and s.archived_at is null) or
         (p_status = 'archived' and s.completed_at is null and s.archived_at is not null))
    and (p_visibility is null or
         (p_visibility = 'public' and o.review_status = 'published') or
         (p_visibility = 'private' and (o.review_status is null or o.review_status <> 'published')))
  order by
    case when p_ascending then coalesce(hc.cnt, 0) end asc,
    case when not p_ascending then coalesce(hc.cnt, 0) end desc,
    s.started_at desc,
    s.id desc
  offset p_offset
  limit p_limit;
end;
$$ language plpgsql stable;

create function find_sessions_ordered_by_moderation_score(
  p_config_id uuid,
  p_ascending boolean default false,
  p_offset int default 0,
  p_limit int default 30,
  p_status text default null,
  p_visibility text default null
)
returns table (session_id uuid) as $$
begin
  return query
  select s.id as session_id
  from interview_sessions s
  left join opinions o on o.interview_session_id = s.id
  where s.interview_config_id = p_config_id
    and (p_status is null or
         (p_status = 'completed' and s.completed_at is not null) or
         (p_status = 'in_progress' and s.completed_at is null and s.archived_at is null) or
         (p_status = 'archived' and s.completed_at is null and s.archived_at is not null))
    and (p_visibility is null or
         (p_visibility = 'public' and o.review_status = 'published') or
         (p_visibility = 'private' and (o.review_status is null or o.review_status <> 'published')))
  order by
    case when p_ascending then o.moderation_score end asc nulls last,
    case when not p_ascending then o.moderation_score end desc nulls last,
    s.started_at desc,
    s.id desc
  offset p_offset
  limit p_limit;
end;
$$ language plpgsql stable;

-- セッションごとのメッセージ数を一括取得
create function get_interview_message_counts(session_ids uuid[])
returns table (
  interview_session_id uuid,
  message_count bigint
) as $$
begin
  return query
  select
    im.interview_session_id,
    count(*)::bigint as message_count
  from interview_messages im
  where im.interview_session_id = any(session_ids)
  group by im.interview_session_id;
end;
$$ language plpgsql stable;

-- 意見募集ごとの実施数・完了数・完了率・総回答時間（秒）
create function get_interview_metrics_by_config(p_interview_config_id uuid default null)
returns table (
  interview_config_id uuid,
  interview_config_name text,
  conducted_count bigint,
  completed_count bigint,
  completion_rate numeric,
  total_duration_seconds numeric
)
language sql
stable
as $$
  select
    c.id as interview_config_id,
    c.name as interview_config_name,
    count(s.id) as conducted_count,
    count(s.completed_at) as completed_count,
    case
      when count(s.id) = 0 then 0
      else round(count(s.completed_at)::numeric / count(s.id)::numeric, 3)
    end as completion_rate,
    round(
      coalesce(
        sum(
          extract(
            epoch from (coalesce(s.completed_at, lm.last_message_at) - s.started_at)
          )
        ),
        0
      )::numeric,
      0
    ) as total_duration_seconds
  from interview_configs c
  left join interview_sessions s
    on s.interview_config_id = c.id
  -- セッション1件ごとに最終メッセージ時刻を引く
  -- （全 interview_messages を GROUP BY すると対象テーマ以外まで走査してしまう）
  left join lateral (
    select max(im.created_at) as last_message_at
    from interview_messages im
    where im.interview_session_id = s.id
  ) lm on true
  where p_interview_config_id is null or c.id = p_interview_config_id
  group by c.id, c.name
  order by count(s.id) desc, c.name;
$$;

comment on function get_interview_metrics_by_config(uuid) is
  '意見募集ごとのAI対話実施数・完了数・完了率・総回答時間（秒）を集計する。p_interview_config_id で単一テーマに絞り込める';

-- 意見募集単位の統計。コスト集計は Langfuse へ移管したため返さない
create function get_interview_statistics(p_config_id uuid)
returns table (
  total_sessions bigint,
  completed_sessions bigint,
  avg_rating numeric,
  avg_total_content_richness numeric,
  avg_message_count numeric,
  median_duration_seconds numeric,
  total_duration_seconds numeric,
  public_by_user_count bigint,
  published_count bigint,
  feedback_irrelevant_questions bigint,
  feedback_not_aligned bigint,
  feedback_misunderstood bigint,
  feedback_too_many_questions bigint,
  feedback_other bigint
) as $$
begin
  return query
  select
    count(s.id) as total_sessions,
    count(s.completed_at) as completed_sessions,
    round(avg(s.rating)::numeric, 2) as avg_rating,
    round(avg(o.total_content_richness)::numeric, 1) as avg_total_content_richness,
    round(avg(coalesce(mc.message_count, 0))::numeric, 1) as avg_message_count,
    round(
      (select percentile_cont(0.5) within group (
        order by extract(epoch from (sub.completed_at - sub.started_at))
      )
      from interview_sessions sub
      where sub.interview_config_id = p_config_id
        and sub.completed_at is not null
      )::numeric, 0
    ) as median_duration_seconds,
    -- 総所要時間: 完了セッションは completed_at、途中離脱は最終メッセージ時刻を終了時刻として集計
    coalesce(
      (select sum(extract(epoch from (
        coalesce(sub.completed_at, lm.last_message_at) - sub.started_at
      )))
      from interview_sessions sub
      left join (
        select im.interview_session_id, max(im.created_at) as last_message_at
        from interview_messages im
        group by im.interview_session_id
      ) lm on lm.interview_session_id = sub.id
      where sub.interview_config_id = p_config_id
        and coalesce(sub.completed_at, lm.last_message_at) is not null
      ),
      0
    )::numeric as total_duration_seconds,
    count(case when o.is_public_by_user = true then 1 end) as public_by_user_count,
    count(case when o.review_status = 'published' then 1 end) as published_count,
    coalesce(max(fc.feedback_irrelevant_questions), 0) as feedback_irrelevant_questions,
    coalesce(max(fc.feedback_not_aligned), 0) as feedback_not_aligned,
    coalesce(max(fc.feedback_misunderstood), 0) as feedback_misunderstood,
    coalesce(max(fc.feedback_too_many_questions), 0) as feedback_too_many_questions,
    coalesce(max(fc.feedback_other), 0) as feedback_other
  from interview_sessions s
  left join opinions o on o.interview_session_id = s.id
  left join (
    select im.interview_session_id, count(*) as message_count
    from interview_messages im
    group by im.interview_session_id
  ) mc on mc.interview_session_id = s.id
  left join (
    select
      count(*) filter (where f.tag = 'irrelevant_questions') as feedback_irrelevant_questions,
      count(*) filter (where f.tag = 'not_aligned') as feedback_not_aligned,
      count(*) filter (where f.tag = 'misunderstood') as feedback_misunderstood,
      count(*) filter (where f.tag = 'too_many_questions') as feedback_too_many_questions,
      count(*) filter (where f.tag = 'other') as feedback_other
    from interview_rating_feedbacks f
    join interview_sessions fs on fs.id = f.interview_session_id
    where fs.interview_config_id = p_config_id
  ) fc on true
  where s.interview_config_id = p_config_id;
end;
$$ language plpgsql stable;

revoke execute on function public.get_interview_statistics(uuid) from public;
revoke execute on function public.get_interview_statistics(uuid) from anon;
revoke execute on function public.get_interview_statistics(uuid) from authenticated;
grant execute on function public.get_interview_statistics(uuid) to service_role;

-- 質問ごとの提示・回答セッション数
create function get_question_answer_counts(p_config_id uuid)
returns table (
  question_id uuid,
  question text,
  question_order integer,
  asked_session_count bigint,
  answered_session_count bigint
) as $$
begin
  return query
  with asked as (
    select t.session_id, t.created_at, t.qid
    from (
      select
        m.interview_session_id as session_id,
        m.created_at,
        extract_assistant_question_id(m.content) as qid
      from interview_messages m
      join interview_sessions s on s.id = m.interview_session_id
      where s.interview_config_id = p_config_id
        and m.role = 'assistant'
    ) t
    where t.qid is not null
  ),
  last_user_message as (
    select
      m.interview_session_id as session_id,
      max(m.created_at) as last_user_at
    from interview_messages m
    join interview_sessions s on s.id = m.interview_session_id
    where s.interview_config_id = p_config_id
      and m.role = 'user'
    group by m.interview_session_id
  )
  select
    q.id as question_id,
    q.question,
    q.question_order,
    count(distinct a.session_id) as asked_session_count,
    count(distinct a.session_id) filter (where lu.last_user_at > a.created_at)
      as answered_session_count
  from interview_questions q
  left join asked a on a.qid = q.id
  left join last_user_message lu on lu.session_id = a.session_id
  where q.interview_config_id = p_config_id
  group by q.id, q.question, q.question_order
  order by q.question_order;
end;
$$ language plpgsql stable;

-- 一括公開: 対象件数カウントと一括更新
create function count_bulk_publish_opinion_targets(
  p_config_id uuid,
  p_max_moderation_score integer,
  p_min_content_richness integer
) returns bigint as $$
  select count(*)
  from opinions o
  join interview_sessions s on s.id = o.interview_session_id
  where s.interview_config_id = p_config_id
    and o.is_public_by_user = true
    and o.review_status = 'pending_review'
    and o.moderation_score is not null
    and o.moderation_score <= p_max_moderation_score
    and o.total_content_richness is not null
    and o.total_content_richness >= p_min_content_richness;
$$ language sql stable;

create function bulk_publish_opinions(
  p_config_id uuid,
  p_max_moderation_score integer,
  p_min_content_richness integer,
  p_reviewed_by uuid default null
) returns bigint as $$
  with updated as (
    update opinions o
    set is_public_by_admin = true,
        review_status = 'published',
        reviewed_by = p_reviewed_by,
        reviewed_at = now()
    from interview_sessions s
    where s.id = o.interview_session_id
      and s.interview_config_id = p_config_id
      and o.is_public_by_user = true
      and o.review_status = 'pending_review'
      and o.moderation_score is not null
      and o.moderation_score <= p_max_moderation_score
      and o.total_content_richness is not null
      and o.total_content_richness >= p_min_content_richness
    returning o.id
  )
  select count(*) from updated;
$$ language sql volatile;

comment on function bulk_publish_opinions(uuid, integer, integer, uuid) is
  'モデレーションスコアと情報充実度のしきい値を満たす、本人が公開に同意済みの意見を一括公開する';

-- テーマ終了に伴う一括公開停止
create function unpublish_opinions_by_config_id(p_config_id uuid)
returns void
language sql
as $$
  update opinions o
  set review_status = 'hidden',
      is_public_by_admin = false
  from interview_sessions s
  where o.interview_session_id = s.id
    and s.interview_config_id = p_config_id
    and o.review_status <> 'hidden';
$$;

comment on function unpublish_opinions_by_config_id(uuid) is
  '意見募集の終了に伴い、配下の意見をまとめて非公開（hidden）にする。職員の判断として記録されるため、以後は本人操作による自動公開の対象外になる';

-- 増分トピック分析: 指定意見群のトピック抽出済みウォーターマークを一括記録
create function mark_opinions_extracted(
  p_ids uuid[],
  p_extracted_at timestamptz
) returns void
language sql
as $$
  update opinion_segments
  set topic_extracted_at = p_extracted_at
  where id = any(p_ids);
$$;

comment on function mark_opinions_extracted(uuid[], timestamptz) is
  '指定意見群の topic_extracted_at を単一トランザクションで一括更新する（増分トピック分析の抽出済み記録）';

-- version の公開切替を1トランザクションで行う
create function publish_topic_analysis_version(p_version_id uuid)
returns void
language plpgsql
as $$
declare
  v_config_id uuid;
begin
  select interview_config_id into v_config_id
  from topic_analysis_version
  where id = p_version_id;

  if v_config_id is null then
    raise exception 'topic_analysis_version % not found', p_version_id;
  end if;

  -- 先に同テーマの現公開版を降ろす（同一トランザクション内なので部分ユニーク制約に衝突しない）
  update topic_analysis_version
  set is_published = false
  where interview_config_id = v_config_id
    and is_published = true
    and id <> p_version_id;

  update topic_analysis_version
  set is_published = true
  where id = p_version_id;
end;
$$;

-- 公開データAPI: 二次利用許諾済みの公開意見を新しい順に返す。
-- テーマあたり公開意見数が閾値未満のテーマは除外（web の k-匿名性ゲートと同一基準）。
create function find_open_data_opinions(
  p_min_public_opinions integer,
  p_limit integer,
  p_cursor_created_at timestamptz default null,
  p_cursor_id uuid default null
) returns table (
  opinion_id uuid,
  interview_config_id uuid,
  interview_config_name text,
  role_title text,
  role_description text,
  summary text,
  final_text text,
  interview_session_id uuid,
  created_at timestamptz
)
language sql
stable
set search_path = public
as $$
  with eligible_configs as (
    select s.interview_config_id
    from opinions o
    join interview_sessions s on s.id = o.interview_session_id
    join interview_configs c on c.id = s.interview_config_id
    where o.review_status = 'published'
      and c.status <> 'draft'
    group by s.interview_config_id
    having count(*) >= p_min_public_opinions
  )
  select
    o.id as opinion_id,
    c.id as interview_config_id,
    c.name as interview_config_name,
    o.role_title,
    o.role_description,
    o.summary,
    o.final_text,
    o.interview_session_id,
    o.created_at
  from opinions o
  join interview_sessions s on s.id = o.interview_session_id
  join interview_configs c on c.id = s.interview_config_id
  where s.interview_config_id in (select ec.interview_config_id from eligible_configs ec)
    and o.review_status = 'published'
    and o.is_data_reuse_consented
    and (
      p_cursor_created_at is null
      or (o.created_at, o.id) < (p_cursor_created_at, p_cursor_id)
    )
  order by o.created_at desc, o.id desc
  limit p_limit;
$$;

comment on function find_open_data_opinions(integer, integer, timestamptz, uuid) is
  '公開データAPI用: 二次利用許諾済みの公開意見を新しい順に返す。テーマあたり公開意見数が閾値未満のテーマは除外（webのk-匿名性ゲートと同一基準）';
