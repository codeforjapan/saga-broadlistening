import { describe, expect, it } from "vitest";
import type { PublicOpinion, PublicTopic } from "../public/public-types";
import {
  buildVoiceSummaryTopicsText,
  type GenerateMarkdownFn,
  generateVoiceSummary,
  stripCodeFence,
  VoiceSummaryGenerationError,
} from "./generate-voice-summary";

const VALID = "# 問い\n\n段落です。\n\n## 課題\n- **項目**：説明";
const INVALID = "# 問い\n\n[リンク](https://example.jp)";

function fakeGenerate(outputs: string[]) {
  const calls: Parameters<GenerateMarkdownFn>[0][] = [];
  const generate: GenerateMarkdownFn = async (params) => {
    calls.push(params);
    const output = outputs[calls.length - 1];
    if (output === undefined) throw new Error("unexpected call");
    return output;
  };
  return { generate, calls };
}

function opinion(content: string, richness: number | null): PublicOpinion {
  return {
    id: content,
    opinion_id: content,
    opinion_public: true,
    created_at: null,
    title: content,
    content,
    role_title: "学生",
    contextual_quote: null,
    richness,
    source_message_id: null,
    question_snippet: null,
  };
}

function topic(
  title: string,
  opinionCount: number,
  opinions: PublicOpinion[] = []
): PublicTopic {
  return {
    id: title,
    title,
    description: `${title}の要約`,
    opinion_count: opinionCount,
    opinions,
  };
}

describe("generateVoiceSummary", () => {
  it("1回目が記法の検証に通ればそのまま返す", async () => {
    const { generate, calls } = fakeGenerate([VALID]);
    await expect(
      generateVoiceSummary({ systemPrompt: "system", generate })
    ).resolves.toEqual({ markdown: VALID, attempts: 1 });
    expect(calls).toHaveLength(1);
    expect(calls[0].system).toBe("system");
  });

  it("検証に落ちたらエラー内容を付けて1回だけ書き直させる", async () => {
    const { generate, calls } = fakeGenerate([INVALID, VALID]);
    await expect(
      generateVoiceSummary({ systemPrompt: "system", generate })
    ).resolves.toEqual({ markdown: VALID, attempts: 2 });
    expect(calls).toHaveLength(2);
    const retry = calls[1].messages;
    expect(retry[1]).toEqual({ role: "assistant", content: INVALID });
    expect(retry[2].content).toContain("リンク");
  });

  it("書き直しても通らなければエラーにする（3回目は呼ばない）", async () => {
    const { generate, calls } = fakeGenerate([INVALID, INVALID]);
    await expect(
      generateVoiceSummary({ systemPrompt: "system", generate })
    ).rejects.toBeInstanceOf(VoiceSummaryGenerationError);
    expect(calls).toHaveLength(2);
  });

  it("コードブロックで囲まれた出力は中身だけを使う", async () => {
    const { generate } = fakeGenerate([`\`\`\`markdown\n${VALID}\n\`\`\``]);
    await expect(
      generateVoiceSummary({ systemPrompt: "system", generate })
    ).resolves.toEqual({ markdown: VALID, attempts: 1 });
  });
});

describe("stripCodeFence", () => {
  it("囲みがなければそのまま（前後の空白だけ外す）", () => {
    expect(stripCodeFence(`  ${VALID}\n`)).toBe(VALID);
  });
});

describe("buildVoiceSummaryTopicsText", () => {
  it("件数の多い順に、要約と情報量の多い代表的な意見3件を並べる", () => {
    const text = buildVoiceSummaryTopicsText([
      topic("少ないトピック", 3),
      topic("多いトピック", 18, [
        opinion("意見A", 10),
        opinion("意見B", 90),
        opinion("意見C", null),
        opinion("意見D", 50),
      ]),
    ]);
    expect(text).toBe(
      [
        "### トピック1: 多いトピック（18件）",
        "要約: 多いトピックの要約",
        "代表的な意見:",
        "  - 「意見B」",
        "  - 「意見D」",
        "  - 「意見A」",
        "",
        "### トピック2: 少ないトピック（3件）",
        "要約: 少ないトピックの要約",
      ].join("\n")
    );
  });
});
