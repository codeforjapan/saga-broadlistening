import { describe, expect, it } from "vitest";
import { calcInterviewProgress } from "./calc-interview-progress";

describe("calcInterviewProgress", () => {
  describe("totalQuestionsが未設定・0の場合", () => {
    it("undefinedならnullを返す", () => {
      expect(calcInterviewProgress(undefined, "chat", [])).toBeNull();
    });

    it("0ならnullを返す", () => {
      expect(calcInterviewProgress(0, "chat", [])).toBeNull();
    });
  });

  describe("summary_completeステージ", () => {
    it("100%で「まとめを確認」", () => {
      expect(calcInterviewProgress(5, "summary_complete", [])).toEqual({
        percentage: 100,
        stageLabel: "まとめを確認",
      });
    });
  });

  describe("summaryステージ", () => {
    it("90%で「まとめを確認」", () => {
      expect(calcInterviewProgress(5, "summary", [])).toEqual({
        percentage: 90,
        stageLabel: "まとめを確認",
      });
    });
  });

  describe("chatステージ", () => {
    it("メッセージなしなら0%で「はじめに」", () => {
      expect(calcInterviewProgress(5, "chat", [])).toEqual({
        percentage: 0,
        stageLabel: "はじめに",
      });
    });

    it("最初の質問のあいだは、何度やりとりしても「はじめに」", () => {
      const messages = [
        { role: "assistant" as const, questionId: "q1" },
        { role: "user" as const },
        { role: "assistant" as const, questionId: "q1" },
        { role: "user" as const },
      ];
      expect(calcInterviewProgress(5, "chat", messages)).toEqual({
        percentage: 0,
        stageLabel: "はじめに",
      });
    });

    it("2問目に入ったら「もう少し聞かせて」", () => {
      const messages = [
        { role: "assistant" as const, questionId: "q1" },
        { role: "user" as const },
        { role: "assistant" as const, questionId: "q2" },
      ];
      // completedCount = 1 → 1/5 × 80 = 16
      expect(calcInterviewProgress(5, "chat", messages)).toEqual({
        percentage: 16,
        stageLabel: "もう少し聞かせて",
      });
    });

    it("questionIdのない発話は質問として数えない", () => {
      const messages = [
        { role: "assistant" as const, questionId: "q1" },
        { role: "user" as const },
        { role: "assistant" as const },
        { role: "assistant" as const, questionId: null },
      ];
      expect(calcInterviewProgress(5, "chat", messages)?.stageLabel).toBe(
        "はじめに"
      );
    });

    it("全問完了で80%", () => {
      const messages = [
        { role: "assistant" as const, questionId: "q1" },
        { role: "user" as const },
        { role: "assistant" as const, questionId: "q2" },
        { role: "user" as const },
        { role: "assistant" as const, questionId: "q3" },
        { role: "user" as const },
      ];
      // askedIds = {q1, q2, q3}, size=3, completedCount=2
      // → 2/2 × 80 = 80 (totalQuestions=2 だと全完了)
      expect(calcInterviewProgress(2, "chat", messages)?.percentage).toBe(80);
    });
  });
});
