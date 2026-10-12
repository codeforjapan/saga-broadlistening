import { describe, expect, it } from "vitest";
import type { InterviewQuestion } from "../types";
import { toQuestionInput } from "./to-question-input";

const saved: InterviewQuestion = {
  id: "q-1",
  interview_config_id: "config-1",
  question: "この案に関わる場面はどんなときですか？",
  hint: null,
  quick_replies: null,
  question_order: 2,
  step_key: "scene",
  step_kind: "episode",
  turn_budget: 3,
  required: false,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

describe("toQuestionInput", () => {
  it("テンプレートの値を引き継ぎ、空の観点・選択肢は未指定にする", () => {
    expect(toQuestionInput(saved)).toEqual({
      question: "この案に関わる場面はどんなときですか？",
      hint: undefined,
      quick_replies: undefined,
      step_key: "scene",
      step_kind: "episode",
      turn_budget: 3,
      required: false,
    });
  });
});
