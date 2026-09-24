import { describe, expect, it } from "vitest";
import { buildLoopModeSystemPrompt } from "./loop-mode";
import { buildSummarySystemPrompt } from "./summary";

const context = {
  bill: null,
  interviewConfig: { name: "地域交通", description: "バスについて" },
};

describe("編集した共通プロンプトの適用", () => {
  it("対話方針を置き換えても質問ID・進捗・出力指示を埋め込む", () => {
    const content = buildLoopModeSystemPrompt({
      ...context,
      questions: [{ id: "question-1", question: "利用頻度は？", follow_up_guide: "理由を聞く", quick_replies: ["毎日"] }],
      currentStage: "chat",
      askedQuestionIds: new Set(),
      remainingMinutes: 2,
    }, "短く話してください。\n{{focusInstruction}}{{clarificationGuidance}}{{knowledgeSection}}{{themeDescription}}\n{{questionsText}}\n{{replyExamples}}{{perspectiveTechniques}}{{stopCriteria}}\n{{outputInstructions}}");
    expect(content).toContain("短く話してください。");
    expect(content).not.toContain("あなたの責任");
    expect(content).toContain("[ID: question-1] 利用頻度は？");
    expect(content).toContain("フォローアップ指針: 理由を聞く");
    expect(content).toContain("クイックリプライ: 毎日");
    expect(content).toContain("タイムマネジメント");
    expect(content).toContain("next_stage");
    expect(content).not.toContain("{{outputInstructions}}");
  });

  it("要約方針を変えてもレポート形式・根拠の発言IDを保持する", () => {
    const content = buildSummarySystemPrompt({
      ...context,
      messages: [{ id: "message-1", role: "user", content: "増便してほしい {{themeDescription}}" }],
    }, "わかりやすく要約してください。\n{{summarySection}}\n{{themeDescription}}\n{{conversationLog}}\n{{reportInstructions}}");
    expect(content).toContain("わかりやすく要約してください。");
    expect(content).toContain("user [msg_id:message-1]: 増便してほしい {{themeDescription}}");
    expect(content).toContain("source_message_id");
    expect(content).toContain("summary_complete");
    expect(content).not.toContain("{{reportInstructions}}");
  });
});

import { INTERVIEW_PROMPT_CATALOG, isInterviewPromptKey, isPromptKey } from "../prompts/catalog";
import { PromptProvider } from "../prompts/provider";
import { validatePromptTemplate } from "../prompts/template";

describe("共通プロンプトの出力契約と取得失敗", () => {
  it.each(["interview-chat-system", "interview-summary-system"] as const)("%s の必須変数の削除・重複を拒否する", (key) => {
    const definition = INTERVIEW_PROMPT_CATALOG[key];
    expect(validatePromptTemplate(key, definition.defaultContent)).toEqual([]);
    for (const variable of definition.requiredVariables) {
      const token = `{{${variable}}}`;
      expect(validatePromptTemplate(key, definition.defaultContent.replace(token, ""))).not.toEqual([]);
      expect(validatePromptTemplate(key, definition.defaultContent + token)).not.toEqual([]);
    }
  });

  it.each(["missing", "invalid", "error"])("%s の場合は初期文面へ退避する", async (mode) => {
    const provider = new PromptProvider({ findPublishedPrompt: async () => {
      if (mode === "error") throw new Error("unavailable");
      return mode === "invalid" ? { content: "出力契約を欠いた文面" } : null;
    } });
    const template = await provider.getTemplate("interview-chat-system");
    const prompt = buildLoopModeSystemPrompt({ ...context, questions: [], currentStage: "chat", askedQuestionIds: new Set() }, template.content);
    expect(prompt).toContain("next_stage");
    expect(prompt).toContain("バスについて");
    expect(JSON.parse(template.metadata).source).toBe("source-code");
  });

  it("カタログに登録したインタビュープロンプトだけを識別する", () => {
    expect(isInterviewPromptKey("interview-summary-system")).toBe(true);
    expect(isInterviewPromptKey("top-chat-system")).toBe(false);
    expect(isPromptKey("top-chat-system")).toBe(true);
    expect(isPromptKey("toString")).toBe(false);
    expect(isInterviewPromptKey("constructor")).toBe(false);
  });
});
