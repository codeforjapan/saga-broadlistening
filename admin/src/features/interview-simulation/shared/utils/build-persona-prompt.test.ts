import { describe, expect, it } from "vitest";
import { buildPersonaPrompt } from "./build-persona-prompt";

const baseBill = {
  name: "宇宙関連産業振興施策",
  knowledge_source: "宇宙関連産業振興施策の概要",
  bill_content: {
    title: "人工衛星等の打上げ及び管理の安全確保に関する施策",
    summary: "ロケットの打上げルールを見直す施策",
    content: "1. 基本方針…",
  },
};

const baseConfig = {
  description: "安全確保と産業競争力の両立について意見を募集します",
};

describe("buildPersonaPrompt", () => {
  it("施策情報・テーマ・知識ソースがプロンプトに含まれる", () => {
    const result = buildPersonaPrompt({
      bill: baseBill,
      interviewConfig: baseConfig,
    });
    expect(result).toContain("宇宙関連産業振興施策");
    expect(result).toContain(
      "人工衛星等の打上げ及び管理の安全確保に関する施策"
    );
    expect(result).toContain("1. 基本方針…");
    expect(result).toContain(
      "安全確保と産業競争力の両立について意見を募集します"
    );
    expect(result).toContain("宇宙関連産業振興施策の概要");
  });

  it("stanceHint 指定時はスタンスを必須として明記する", () => {
    const result = buildPersonaPrompt({
      bill: baseBill,
      interviewConfig: baseConfig,
      stanceHint: "against",
    });
    expect(result).toContain("反対");
    expect(result).toContain('"against"');
    expect(result).toContain("必須");
  });

  it("stanceHint 未指定時は LLM に決めさせる文言になる", () => {
    const result = buildPersonaPrompt({
      bill: baseBill,
      interviewConfig: baseConfig,
    });
    expect(result).toContain("自然に導かれる立場");
    expect(result).not.toContain("（必須）");
  });

  it("roleHint 指定時は役割ヒントをプロンプトに含める", () => {
    const result = buildPersonaPrompt({
      bill: baseBill,
      interviewConfig: baseConfig,
      roleHint: "射場運用の民間事業者",
    });
    expect(result).toContain("射場運用の民間事業者");
  });

  it("テーマ未設定でも壊れない", () => {
    const result = buildPersonaPrompt({
      bill: { ...baseBill, knowledge_source: "" },
      interviewConfig: { description: null },
    });
    expect(result).toContain("テーマ未設定");
    expect(result).toContain("知識ソース未設定");
  });

  it("roleHint 未指定時は抽象キャラを避ける注意書きが含まれる", () => {
    const result = buildPersonaPrompt({
      bill: baseBill,
      interviewConfig: baseConfig,
    });
    expect(result).toContain("抽象");
    expect(result).toContain("具体的");
  });

  it("roleHint 指定時はヒントを最優先させる（「一般市民」でも置き換え禁止）", () => {
    const result = buildPersonaPrompt({
      bill: baseBill,
      interviewConfig: baseConfig,
      roleHint: "一般市民",
    });
    expect(result).toContain("一般市民");
    expect(result).toContain("最優先");
    // 勝手に別の職種に置き換えないよう明記されていること
    expect(result).toMatch(/置き換え|勝手に/);
    // roleHint 指定時は「抽象キャラ禁止」の旧強い禁則が出ないこと
    expect(result).not.toMatch(/抽象キャラは禁止/);
  });
});

describe("buildPersonaPrompt（施策に紐づかない抽象テーマ型）", () => {
  const themeConfig = {
    name: "佐賀市のみらい",
    description: "暮らしのなかで感じている変化を伺います",
  };

  it("施策の欄を作らず、テーマを対象として説明する", () => {
    const result = buildPersonaPrompt({
      bill: null,
      interviewConfig: themeConfig,
    });

    expect(result).toContain("## インタビューの対象");
    expect(result).toContain("佐賀市のみらい");
    // 空欄の施策情報を並べるとAIが存在しない施策を語り出すため、欄ごと出さない
    expect(result).not.toContain("- 施策名:");
    expect(result).not.toContain("<bill_detail>");
  });

  it("当事者像の指示も「テーマ」を基準にする", () => {
    const result = buildPersonaPrompt({
      bill: null,
      interviewConfig: themeConfig,
    });

    expect(result).toContain("以下のテーマについて");
    expect(result).toContain("このテーマに関わりが深そうな当事者");
  });

  it("施策があるときは従来どおり「施策」を基準にする", () => {
    const result = buildPersonaPrompt({
      bill: baseBill,
      interviewConfig: baseConfig,
    });

    expect(result).toContain("以下の施策について");
    expect(result).toContain("この施策に関わりが深そうな当事者");
  });
});
