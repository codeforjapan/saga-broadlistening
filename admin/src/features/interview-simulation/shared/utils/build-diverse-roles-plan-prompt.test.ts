import { describe, expect, it } from "vitest";
import { buildDiverseRolesPlanPrompt } from "./build-diverse-roles-plan-prompt";

const baseBill = {
  name: "宇宙ビジネス促進施策",
  knowledge_source: "業界団体ヒアリング",
  bill_content: {
    title: "民間宇宙射場の整備促進",
    summary: "民間事業者の射場運用を支援する",
    content: "詳細内容",
  },
};

const baseConfig = {
  description: "射場の安全性と地域経済への影響について意見を募集します",
};

describe("buildDiverseRolesPlanPrompt", () => {
  it("施策情報・テーマ・スロット件数を含む", () => {
    const out = buildDiverseRolesPlanPrompt({
      bill: baseBill,
      interviewConfig: baseConfig,
      slotsToPlan: [{}, {}, {}],
    });
    expect(out).toContain("宇宙ビジネス促進施策");
    expect(out).toContain("民間宇宙射場の整備促進");
    expect(out).toContain("民間事業者の射場運用を支援する");
    expect(out).toContain(
      "射場の安全性と地域経済への影響について意見を募集します"
    );
    expect(out).toContain("業界団体ヒアリング");
    expect(out).toContain("3 人の当事者");
    expect(out).toContain("3 件");
  });

  it("スロット行が件数分・順序通り出る", () => {
    const out = buildDiverseRolesPlanPrompt({
      bill: baseBill,
      interviewConfig: baseConfig,
      slotsToPlan: [{}, {}],
    });
    expect(out).toContain("- スロット 1:");
    expect(out).toContain("- スロット 2:");
    expect(out).not.toContain("- スロット 3:");
  });

  it("stanceHint 指定スロットは日本語ラベル付きで明示される", () => {
    const out = buildDiverseRolesPlanPrompt({
      bill: baseBill,
      interviewConfig: baseConfig,
      slotsToPlan: [{ stanceHint: "for" }, {}, { stanceHint: "against" }],
    });
    expect(out).toContain("- スロット 1: スタンス指定=賛成");
    expect(out).toContain("- スロット 2: スタンス指定なし");
    expect(out).toContain("- スロット 3: スタンス指定=反対");
  });

  it("preassignedRoleHints があれば重複回避セクションが入る", () => {
    const out = buildDiverseRolesPlanPrompt({
      bill: baseBill,
      interviewConfig: baseConfig,
      slotsToPlan: [{}],
      preassignedRoleHints: ["射場運用の民間事業者", "近隣自治体の住民"],
    });
    expect(out).toContain("既にユーザーが手動指定した役割");
    expect(out).toContain("- 射場運用の民間事業者");
    expect(out).toContain("- 近隣自治体の住民");
  });

  it("preassignedRoleHints が無い場合は重複回避セクションを出さない", () => {
    const out = buildDiverseRolesPlanPrompt({
      bill: baseBill,
      interviewConfig: baseConfig,
      slotsToPlan: [{}, {}],
    });
    expect(out).not.toContain("既にユーザーが手動指定した役割");
  });

  it("テーマ未設定時は明示する", () => {
    const out = buildDiverseRolesPlanPrompt({
      bill: { ...baseBill, knowledge_source: null },
      interviewConfig: { description: null },
      slotsToPlan: [{}, {}],
    });
    expect(out).toContain("（テーマ未設定）");
    expect(out).toContain("（知識ソース未設定）");
  });

  it("出力フォーマットの順序保持指示が含まれる", () => {
    const out = buildDiverseRolesPlanPrompt({
      bill: baseBill,
      interviewConfig: baseConfig,
      slotsToPlan: [{}, {}, {}],
    });
    expect(out).toContain("同じ件数（3 件）");
    expect(out).toContain("同じ順序");
  });

  it("「一般市民」を避ける指示が含まれる", () => {
    const out = buildDiverseRolesPlanPrompt({
      bill: baseBill,
      interviewConfig: baseConfig,
      slotsToPlan: [{}, {}],
    });
    expect(out).toContain("一般市民");
    expect(out).toContain("禁止");
  });
});

describe("buildDiverseRolesPlanPrompt（施策に紐づかない抽象テーマ型）", () => {
  const themeConfig = {
    name: "佐賀市のみらい",
    description: "暮らしのなかで感じている変化を伺います",
  };

  it("施策の欄を作らず、テーマを対象として説明する", () => {
    const out = buildDiverseRolesPlanPrompt({
      bill: null,
      interviewConfig: themeConfig,
      slotsToPlan: [{}, {}],
    });

    expect(out).toContain("## インタビューの対象");
    expect(out).toContain("佐賀市のみらい");
    // 空欄の施策情報を並べるとAIが存在しない施策を語り出すため、欄ごと出さない
    expect(out).not.toContain("- 施策名:");
    expect(out).not.toContain("<bill_detail>");
  });

  it("当事者像の指示も「テーマ」を基準にする", () => {
    const out = buildDiverseRolesPlanPrompt({
      bill: null,
      interviewConfig: themeConfig,
      slotsToPlan: [{}, {}],
    });

    expect(out).toContain("以下のテーマについて");
    expect(out).toContain("このテーマに関わりが深そうな当事者");
  });

  it("施策があるときは従来どおり「施策」を基準にする", () => {
    const out = buildDiverseRolesPlanPrompt({
      bill: baseBill,
      interviewConfig: baseConfig,
      slotsToPlan: [{}, {}],
    });

    expect(out).toContain("以下の施策について");
    expect(out).toContain("この施策に関わりが深そうな当事者");
  });
});
