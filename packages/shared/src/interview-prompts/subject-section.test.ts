import { describe, expect, it } from "vitest";
import {
  buildInterviewDesign,
  buildInterviewSubject,
  buildQuestionsText,
  resolveSubjectTitle,
} from "./subject-section";
import { buildTurnTopics } from "./turn-control";

const bill = {
  name: "市営バス路線見直し",
  knowledge_source: "交通計画",
  bill_content: {
    title: "路線見直し案",
    summary: "統合と増便",
    content: "詳細",
  },
};

describe("buildInterviewSubject", () => {
  it("施策があれば資料を、なければテーマを対象にする", () => {
    const withBill = buildInterviewSubject(bill, { name: "バス" });
    expect(withBill.kind).toBe("bill");
    expect(withBill.knowledgeSection).toContain("<bill_detail>\n詳細");
    expect(withBill.clarificationGuidance).toContain("施策の資料");

    const theme = buildInterviewSubject(null, { name: "佐賀市のみらい" });
    expect(theme.kind).toBe("theme");
    expect(theme.knowledgeSection).toContain("テーマ「佐賀市のみらい」");
    expect(theme.knowledgeSection).not.toContain("施策名");
    expect(theme.clarificationGuidance).toContain("テーマの説明");
  });
});

describe("buildInterviewSubject の案内先", () => {
  it("施策に担当課があれば、施策紹介ページと担当課を案内する", () => {
    expect(
      buildInterviewSubject(
        { ...bill, department: "交通政策部 交通政策課" },
        { name: "バス" }
      ).inquiryContact
    ).toBe("施策紹介ページや交通政策部 交通政策課");
  });

  it("担当課がなければ施策紹介ページだけを案内する", () => {
    expect(buildInterviewSubject(bill, { name: "バス" }).inquiryContact).toBe(
      "施策紹介ページ"
    );
    expect(
      buildInterviewSubject({ ...bill, department: "  " }, { name: "バス" })
        .inquiryContact
    ).toBe("施策紹介ページ");
  });

  it("テーマ型は市の公式ホームページを案内する", () => {
    expect(buildInterviewSubject(null, { name: "まち" }).inquiryContact).toBe(
      "市の公式ホームページ"
    );
  });
});

describe("buildQuestionsText", () => {
  it("[Qn] 質問／観点 の形で並べる", () => {
    const topics = buildTurnTopics([
      { id: "a", question: "関わりは？" },
      { id: "b", question: "場面は？", follow_up_guide: "最近の1回" },
    ]);
    expect(buildQuestionsText(topics)).toBe(
      "[Q1] 関わりは？\n[Q2] 場面は？／観点：最近の1回"
    );
  });

  it("話題が無ければその旨を書く", () => {
    expect(buildQuestionsText([])).toBe("（話題は設定されていません）");
  });
});

describe("buildInterviewDesign", () => {
  it("決まっていることは施策型だけに書く", () => {
    const config = {
      name: "テーマ",
      purpose_type: "envision" as const,
      decided_matters: "見直すこと",
    };
    expect(
      buildInterviewDesign({ bill, interviewConfig: config, topics: [] })
        .purposeSection
    ).toContain("決まっていること（賛否を聞かない）：見直すこと");
    expect(
      buildInterviewDesign({ bill: null, interviewConfig: config, topics: [] })
        .purposeSection
    ).toContain("決まっていること（賛否を聞かない）：なし");
  });

  it("目的が未設定なら汎用の焦点を使う", () => {
    const design = buildInterviewDesign({
      bill: null,
      interviewConfig: { name: "テーマ" },
      topics: [],
    });
    expect(design.purposeSection).toContain("目的：市民の経験と考えを聞く");
    expect(design.focusInstruction).toContain("暮らしの場面");
    expect(design.replyExamples).toBe("");
  });
});

describe("resolveSubjectTitle", () => {
  it("施策の見出し → 施策名 → テーマ名の順に使う", () => {
    expect(resolveSubjectTitle(bill, { name: "テーマ" })).toBe("路線見直し案");
    expect(resolveSubjectTitle(null, { name: "テーマ" })).toBe("テーマ");
    expect(resolveSubjectTitle(null, null)).toBe("このテーマ");
  });
});
