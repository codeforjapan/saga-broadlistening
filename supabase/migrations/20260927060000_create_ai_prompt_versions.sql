create table ai_prompts (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  revision integer not null default 0 check (revision >= 0),
  published_version_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table ai_prompt_versions (
  id uuid primary key default gen_random_uuid(),
  prompt_id uuid not null references ai_prompts(id),
  version integer not null check (version > 0),
  content text not null check (
    char_length(content) between 1 and 100000 and content ~ '[^[:space:]]'
  ),
  change_note text not null check (
    char_length(regexp_replace(change_note, '^[[:space:]]+|[[:space:]]+$', '', 'g')) between 1 and 1000
  ),
  created_by uuid,
  created_at timestamptz not null default now(),
  unique (prompt_id, version),
  unique (prompt_id, id)
);

alter table ai_prompts
  add constraint ai_prompts_published_version_fk
  foreign key (id, published_version_id)
  references ai_prompt_versions(prompt_id, id);

create index ai_prompt_versions_prompt_created_idx
  on ai_prompt_versions(prompt_id, created_at desc);

create trigger update_ai_prompts_updated_at before update on ai_prompts
  for each row execute function update_updated_at_column();

create function prevent_ai_prompt_versions_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'ai_prompt_versions is append-only';
end;
$$;

create trigger ai_prompt_versions_append_only
  before update or delete on ai_prompt_versions
  for each row execute function prevent_ai_prompt_versions_mutation();

alter table ai_prompts enable row level security;
alter table ai_prompt_versions enable row level security;

insert into ai_prompts (key, name) values
  ('top-chat-system', 'トップページチャット'),
  ('bill-chat-system-normal', '施策チャット・通常'),
  ('bill-chat-system-hard', '施策チャット・詳しく');

create function save_ai_prompt_version(
  p_key text,
  p_content text,
  p_change_note text,
  p_actor_id uuid,
  p_expected_revision integer
)
returns uuid
language plpgsql
as $$
declare
  v_prompt ai_prompts%rowtype;
  v_version integer;
  v_version_id uuid;
  v_change_note text;
begin
  v_change_note := regexp_replace(p_change_note, '^[[:space:]]+|[[:space:]]+$', '', 'g');
  if p_content is null or char_length(p_content) not between 1 and 100000
     or p_content !~ '[^[:space:]]'
     or p_change_note is null or char_length(v_change_note) not between 1 and 1000
     or p_actor_id is null or p_expected_revision is null or p_expected_revision < 0 then
    raise exception 'Invalid prompt version input' using errcode = '22023';
  end if;

  select * into v_prompt from ai_prompts where key = p_key for update;
  if not found then
    raise exception 'Unknown prompt key' using errcode = '22023';
  end if;
  if v_prompt.revision <> p_expected_revision then
    raise exception 'Prompt revision conflict' using errcode = '40001';
  end if;

  select coalesce(max(version), 0) + 1 into v_version
    from ai_prompt_versions where prompt_id = v_prompt.id;
  insert into ai_prompt_versions (prompt_id, version, content, change_note, created_by)
    values (v_prompt.id, v_version, p_content, v_change_note, p_actor_id)
    returning id into v_version_id;

  update ai_prompts set revision = revision + 1 where id = v_prompt.id;
  insert into audit_logs (action, entity_type, entity_id, actor_id, metadata)
    values (
      'ai_prompt_version_saved', 'ai_prompt', v_prompt.id, p_actor_id,
      jsonb_build_object(
        'version_id', v_version_id,
        'version', v_version,
        'previous_published_version_id', v_prompt.published_version_id,
        'published_version_id', v_prompt.published_version_id
      )
    );
  return v_version_id;
end;
$$;

create function publish_ai_prompt_version(
  p_key text,
  p_version_id uuid,
  p_change_note text,
  p_actor_id uuid,
  p_expected_revision integer
)
returns void
language plpgsql
as $$
declare
  v_prompt ai_prompts%rowtype;
  v_version integer;
  v_change_note text;
begin
  v_change_note := regexp_replace(p_change_note, '^[[:space:]]+|[[:space:]]+$', '', 'g');
  if p_version_id is null or p_change_note is null
     or char_length(v_change_note) not between 1 and 1000
     or p_actor_id is null or p_expected_revision is null or p_expected_revision < 0 then
    raise exception 'Invalid prompt publication input' using errcode = '22023';
  end if;

  select * into v_prompt from ai_prompts where key = p_key for update;
  if not found then
    raise exception 'Unknown prompt key' using errcode = '22023';
  end if;
  if v_prompt.revision <> p_expected_revision then
    raise exception 'Prompt revision conflict' using errcode = '40001';
  end if;

  select version into v_version from ai_prompt_versions
    where prompt_id = v_prompt.id and id = p_version_id;
  if not found then
    raise exception 'Version does not belong to prompt' using errcode = '22023';
  end if;

  update ai_prompts
    set published_version_id = p_version_id, revision = revision + 1
    where id = v_prompt.id;
  insert into audit_logs (action, entity_type, entity_id, actor_id, metadata)
    values (
      'ai_prompt_version_published', 'ai_prompt', v_prompt.id, p_actor_id,
      jsonb_build_object(
        'version_id', p_version_id,
        'version', v_version,
        'previous_published_version_id', v_prompt.published_version_id,
        'published_version_id', p_version_id,
        'change_note', v_change_note
      )
    );
end;
$$;

revoke execute on function save_ai_prompt_version(text, text, text, uuid, integer)
  from public, anon, authenticated;
grant execute on function save_ai_prompt_version(text, text, text, uuid, integer)
  to service_role;
revoke execute on function publish_ai_prompt_version(text, uuid, text, uuid, integer)
  from public, anon, authenticated;
grant execute on function publish_ai_prompt_version(text, uuid, text, uuid, integer)
  to service_role;
