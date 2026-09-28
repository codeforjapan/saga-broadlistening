import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import {
  adminClient,
  createTestAdminUser,
  getAnonClient,
  getAuthenticatedClient,
} from "../utils";

describe("publish_ai_prompt_version", () => {
  let actor: Awaited<ReturnType<typeof createTestAdminUser>>;

  beforeAll(async () => {
    actor = await createTestAdminUser(
      `prompt-publish-${randomUUID()}@example.com`
    );
  });

  async function createPrompt() {
    const key = `test-publish-${randomUUID()}`;
    const { data, error } = await adminClient
      .from("ai_prompts")
      .insert({ key, name: key })
      .select("id")
      .single();
    if (error || !data) throw new Error(error?.message ?? "Prompt missing");
    return { key, id: data.id };
  }

  async function save(key: string, revision: number): Promise<string> {
    const { data, error } = await adminClient.rpc("save_ai_prompt_version", {
      p_key: key,
      p_content: "Prompt body",
      p_change_note: "Save reason",
      p_actor_id: actor.id,
      p_expected_revision: revision,
    });
    if (error || !data) throw new Error(error?.message ?? "Version missing");
    return data;
  }

  function publish(key: string, versionId: string, revision: number) {
    return adminClient.rpc("publish_ai_prompt_version", {
      p_key: key,
      p_version_id: versionId,
      p_change_note: "Publish reason",
      p_actor_id: actor.id,
      p_expected_revision: revision,
    });
  }

  it("keeps the published version when a later draft is saved", async () => {
    const prompt = await createPrompt();
    const first = await save(prompt.key, 0);
    const published = await publish(prompt.key, first, 1);
    expect(published.error).toBeNull();
    await save(prompt.key, 2);

    const { data: parent } = await adminClient
      .from("ai_prompts")
      .select("revision, published_version_id")
      .eq("id", prompt.id)
      .single();
    expect(parent).toMatchObject({
      revision: 3,
      published_version_id: first,
    });
    const { data: audit } = await adminClient
      .from("audit_logs")
      .select("action, metadata")
      .eq("entity_type", "ai_prompt")
      .eq("entity_id", prompt.id)
      .order("created_at");
    expect(audit?.map((row) => row.action)).toEqual([
      "ai_prompt_version_saved",
      "ai_prompt_version_published",
      "ai_prompt_version_saved",
    ]);
    expect(JSON.stringify(audit)).not.toContain("Prompt body");
    expect(audit?.[1]?.metadata).toMatchObject({
      change_note: "Publish reason",
    });
  });

  it("rejects stale revision and a version belonging to another prompt", async () => {
    const prompt = await createPrompt();
    const other = await createPrompt();
    const version = await save(prompt.key, 0);
    const stale = await publish(prompt.key, version, 0);
    expect(stale.error?.code).toBe("40001");
    const wrongPrompt = await publish(other.key, version, 0);
    expect(wrongPrompt.error?.code).toBe("22023");
  });

  it("rolls back publication and revision if audit insertion fails", async () => {
    const prompt = await createPrompt();
    const version = await save(prompt.key, 0);
    const { error } = await adminClient.rpc("publish_ai_prompt_version", {
      p_key: prompt.key,
      p_version_id: version,
      p_change_note: "Reason",
      p_actor_id: randomUUID(),
      p_expected_revision: 1,
    });
    expect(error?.code).toBe("23503");
    const { data: parent } = await adminClient
      .from("ai_prompts")
      .select("revision, published_version_id")
      .eq("id", prompt.id)
      .single();
    expect(parent).toMatchObject({ revision: 1, published_version_id: null });
  });

  it("rejects whitespace-only publication reasons", async () => {
    const prompt = await createPrompt();
    const version = await save(prompt.key, 0);
    const { error } = await adminClient.rpc("publish_ai_prompt_version", {
      p_key: prompt.key,
      p_version_id: version,
      p_change_note: "\n\t",
      p_actor_id: actor.id,
      p_expected_revision: 1,
    });
    expect(error?.code).toBe("22023");
  });

  it("rejects RPC execution for anon and authenticated clients", async () => {
    const prompt = await createPrompt();
    const version = await save(prompt.key, 0);
    const authenticated = await getAuthenticatedClient(
      actor.email,
      actor.password
    );
    for (const client of [getAnonClient(), authenticated]) {
      const { error } = await client.rpc("publish_ai_prompt_version", {
        p_key: prompt.key,
        p_version_id: version,
        p_change_note: "Reason",
        p_actor_id: actor.id,
        p_expected_revision: 1,
      });
      expect(error?.code).toBe("42501");
    }
  });
});
