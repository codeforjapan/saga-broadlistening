import {
  adminClient,
  cleanupTestInterviewConfig,
  createTestInterviewConfig,
  createTestOpinionWithSegments,
  createTestPublicOpinions,
} from "@test-utils/utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { generateVoiceSummaryDraft } from "./generate-voice-summary-draft";

const VALID_MARKDOWN =
  "# 問い\n\n冒頭の段落です。\n\n## 課題\n- **項目**：説明";

/**
 * まとめの下書き生成（#160）の統合テスト。LLM は Fake に差し替える。
 */
describe("generateVoiceSummaryDraft 統合テスト", () => {
  let configId: string;
  let calls: number;
  const generate = async () => {
    calls += 1;
    return VALID_MARKDOWN;
  };

  beforeEach(async () => {
    calls = 0;
    configId = (await createTestInterviewConfig({ status: "open" })).id;
  });

  afterEach(async () => {
    await cleanupTestInterviewConfig(configId);
  });

  /** 公開済みの意見1件をトピックに割り当てた、公開中のトピック分析を作る */
  async function publishAnalysis() {
    const { segmentIds } = await createTestOpinionWithSegments({
      interviewConfigId: configId,
      userId: null,
      segments: [{ title: "求人が少ない", content: "市内に求人が少ない" }],
      opinion: {
        review_status: "published",
        is_public_by_user: true,
        is_public_by_admin: true,
        // 公開画面のトピック分析は、モデレーションが ok の意見だけを数える
        moderation_score: 0,
      },
    });
    const { data: version, error } = await adminClient
      .from("topic_analysis_version")
      .insert({
        interview_config_id: configId,
        version: 1,
        status: "completed",
        is_published: true,
        trigger: "manual",
      })
      .select("id")
      .single();
    if (error) throw error;
    const { data: topic, error: topicError } = await adminClient
      .from("topic")
      .insert({
        version_id: version.id,
        title: "仕事の選択肢",
        description: "求人が少ないという意見",
        sort_order: 0,
      })
      .select("id")
      .single();
    if (topicError) throw topicError;
    const { error: linkError } = await adminClient.from("topic_opinion").insert(
      segmentIds.map((segmentId) => ({
        topic_id: topic.id,
        opinion_segment_id: segmentId,
        version_id: version.id,
      }))
    );
    if (linkError) throw linkError;
    return { versionId: version.id, topicId: topic.id };
  }

  it("公開意見が最低件数に満たなければ生成しない（LLM を呼ばない）", async () => {
    await createTestPublicOpinions({
      interviewConfigId: configId,
      userId: null,
      count: 19,
    });

    const result = await generateVoiceSummaryDraft(configId, { generate });

    expect(result.success).toBe(false);
    expect(calls).toBe(0);
  });

  it("公開中のトピック分析がなければ生成しない", async () => {
    await createTestPublicOpinions({
      interviewConfigId: configId,
      userId: null,
      count: 20,
    });

    const result = await generateVoiceSummaryDraft(configId, { generate });

    expect(result).toEqual({
      success: false,
      error:
        "公開中のトピック分析がありません。先にトピック分析を公開してください",
    });
    expect(calls).toBe(0);
  });

  it("公開中の分析から下書きを作り、もとになった分析・件数・プロンプトの版を記録する", async () => {
    await createTestPublicOpinions({
      interviewConfigId: configId,
      userId: null,
      count: 20,
    });
    const { versionId, topicId } = await publishAnalysis();

    const result = await generateVoiceSummaryDraft(configId, { generate });

    if (!result.success) throw new Error(result.error);
    expect(calls).toBe(1);
    const { data } = await adminClient
      .from("theme_voice_summaries")
      .select(
        "status, content_md, topic_analysis_version_id, source_topic_count, source_opinion_count, source_topic_ids, prompt_version"
      )
      .eq("id", result.id)
      .single();
    expect(data).toEqual({
      status: "draft",
      content_md: VALID_MARKDOWN,
      topic_analysis_version_id: versionId,
      source_topic_count: 1,
      source_opinion_count: 1,
      source_topic_ids: [topicId],
      prompt_version: "default",
    });
  });
});
