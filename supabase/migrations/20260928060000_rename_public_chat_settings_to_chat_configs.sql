alter table public.public_chat_settings rename to chat_configs;

alter table public.chat_configs enable row level security;
