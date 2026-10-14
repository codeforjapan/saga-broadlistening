-- みんなの声のまとめの生成プロンプト（Epic #162 / #160）を、既存のプロンプト管理（版の履歴・公開）に載せる。
-- 本文の既定値はコード（VOICE_SUMMARY_TEMPLATE）にあり、公開版がなければそれを使う。既存データは変更しない。
insert into public.ai_prompts (key, name) values
  ('voice-summary-system', 'みんなの声のまとめ・生成方針')
on conflict (key) do nothing;
