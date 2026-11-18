import "server-only";
import { createAdminClient, type Database } from "@mirai-gikai/supabase";

type PromptRow = Database["public"]["Tables"]["ai_prompts"]["Row"];
type VersionRow = Database["public"]["Tables"]["ai_prompt_versions"]["Row"];

export interface PromptState {
  prompt: PromptRow;
  versions: VersionRow[];
}

export async function findPromptState(key: string): Promise<PromptState> {
  const client = createAdminClient();
  const { data: prompt, error: promptError } = await client
    .from("ai_prompts")
    .select("*")
    .eq("key", key)
    .single();
  if (promptError) throw promptError;
  const versions: VersionRow[] = [];
  const pageSize = 500;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await client
      .from("ai_prompt_versions")
      .select("*")
      .eq("prompt_id", prompt.id)
      .order("version", { ascending: false })
      .range(offset, offset + pageSize - 1);
    if (error) throw error;
    versions.push(...data);
    if (data.length < pageSize) break;
  }
  return { prompt, versions };
}

export async function findPublishedPrompt(
  key: string
): Promise<{ content: string } | null> {
  const { data, error } = await createAdminClient()
    .from("ai_prompts")
    .select(
      "published_version_id, published:ai_prompt_versions!ai_prompts_published_version_fk(content)"
    )
    .eq("key", key)
    .abortSignal(AbortSignal.timeout(2000))
    .maybeSingle();
  if (error) throw error;
  if (!data?.published_version_id) return null;
  const published = data.published;
  if (!published || Array.isArray(published)) {
    if (Array.isArray(published) && published.length === 1) return published[0];
    throw new Error("Published prompt version is inconsistent");
  }
  return published;
}

export async function createPromptVersion(input: {
  key: string;
  content: string;
  changeNote: string;
  actorId: string;
  expectedRevision: number;
}): Promise<string> {
  const { data, error } = await createAdminClient().rpc("save_ai_prompt_version", {
    p_key: input.key,
    p_content: input.content,
    p_change_note: input.changeNote,
    p_actor_id: input.actorId,
    p_expected_revision: input.expectedRevision,
  });
  if (error) throw error;
  return data;
}

export async function publishPromptVersion(input: {
  key: string;
  versionId: string;
  changeNote: string;
  actorId: string;
  expectedRevision: number;
}): Promise<void> {
  const { error } = await createAdminClient().rpc("publish_ai_prompt_version", {
    p_key: input.key,
    p_version_id: input.versionId,
    p_change_note: input.changeNote,
    p_actor_id: input.actorId,
    p_expected_revision: input.expectedRevision,
  });
  if (error) throw error;
}
