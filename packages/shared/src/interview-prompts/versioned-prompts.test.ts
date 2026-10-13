import { describe, expect, it } from "vitest";
import {
  INTERVIEW_PROMPT_CATALOG,
  isInterviewPromptKey,
  isPromptKey,
} from "../prompts/catalog";
import { PromptProvider } from "../prompts/provider";
import { validatePromptTemplate } from "../prompts/template";
import { buildChatSystemPrompt } from "./chat-prompt";
import { buildInitialSystemPrompt } from "./initial-prompt";
import { getPurposeTemplateSteps } from "./purpose-types/registry";
import { buildSummarySystemPrompt } from "./summary";
import { buildTurnTopics, computeTurnState } from "./turn-control";

const interviewConfig = {
  name: "市営バスの路線見直し案について",
  description: "バスについて",
  purpose_type: "verify" as const,
  opinion_focus: "どの路線をどう変えるか",
  decided_matters: "2027年度に路線を見直すこと",
  publication_mode: "scheduled" as const,
  publication_timing: "2027年3月ごろ",
  publication_place: "chikat" as const,
};
const bill = {
  name: "市営バス路線見直し",
  bill_content: { title: "路線見直し案", summary: "統合と増便", content: "詳細" },
};
const topics = buildTurnTopics(
  getPurposeTemplateSteps("verify", "bill").map((s, i) => ({
    id: `q${i + 1}`,
    ...s,
  }))
);

describe("対話用プロンプト", () => {
  const turnState = computeTurnState({
    topics,
    metas: ["q1", "q2", "q2", "q2", "q3", "q3"].map((questionId) => ({
      questionId,
      budgetExempt: false,
      stage: "chat" as const,
    })),
  });

  it("設定・話題・いまの状況を埋め込む", () => {
    const prompt = buildChatSystemPrompt({
      bill,
      interviewConfig,
      topics,
      turnState,
      piiNotice: "pending",
    });
    expect(prompt).toContain("# 人物像");
    expect(prompt).toContain(
      "- 目的：市の案や施策への受け止めを聞く（まだ始まっていない案）"
    );
    expect(prompt).toContain(
      "- 決まっていること（賛否を聞かない）：2027年度に路線を見直すこと"
    );
    expect(prompt).toContain(
      "- 結果を知らせる時期と場所：2027年3月ごろ、CHIKAT の結果ページで（聞かれたら伝える）"
    );
    expect(prompt).toContain(
      "[Q3｜発話4回まで] この案で、その場面はどう変わりそうですか？／観点：案のどの部分が関わるか"
    );
    expect(prompt).toContain(
      "- いまの話題：Q3「この案で、その場面はどう変わりそうですか？」。この話題で使える発話：あと2回（今回を含む）"
    );
    expect(prompt).toContain(
      "- 次の話題：Q4「ここまでを踏まえて、この案を全体としてどう受け止めていますか？」（選択肢ボタンはシステムが出す）"
    );
    expect(prompt).toContain("- 残りの話題：Q4・Q5（あと2つ）");
    expect(prompt).toContain("- 伏せ字の案内：まだ");
    expect(prompt).toContain(
      "- question_id：いまの話題を続けるなら Q3、次の話題に移るなら Q4。"
    );
    expect(prompt).toContain("市民の声窓口で受け付けています");
    expect(prompt).not.toMatch(/\{\{[A-Za-z]+\}\}/);
    // 選択肢の文言は LLM に渡さない
    expect(prompt).not.toContain("どちらかといえば賛成");
  });

  it("予算を使い切ったら次の話題に移るよう指示する", () => {
    const exhausted = computeTurnState({
      topics,
      metas: ["q1", "q2", "q2", "q2"].map((questionId) => ({
        questionId,
        budgetExempt: false,
        stage: "chat" as const,
      })),
    });
    const prompt = buildChatSystemPrompt({
      bill,
      interviewConfig,
      topics,
      turnState: exhausted,
      piiNotice: null,
    });
    expect(prompt).toContain("- 今回は次の話題に移る（question_id は Q3）");
    expect(prompt).toContain("- question_id：今回は Q3");
    expect(prompt).not.toContain("伏せ字の案内：");
  });

  it("編集した対話方針でも変数を埋め込む", () => {
    const template = Object.keys(
      Object.fromEntries(
        INTERVIEW_PROMPT_CATALOG["interview-chat-system"].requiredVariables.map(
          (v) => [v, v]
        )
      )
    )
      .map((v) => `{{${v}}}`)
      .join("\n");
    const prompt = buildChatSystemPrompt(
      { bill, interviewConfig, topics, turnState, piiNotice: null, persona: "短く話す聞き手" },
      `独自の方針\n${template}`
    );
    expect(prompt).toContain("独自の方針");
    expect(prompt).toContain("短く話す聞き手");
    expect(prompt).toContain("[Q1｜発話1回]");
  });
});

describe("初回の発話", () => {
  it("全体像と最初の質問を埋め込む", () => {
    const prompt = buildInitialSystemPrompt({ topics });
    expect(prompt).toContain(
      "「全部で5つうかがいます。途中でやめても大丈夫です。」"
    );
    expect(prompt).toContain(
      "「この案は、あなたの暮らしや仕事に関わりがありますか？」"
    );
    expect(prompt).toContain("question_id は Q1");
  });
});

describe("要約用プロンプト", () => {
  it("要約の状況・結果のお知らせ・根拠の発言IDを埋め込む", () => {
    const prompt = buildSummarySystemPrompt({
      bill,
      interviewConfig,
      messages: [
        { id: "message-1", role: "user", content: "増便してほしい {{themeDescription}}" },
      ],
      summaryState: {
        phase: "reply",
        remainingTurns: 5,
        canResume: true,
        isLast: false,
      },
    });
    expect(prompt).toContain("- 場面：返事を受けたところ");
    expect(prompt).toContain("- インタビューに戻れるか：はい");
    expect(prompt).toContain("（2027年3月ごろ、CHIKAT の結果ページで）");
    expect(prompt).toContain(
      "user [msg_id:message-1]: 増便してほしい {{themeDescription}}"
    );
    expect(prompt).toContain("source_message_id");
    expect(prompt).toContain("topic_depth");
    expect(prompt).not.toContain("next_stage");
  });
});

describe("共通プロンプトの出力契約と取得失敗", () => {
  it.each(
    Object.keys(INTERVIEW_PROMPT_CATALOG) as (keyof typeof INTERVIEW_PROMPT_CATALOG)[]
  )("%s の必須変数の削除・重複を拒否する", (key) => {
    const definition = INTERVIEW_PROMPT_CATALOG[key];
    expect(validatePromptTemplate(key, definition.defaultContent)).toEqual([]);
    for (const variable of definition.requiredVariables) {
      const token = `{{${variable}}}`;
      expect(
        validatePromptTemplate(key, definition.defaultContent.replace(token, ""))
      ).not.toEqual([]);
      expect(
        validatePromptTemplate(key, definition.defaultContent + token)
      ).not.toEqual([]);
    }
  });

  it("人物像には変数を書けない", () => {
    expect(
      validatePromptTemplate("interview-persona", "あなたは{{name}}です")
    ).not.toEqual([]);
  });

  it.each(["missing", "invalid", "error"])(
    "%s の場合は初期文面へ退避する",
    async (mode) => {
      const provider = new PromptProvider({
        findPublishedPrompt: async () => {
          if (mode === "error") throw new Error("unavailable");
          return mode === "invalid" ? { content: "出力契約を欠いた文面" } : null;
        },
      });
      const template = await provider.getTemplate("interview-chat-system");
      expect(template.content).toContain("{{turnState}}");
      expect(JSON.parse(template.metadata).source).toBe("source-code");
    }
  );

  it("カタログに登録したインタビュープロンプトだけを識別する", () => {
    expect(isInterviewPromptKey("interview-persona")).toBe(true);
    expect(isInterviewPromptKey("interview-initial-system")).toBe(true);
    expect(isInterviewPromptKey("top-chat-system")).toBe(false);
    expect(isPromptKey("top-chat-system")).toBe(true);
    expect(isPromptKey("toString")).toBe(false);
    expect(isInterviewPromptKey("constructor")).toBe(false);
  });
});
