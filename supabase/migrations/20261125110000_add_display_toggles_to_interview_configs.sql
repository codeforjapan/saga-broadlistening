-- ============================================================
-- 星評価のアンケートと、会話ログの公開を、テーマごとに切り替えられるようにする
-- #277 / #278
--
-- どちらも既定はオフ。既存のテーマもオフになる。
-- ============================================================

alter table interview_configs
  add column rating_enabled boolean not null default false,
  add column chat_log_public boolean not null default false;

comment on column interview_configs.rating_enabled is 'インタビュー中に星評価のアンケートを出すか（既定はオフ）';
comment on column interview_configs.chat_log_public is '提出完了と公開レポートに会話ログ（会話の原文）を出すか（既定はオフ）。オフのときは会話ログも、会話ログへのリンクも出さない';
