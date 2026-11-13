import { describe, expect, it } from "vitest";
import { configGenerationResponseSchema } from "./schemas";

describe("configGenerationResponseSchema", () => {
  it("観点・クイックリプライが null の質問を受け付ける", () => {
    const result = configGenerationResponseSchema.safeParse({
      text: "修正しました",
      questions: [
        {
          question: "最近どこへ移動しましたか",
          follow_up_guide: null,
          quick_replies: null,
        },
      ],
    });

    expect(result.success).toBe(true);
  });
});
