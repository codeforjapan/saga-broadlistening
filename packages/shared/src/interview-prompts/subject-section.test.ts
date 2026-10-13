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

describe("buildInterviewSubject（意見募集に複数の施策が紐づくとき）", () => {
  const related = [
    {
      name: "子ども医療費の助成拡大",
      title: "高校生まで医療費を助成",
      summary: "助成対象を18歳まで広げます",
      content: "通院・入院ともに自己負担をなくします。",
    },
    {
      name: "放課後児童クラブの拡充",
      title: "学童の定員を増やす",
      summary: "待機児童を解消します",
      content: "全校区で定員を1.5倍にします。",
    },
  ];

  it("主たる施策に続けて、他の施策の内容もすべて載せる", () => {
    const subject = buildInterviewSubject(
      { ...bill, related_policies: related },
      { name: "バス" }
    );

    expect(subject.knowledgeSection).toContain("<bill_detail>\n詳細");
    expect(subject.knowledgeSection).toContain(
      "# この意見募集に紐づくその他の施策"
    );
    expect(subject.knowledgeSection).toContain(
      "## 関連施策1: 子ども医療費の助成拡大"
    );
    expect(subject.knowledgeSection).toContain(
      "通院・入院ともに自己負担をなくします。"
    );
    expect(subject.knowledgeSection).toContain(
      "## 関連施策2: 放課後児童クラブの拡充"
    );
    expect(subject.knowledgeSection).toContain(
      "全校区で定員を1.5倍にします。"
    );
  });

  it("要約プロンプトには他の施策の名前を並べる", () => {
    const subject = buildInterviewSubject(
      { ...bill, related_policies: related },
      { name: "バス" }
    );

    expect(subject.summarySection).toContain(
      "- 関連施策: 子ども医療費の助成拡大、放課後児童クラブの拡充"
    );
  });

  it("他の施策がなければ関連施策の欄を作らない", () => {
    const subject = buildInterviewSubject(
      { ...bill, related_policies: [] },
      { name: "バス" }
    );

    expect(subject.knowledgeSection).not.toContain("関連施策");
    expect(subject.summarySection).not.toContain("関連施策");
  });
});
