-- ============================================================
-- 回答者の属性（年代・住んでいるエリア）をユーザー単位で持つ
-- #275
--
-- まとめ確認のモーダル（STEP 2）で任意に答えてもらい、次の回答では初期値に使う。
-- 回答者は Supabase の匿名ユーザーなので、ブラウザ（端末）ごとに別ユーザーになる。
-- 値はコード（例: 20s, saga_city）で持ち、選べる値と表示名はアプリ側の定数で管理する。
-- エリアの区分は自治体ごとに違い、まだ確定していないので、DB では値を縛らない。
-- ============================================================

create table user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  age_group text,
  area text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger update_user_profiles_updated_at before update on user_profiles
  for each row execute function update_updated_at_column();

alter table user_profiles enable row level security;

comment on table user_profiles is '回答者（匿名認証ユーザー）の属性。まとめ確認の STEP 2 で任意に回答する。公開エンドポイントのレスポンスやLLMへの入力には含めないこと';
comment on column user_profiles.age_group is '年代のコード（10s / 20s / 30s / 40s / 50s / 60s_over）。未回答は null';
comment on column user_profiles.area is '住んでいるエリアのコード。区分はアプリ側の定数で管理する。未回答は null';
