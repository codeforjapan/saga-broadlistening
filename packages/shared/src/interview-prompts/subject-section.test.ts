import { describe, expect, it } from "vitest";
import {
  buildInterviewDesign,
  buildInterviewSubject,
  buildPublicationText,
  buildQuestionsText,
  resolveSubjectTitle,
} from "./subject-section";
import { buildTurnTopics } from "./turn-control";

const bill = {
  name: "市営バス路線見直し",
  knowledge_source: "交通計画",
  bill_content: { title: "路線見直し案", summary: "統合と増便", content: "詳細" },
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

describe("buildPublicationText", () => {
  it("時期と場所が決まっていれば両方を書く", () => {
    expect(
      buildPublicationText({
        publication_mode: "scheduled",
        publication_timing: "2027年3月ごろ",
        publication_place: "koho",
      })
    ).toBe("2027年3月ごろ、広報紙で");
  });

  it("まとまり次第、または時期・場所が欠けていれば CHIKAT の結果ページ", () => {
    expect(buildPublicationText({ publication_mode: "when_ready" })).toBe(
      "まとまり次第、CHIKAT の結果ページで"
    );
    expect(
      buildPublicationText({
        publication_mode: "scheduled",
        publication_timing: " ",
        publication_place: "city_web",
      })
    ).toBe("まとまり次第、CHIKAT の結果ページで");
  });
});

describe("buildQuestionsText", () => {
  it("[Qn｜名前｜種類｜予算｜必須] 質問／観点 の形で並べる", () => {
    const topics = buildTurnTopics(
      [
        { id: "a", question: "関わりは？", step_kind: "fact", turn_budget: 1 },
        {
          id: "b",
          question: "場面は？",
          hint: "最近の1回",
          required: false,
        },
      ],
      { purposeType: null, subject: "theme" }
    );
    expect(buildQuestionsText(topics)).toBe(
      "[Q1｜質問1｜事実｜発話1回｜必須] 関わりは？\n[Q2｜質問2｜場面｜発話3回まで｜任意] 場面は？／観点：最近の1回"
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
