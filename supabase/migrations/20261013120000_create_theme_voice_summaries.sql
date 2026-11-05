-- ============================================================
-- みんなの声のまとめ（テーマ全体の声をAIが整理したMarkdown）
-- Epic #162 / #160
--
-- AI が公開中のトピック分析から下書きを生成し、admin で確認・編集してから公開する。
-- 版ごとに1行を持ち、公開中はテーマごとに1件だけ。編集できるのは下書き（draft）だけで、
-- 公開中の版を直すときは複製して下書きを作る（アプリ層で制御）。
-- ============================================================

create table theme_voice_summaries (
  id uuid primary key default gen_random_uuid(),
  interview_config_id uuid not null references interview_configs(id) on delete cascade,
  -- どの公開トピック分析をもとに作ったか
  topic_analysis_version_id uuid references topic_analysis_version(id) on delete set null,
  content_md text not null,
  status text not null default 'draft'
    check (status in ('draft', 'published', 'archived')),
  source_topic_count integer not null check (source_topic_count >= 0),
  source_opinion_count integer not null check (source_opinion_count >= 0),
  -- もとになったトピック（公開画面の「このまとめのもとになったトピック」用、表示順）
  source_topic_ids uuid[] not null default '{}',
  model text,
  prompt_version text,
  generated_at timestamptz,
  edited_by uuid references auth.users(id) on delete set null,
  edited_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- 公開中なら published_at は必須
  constraint theme_voice_summaries_published_at_required
    check (status <> 'published' or published_at is not null)
);

-- 公開中はテーマごとに1件
create unique index theme_voice_summaries_one_published
  on theme_voice_summaries(interview_config_id) where status = 'published';

-- admin の履歴一覧（テーマごとに新しい順）
create index idx_theme_voice_summaries_config_created_at
  on theme_voice_summaries(interview_config_id, created_at desc);

create trigger update_theme_voice_summaries_updated_at
  before update on theme_voice_summaries
  for each row execute function update_updated_at_column();

alter table theme_voice_summaries enable row level security;

comment on table theme_voice_summaries is 'みんなの声のまとめ。テーマ（interview_configs）ごとに版を持ち、公開中は1件だけ';
comment on column theme_voice_summaries.topic_analysis_version_id is '生成のもとにした公開トピック分析の版';
comment on column theme_voice_summaries.content_md is 'まとめ本文（Markdown）。使える記法は #, ##, ###, 箇条書き, 番号つき, 太字, 引用, 段落の8つ';
comment on column theme_voice_summaries.status is 'draft: 下書き / published: 公開中 / archived: 公開を終えた版';
comment on column theme_voice_summaries.source_topic_count is '生成のもとにしたトピック数（公開画面の「N件のトピック」）';
comment on column theme_voice_summaries.source_opinion_count is '生成のもとにした意見数（公開画面の「N件の意見」）';
comment on column theme_voice_summaries.source_topic_ids is '公開画面の「このまとめのもとになったトピック」に出すトピックのID（表示順）';
comment on column theme_voice_summaries.model is '生成に使ったモデル';
comment on column theme_voice_summaries.prompt_version is '生成に使ったプロンプトの版';
comment on column theme_voice_summaries.generated_at is 'AIが生成した日時（手で複製した版は複製元の値を引き継ぐ）';
comment on column theme_voice_summaries.edited_by is '最後に編集した職員のユーザーID';
comment on column theme_voice_summaries.edited_at is '最後に編集した日時';
comment on column theme_voice_summaries.published_at is '公開した日時（公開画面の「更新日」）';

-- 版の公開切替を1トランザクションで行う。同じテーマの公開中の版は archived にする。
create function publish_theme_voice_summary(p_summary_id uuid)
returns void
language plpgsql
as $$
declare
  v_config_id uuid;
begin
  select interview_config_id into v_config_id
  from theme_voice_summaries
  where id = p_summary_id;

  if v_config_id is null then
    raise exception 'theme_voice_summary % not found', p_summary_id;
  end if;

  -- 同じテーマの公開を直列にする（公開中が0件のときに2件を同時に公開すると、
  -- どちらの archive も0件に当たり、片方が部分ユニーク制約で失敗するため）
  perform 1 from interview_configs where id = v_config_id for update;

  -- 先に同テーマの公開中の版を降ろす（同一トランザクション内なので部分ユニーク制約に衝突しない）
  update theme_voice_summaries
  set status = 'archived'
  where interview_config_id = v_config_id
    and status = 'published'
    and id <> p_summary_id;

  -- すでに公開中の版を再公開しても、公開画面の「更新日」は変えない
  update theme_voice_summaries
  set status = 'published',
      published_at = case when status = 'published' then published_at else now() end
  where id = p_summary_id;
end;
$$;

comment on function publish_theme_voice_summary(uuid) is
  'みんなの声のまとめの版を公開する。同じテーマで公開中だった版は archived にする';
