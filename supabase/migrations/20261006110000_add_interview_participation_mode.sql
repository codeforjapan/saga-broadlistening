-- ============================================================
-- インタビューの参加条件をテーマ単位で管理する
-- Epic #147 / #144
--
-- public:            外部IDの紐付けを要求しない（公開募集・イベント・デモ）
-- external_identity: 外部IDの紐付けを要求する（外部アプリから回答してもらう募集）
--
-- 連携元を追加しても enum は増やさず、許可する連携元は
-- allowed_provider_keys（コード側レジストリの provider_key）で持つ。
-- ============================================================

create type interview_participation_mode_enum as enum ('public', 'external_identity');

alter table interview_configs
  add column participation_mode interview_participation_mode_enum not null default 'public',
  add column allowed_provider_keys text[] not null default '{}';

-- 既存テーマは公開募集・イベント・デモとして運用中のため、移行値は public にする
-- （2026-10-06 決定。上の default で既存行も public で埋まる）

-- 外部IDを要求するテーマは、許可する連携元を少なくとも1件持つ
alter table interview_configs
  add constraint interview_configs_external_identity_requires_providers check (
    participation_mode <> 'external_identity' or cardinality(allowed_provider_keys) > 0
  );

comment on column interview_configs.participation_mode is 'public: 誰でも回答できる / external_identity: 外部アプリの利用者（外部IDの紐付きがある人）のみ回答できる';
comment on column interview_configs.allowed_provider_keys is 'external_identity のとき回答を許可する連携元の provider_key 一覧（例: saga_super_app）。連携元の定義はコード側のレジストリ';
