create table public.public_chat_settings (
  id boolean primary key default true check (id),
  chat_model text,
  web_search_enabled boolean not null default false,
  allowed_domains text[] not null default '{}',
  constraint public_chat_search_requires_domains check (
    not web_search_enabled or cardinality(allowed_domains) > 0
  ),
  constraint public_chat_domains_limit check (cardinality(allowed_domains) <= 100)
);

alter table public.public_chat_settings enable row level security;

comment on table public.public_chat_settings is 'トップページ・施策詳細ページに共通の公開チャット設定。管理者認可はアプリケーション層で行う。';
insert into public.public_chat_settings (id) values (true);
