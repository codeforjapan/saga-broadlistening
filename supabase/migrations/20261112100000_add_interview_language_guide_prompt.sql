-- ------------------------------------------------------------
-- ai_prompts: 中立的な言葉づかい（言い換えの目安）も版管理する
-- 公開版が無いあいだは、コードの初期文面を使う
-- ------------------------------------------------------------
insert into public.ai_prompts (key, name) values
  ('interview-language-guide', 'AIインタビュー・中立的な言葉づかい')
on conflict (key) do nothing;
