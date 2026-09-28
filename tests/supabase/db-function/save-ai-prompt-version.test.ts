import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import {
  adminClient,
  createTestAdminUser,
  getAnonClient,
  getAuthenticatedClient,
} from "../utils";

describe("save_ai_prompt_version", () => {
  let actor: Awaited<ReturnType<typeof createTestAdminUser>>;

  beforeAll(async () => {
    actor = await createTestAdminUser(
      `prompt-save-${randomUUID()}@example.com`
    );
  });

  async function createPrompt() {
    const key = `test-save-${randomUUID()}`;
    const { data, error } = await adminClient
      .from("ai_prompts")
      .insert({ key, name: key })
      .select("id")
      .single();
    if (error || !data) throw new Error(error?.message ?? "Prompt missing");
    return { key, id: data.id };
  }

  function save(key: string, revision: number, content = "Prompt body") {
    return adminClient.rpc("save_ai_prompt_version", {
      p_key: key,
      p_content: content,
      p_change_note: "Reason",
      p_actor_id: actor.id,
      p_expected_revision: revision,
    });
  }

  it("serializes concurrent saves against revision zero", async () => {
    const prompt = await createPrompt();
    const results = await Promise.all([
      save(prompt.key, 0),
      save(prompt.key, 0),
    ]);
    expect(results.filter((result) => result.error === null)).toHaveLength(1);
    expect(
      results.filter((result) => result.error?.code === "40001")
    ).toHaveLength(1);

    const { data: versions } = await adminClient
      .from("ai_prompt_versions")
      .select("id, version")
      .eq("prompt_id", prompt.id);
    const { data: parent } = await adminClient
      .from("ai_prompts")
      .select("revision, published_version_id")
      .eq("id", prompt.id)
      .single();
    expect(versions).toHaveLength(1);
    expect(versions?.[0]?.version).toBe(1);
    expect(parent).toMatchObject({ revision: 1, published_version_id: null });
  });

  it("rejects blank or oversized content and invalid change notes", async () => {
    const prompt = await createPrompt();
    for (const [content, note] of [
      ["   ", "Reason"],
      ["\n\t", "Reason"],
      ["x".repeat(100001), "Reason"],
      ["Content", "   "],
      ["Content", "\n\t"],
      ["Content", "x".repeat(1001)],
    ]) {
      const { error } = await adminClient.rpc("save_ai_prompt_version", {
        p_key: prompt.key,
        p_content: content,
        p_change_note: note,
        p_actor_id: actor.id,
        p_expected_revision: 0,
      });
      expect(error?.code).toBe("22023");
    }
  });

  it("rolls back the version and revision if audit insertion fails", async () => {
    const prompt = await createPrompt();
    const { error } = await adminClient.rpc("save_ai_prompt_version", {
      p_key: prompt.key,
      p_content: "Content",
      p_change_note: "Reason",
      p_actor_id: randomUUID(),
      p_expected_revision: 0,
    });
    expect(error?.code).toBe("23503");
    const { count } = await adminClient
      .from("ai_prompt_versions")
      .select("id", { count: "exact", head: true })
      .eq("prompt_id", prompt.id);
    const { data: parent } = await adminClient
      .from("ai_prompts")
      .select("revision")
      .eq("id", prompt.id)
      .single();
    expect(count).toBe(0);
    expect(parent?.revision).toBe(0);
  });

  it("rejects direct version UPDATE and DELETE through service role", async () => {
    const prompt = await createPrompt();
    const { data: versionId, error } = await save(prompt.key, 0);
    expect(error).toBeNull();
    const update = await adminClient
      .from("ai_prompt_versions")
      .update({ content: "changed" })
      .eq("id", versionId);
    const deletion = await adminClient
      .from("ai_prompt_versions")
      .delete()
      .eq("id", versionId);
    expect(update.error?.message).toContain("append-only");
    expect(deletion.error?.message).toContain("append-only");
  });

  it("rejects RPC execution for anon and authenticated clients", async () => {
    const prompt = await createPrompt();
    const authenticated = await getAuthenticatedClient(
      actor.email,
      actor.password
    );
    for (const client of [getAnonClient(), authenticated]) {
      const { error } = await client.rpc("save_ai_prompt_version", {
        p_key: prompt.key,
        p_content: "Content",
        p_change_note: "Reason",
        p_actor_id: actor.id,
        p_expected_revision: 0,
      });
      expect(error?.code).toBe("42501");
    }
  });

  it("hides prompt rows and versions from anon and authenticated clients", async () => {
    const prompt = await createPrompt();
    const version = await save(prompt.key, 0);
    expect(version.error).toBeNull();
    const authenticated = await getAuthenticatedClient(
      actor.email,
      actor.password
    );
    for (const client of [getAnonClient(), authenticated]) {
      const prompts = await client
        .from("ai_prompts")
        .select("id")
        .eq("id", prompt.id);
      const versions = await client
        .from("ai_prompt_versions")
        .select("id")
        .eq("prompt_id", prompt.id);
      expect(prompts.error?.code).toBe("42501");
      expect(versions.error?.code).toBe("42501");
    }
  });
});
