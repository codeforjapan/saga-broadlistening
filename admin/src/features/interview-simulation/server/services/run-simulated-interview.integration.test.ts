import { MockLanguageModelV3 } from "ai/test";
import { afterEach, describe, expect, it, vi } from "vitest";
import { runSimulatedInterview } from "./run-simulated-interview";

function createModel(modelId: string, ...outputs: unknown[]) {
  return new MockLanguageModelV3({
    provider: "fake",
    modelId,
    doGenerate: async () => ({
      content: [{ type: "text", text: JSON.stringify(outputs.shift()) }],
      finishReason: { unified: "stop", raw: undefined },
      usage: {
        inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 },
        outputTokens: { total: 1, text: 1, reasoning: 0 },
      },
      warnings: [],
    }),
  });
}

afterEach(() => vi.unstubAllEnvs());

describe("runSimulatedInterview model injection", () => {
  it.each([
    true,
    false,
  ])("要約モデル明示=%s でも注入モデルで認証なしに完走し、実モデルIDを記録する", async (explicitSummary) => {
    vi.stubEnv("AI_ALLOWED_PROVIDERS", "invalid-for-injected-models");
    const report = {
      summary: "要約",
      stance: "neutral",
      role: "general_citizen",
      role_description: null,
      role_title: null,
      opinions: [],
    };
    const result = await runSimulatedInterview({
      persona: {
        role_title: "市民",
        role_description: "地域住民",
        stance: "neutral",
        knowledge_level: "beginner",
        speaking_style: "端的",
        background: "市内在住",
        key_concerns: ["安全性"],
        typical_response_length: "short",
        boundaries: [],
        message_to_politicians: ["安全性を重視してほしい"],
      },
      interviewerModel: createModel(
        "interviewer",
        {
          text: "意見を聞かせてください",
          topic_title: null,
          question_id: null,
          next_stage: "summary",
          quick_replies: null,
        },
        ...(explicitSummary ? [] : [report])
      ),
      intervieweeModel: createModel("interviewee", "安全性が大切です"),
      summaryModel: explicitSummary
        ? createModel("summary", report)
        : undefined,
      traceId: "test-trace",
      kind: "improved",
      maxTurns: 1,
      initialTurnEnhancement: {
        subjectTitle: "地域の安全",
        firstQuestionId: null,
      },
      promptInputs: {
        bill: null,
        interviewConfig: { name: "地域の安全", description: null },
        questions: [],
      },
    });

    expect(result.interviewerModel).toBe("fake:interviewer");
    expect(result.intervieweeModel).toBe("fake:interviewee");
    expect(result.stopReason).toBe("summary");
    expect(result.generatedReport).toEqual(report);
    expect(result.transcript[0]?.content).toBe("意見を聞かせてください");
  });
});
