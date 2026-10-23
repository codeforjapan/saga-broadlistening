import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import {
  createPromptVersion,
  findPromptState,
  findPublishedPrompt,
  publishPromptVersion,
} from "../../packages/shared/src/prompts/repository";
import { adminClient, createTestAdminUser } from "./utils";

describe("public prompt repository", () => {
  let actorId: string;
  beforeAll(async () => {
    actorId = (
      await createTestAdminUser(`prompt-repo-${randomUUID()}@example.com`)
    ).id;
  });

  it("reads the selected version and can restore an older publication", async () => {
    const key = `test-prompt-repo-${randomUUID()}`;
    const { error: insertError } = await adminClient
      .from("ai_prompts")
      .insert({ key, name: key });
    if (insertError) throw insertError;
    expect(await findPublishedPrompt(key)).toBeNull();

    const first = await createPromptVersion({
      key,
      content: "First {{billSummary}}",
      changeNote: "Initial version",
      actorId,
      expectedRevision: 0,
    });
    const second = await createPromptVersion({
      key,
      content: "Second {{billSummary}}",
      changeNote: "Second version",
      actorId,
      expectedRevision: 1,
    });
    const draft = await findPromptState(key);
    expect(draft.prompt.revision).toBe(2);
    expect(draft.versions.map((version) => version.id)).toEqual([
      second,
      first,
    ]);
    expect(await findPublishedPrompt(key)).toBeNull();

    await publishPromptVersion({
      key,
      versionId: second,
      changeNote: "Publish latest",
      actorId,
      expectedRevision: 2,
    });
    expect(await findPublishedPrompt(key)).toEqual({
      content: "Second {{billSummary}}",
    });
    await publishPromptVersion({
      key,
      versionId: first,
      changeNote: "Restore earlier version",
      actorId,
      expectedRevision: 3,
    });
    expect(await findPublishedPrompt(key)).toEqual({
      content: "First {{billSummary}}",
    });
    const restored = await findPromptState(key);
    expect(restored.prompt).toMatchObject({
      revision: 4,
      published_version_id: first,
    });

    const { data: logs, error: logError } = await adminClient
      .from("audit_logs")
      .select("metadata")
      .eq("entity_id", restored.prompt.id)
      .eq("action", "ai_prompt_version_published")
      .order("created_at", { ascending: false });
    if (logError) throw logError;
    expect(logs?.[0]?.metadata).toMatchObject({
      previous_published_version_id: second,
      published_version_id: first,
    });
  });
});
