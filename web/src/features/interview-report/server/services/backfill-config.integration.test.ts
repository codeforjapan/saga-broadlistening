import { runBackfill } from "@mirai-gikai/topic-analysis-core/backfill";
import { runTagBackfill } from "@mirai-gikai/topic-analysis-core/tag-backfill";
import {
  adminClient,
  cleanupTestInterviewConfig,
  createTestInterviewConfig,
  createTestOpinionWithSegments,
} from "@test-utils/utils";
import { afterEach, describe, expect, it, vi } from "vitest";

describe("バックフィルのAI設定事前検証", () => {
  let configId: string | undefined;
  afterEach(async () => {
    vi.unstubAllEnvs();
    if (configId) await cleanupTestInterviewConfig(configId);
    configId = undefined;
  });

  it.each([
    "opinions",
    "tags",
  ])("%s のAPIキー不足ではウォーターマークを変更しない", async (mode) => {
    vi.stubEnv("AI_ALLOWED_PROVIDERS", "openai");
    vi.stubEnv("OPENAI_API_KEY", "");
    const config = await createTestInterviewConfig();
    configId = config.id;
    const marker = "2026-09-01T00:00:00+00:00";
    const { opinionId, segmentIds } = await createTestOpinionWithSegments({
      interviewConfigId: config.id,
      userId: null,
      segments: [{ tags_extracted_at: marker }],
    });
    const { error } = await adminClient
      .from("opinions")
      .update({ opinions_reextracted_at: marker })
      .eq("id", opinionId);
    expect(error).toBeNull();
    const run = mode === "opinions" ? runBackfill : runTagBackfill;
    await expect(
      run({
        interviewConfigId: config.id,
        scope: "all",
        model: "openai:gpt-4o",
      })
    ).rejects.toThrow("OPENAI_API_KEY");
    const { data: opinion } = await adminClient
      .from("opinions")
      .select("opinions_reextracted_at")
      .eq("id", opinionId)
      .single();
    const { data: segment } = await adminClient
      .from("opinion_segments")
      .select("tags_extracted_at")
      .eq("id", segmentIds[0])
      .single();
    expect(opinion?.opinions_reextracted_at).toBe(marker);
    expect(segment?.tags_extracted_at).toBe(marker);
  });
});
