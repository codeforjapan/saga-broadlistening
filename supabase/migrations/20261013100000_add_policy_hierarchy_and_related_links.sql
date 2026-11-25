-- ============================================================
-- 施策の親子関係・並び順・関連リンク
-- Epic #162 / #154・#157
--
-- 親施策（例: 若者支援）をテーマの親ページとして扱い、子施策（例: 奨学金返還支援）を
-- その配下に並べる。親子は1階層だけ（孫を許さない）とし、その判定は
-- アプリ層（admin の Server Action）で行う。DB では自己参照だけを禁止する。
-- ============================================================

alter table policies
  add column parent_policy_id uuid references policies(id) on delete set null,
  add column sort_order integer not null default 0,
  add column related_links jsonb not null default '[]'::jsonb;

alter table policies
  add constraint policies_parent_not_self check (parent_policy_id <> id),
  add constraint policies_related_links_is_array
    check (jsonb_typeof(related_links) = 'array');

-- 親施策ページの「関連施策」で子施策を引く
create index idx_policies_parent_policy_id on policies(parent_policy_id)
  where parent_policy_id is not null;

comment on column policies.parent_policy_id is '親施策のID。子施策（施策紹介ページ）のときだけ設定する。親子は1階層のみ（アプリ層で検証）';
comment on column policies.sort_order is '施策の並び順（小さいほど先）。TOP のテーマカードや親施策ページの関連施策で使う';
comment on column policies.related_links is '施策紹介ページの関連リンク。[{label, url, kind}] の配列で、配列の順が表示順。kind は policy_detail（施策詳細ページ）/ city_hp（佐賀市HP）';
