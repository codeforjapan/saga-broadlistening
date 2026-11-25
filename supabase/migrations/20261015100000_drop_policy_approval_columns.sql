-- 施策のレビュー（承認）の仕組みをなくす。
-- admin に入力手段がなく、web の「レビュー中」表示とレビュー完了のチェックも外したため、
-- 値を残さずに列を落とす（本番の値は失われる）。
alter table policies drop column approved_by;
alter table policies drop column approved_at;

-- 旧 bills のレビュー完了フラグ（20260406100000 で追加）も、どこからも参照されないので落とす。
-- 旧テーブル自体は Issue #59 でまとめて削除する。
alter table bills drop column if exists is_review_completed;
