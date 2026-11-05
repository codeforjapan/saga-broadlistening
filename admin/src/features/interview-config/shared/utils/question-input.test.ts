import { describe, expect, it } from "vitest";
import { interviewQuestionSchema } from "../types";
import { toProposedQuestions, toQuestionInput } from "./question-input";

describe("toProposedQuestions", () => {
  it("null の観点・クイックリプライを未設定に揃え、保存時の検証を通る形にする", () => {
    const result = toProposedQuestions([
      {
        question: "最近どこへ移動しましたか",
        follow_up_guide: null,
        quick_replies: null,
      },
    ]);

    expect(result).toEqual([
      {
        question: "最近どこへ移動しましたか",
        follow_up_guide: undefined,
        quick_replies: undefined,
      },
    ]);
    expect(interviewQuestionSchema.safeParse(result[0]).success).toBe(true);
  });

  it("設定された観点・クイックリプライはそのまま残す", () => {
    expect(
      toProposedQuestions([
        {
          question: "使っている交通手段は？",
          follow_up_guide: "乗り換えの有無",
          quick_replies: ["バス", "自転車"],
        },
      ])
    ).toEqual([
      {
        question: "使っている交通手段は？",
        follow_up_guide: "乗り換えの有無",
        quick_replies: ["バス", "自転車"],
      },
    ]);
  });

  it("質問文が空・空白だけの要素は落とす", () => {
    expect(
      toProposedQuestions([
        { question: "", follow_up_guide: "観点だけ" },
        { question: "  " },
      ])
    ).toEqual([]);
  });
});

describe("toQuestionInput", () => {
  it("DB の行の null を未設定に揃える", () => {
    expect(
      toQuestionInput({
        question: "どこに住んでいますか",
        follow_up_guide: null,
        quick_replies: null,
      })
    ).toEqual({
      question: "どこに住んでいますか",
      follow_up_guide: undefined,
      quick_replies: undefined,
    });
  });
});
