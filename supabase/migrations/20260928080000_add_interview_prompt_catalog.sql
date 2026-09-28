-- Reuse the existing prompt history and publishing RPCs. No existing data changes.
insert into public.ai_prompts (key, name) values
  ('interview-chat-system', 'AIインタビュー・対話方針'),
  ('interview-summary-system', 'AIインタビュー・要約方針')
on conflict (key) do nothing;
