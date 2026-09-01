import { describe, expect, it } from "vitest";
import { buildInterviewSubject } from "./subject-section";

const bill = {
  name: "学校給食の無償化",
  knowledge_source: "財源は一般財源から充当する想定",
  bill_content: {
    title: "給食費の負担をなくす",
    summary: "市立小中学校の給食費を無償にします",
    content: "対象は市立の小中学校に通う児童生徒です。",
  },
};

const config = {
  name: "佐賀市のみらい",
  description: "暮らしのなかで感じている変化を伺います",
};

describe("buildInterviewSubject", () => {
  describe("施策があるとき", () => {
    it("施策の内容と知識ソースをプロンプトに載せる", () => {
      const subject = buildInterviewSubject(bill, config);

      expect(subject.knowledgeSection).toContain("## 施策に関する知識");
      expect(subject.knowledgeSection).toContain("学校給食の無償化");
      expect(subject.knowledgeSection).toContain("給食費の負担をなくす");
      expect(subject.knowledgeSection).toContain(
        "対象は市立の小中学校に通う児童生徒です。"
      );
      expect(subject.knowledgeSection).toContain(
        "財源は一般財源から充当する想定"
      );
    });

    it("知識ソースが未設定なら未設定と明示する", () => {
      const subject = buildInterviewSubject(
        { ...bill, knowledge_source: null },
        config
      );

      expect(subject.knowledgeSection).toContain("（知識ソース未設定）");
    });

    it("施策に集中させ、施策の誤認を補足するガイダンスを渡す", () => {
      const subject = buildInterviewSubject(bill, config);

      expect(subject.focusInstruction).toBe(
        "- 施策に関する質問のみに集中してください"
      );
      expect(subject.clarificationGuidance).toContain("施策内容の誤認検知と補足");
    });

    it("要約プロンプトには施策情報を載せる", () => {
      const subject = buildInterviewSubject(bill, config);

      expect(subject.summarySection).toContain("## 施策情報");
      expect(subject.summarySection).toContain("学校給食の無償化");
    });
  });

  describe("施策がないとき（抽象テーマ型）", () => {
    it("対象をテーマに切り替え、施策の欄を作らない", () => {
      const subject = buildInterviewSubject(null, config);

      expect(subject.knowledgeSection).toContain("## インタビューの対象");
      expect(subject.knowledgeSection).toContain("佐賀市のみらい");
      expect(subject.knowledgeSection).not.toContain("施策名:");
      expect(subject.knowledgeSection).not.toContain("<bill_detail>");
    });

    it("存在しない施策を推測して語らないよう釘を刺す", () => {
      const subject = buildInterviewSubject(null, config);

      expect(subject.knowledgeSection).toContain(
        "存在しない制度や施策の内容を推測して語らないでください"
      );
    });

    it("テーマに集中させ、施策の誤認ガイダンスは渡さない", () => {
      const subject = buildInterviewSubject(null, config);

      expect(subject.focusInstruction).toBe(
        "- テーマに関する質問のみに集中してください"
      );
      expect(subject.clarificationGuidance).toBe("");
    });

    it("要約プロンプトにはテーマ名と説明を載せる", () => {
      const subject = buildInterviewSubject(null, config);

      expect(subject.summarySection).toContain("## インタビューの対象");
      expect(subject.summarySection).toContain("佐賀市のみらい");
      expect(subject.summarySection).toContain(
        "暮らしのなかで感じている変化を伺います"
      );
    });

    it("テーマ名が空でも未設定と明示して組み立てる", () => {
      const subject = buildInterviewSubject(null, { name: "  ", description: null });

      expect(subject.knowledgeSection).toContain("（テーマ名未設定）");
      expect(subject.summarySection).toContain("（テーマ未設定）");
    });
  });
});
