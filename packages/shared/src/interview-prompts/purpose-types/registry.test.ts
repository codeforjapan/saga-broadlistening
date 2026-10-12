import { describe, expect, it } from "vitest";
import {
  EVALUATE_REQUIRED_TOPICS_MAX,
  EVALUATION_QUICK_REPLIES_MAX,
  QUICK_REPLIES_MAX,
  REQUIRED_TOPICS_MAX,
  SUMMARY_START_TURN,
} from "../constants";
import {
  getPurposeTemplateSteps,
  PURPOSE_TYPE_DEFINITIONS,
  purposeDisplayName,
  resolvePurposeType,
  toPurposeSelection,
} from "./registry";
import { PURPOSE_TYPES } from "./types";

const SUBJECTS = ["bill", "theme"] as const;

describe("目的別テンプレート", () => {
  it.each(
    PURPOSE_TYPES.flatMap((type) => SUBJECTS.map((subject) => [type, subject]))
  )("%s×%s は予算の合計が要約開始までに収まる", (type, subject) => {
    const steps = getPurposeTemplateSteps(
      type as (typeof PURPOSE_TYPES)[number],
      subject as (typeof SUBJECTS)[number]
    );
    const total = steps.reduce((sum, s) => sum + s.turn_budget, 0);
    expect(total).toBeLessThanOrEqual(SUMMARY_START_TURN);

    const required = steps.filter((s) => s.required);
    expect(required.length).toBeLessThanOrEqual(
      type === "evaluate" ? EVALUATE_REQUIRED_TOPICS_MAX : REQUIRED_TOPICS_MAX
    );
    expect(steps[0].step_kind).toBe("fact");
    expect(steps.at(-1)?.step_kind).toBe("add_more");
    for (const step of steps) {
      expect(step.turn_budget).toBeGreaterThanOrEqual(1);
      expect(step.turn_budget).toBeLessThanOrEqual(4);
      expect(step.quick_replies.length).toBeLessThanOrEqual(
        step.step_kind === "evaluation"
          ? EVALUATION_QUICK_REPLIES_MAX
          : QUICK_REPLIES_MAX
      );
    }
  });

  it("受け止めの選択肢には「まだ決められない」を含める", () => {
    for (const definition of Object.values(PURPOSE_TYPE_DEFINITIONS)) {
      for (const subject of SUBJECTS) {
        for (const step of definition[subject].steps) {
          if (step.step_kind === "evaluation") {
            expect(step.quick_replies).toContain("まだ決められない");
          }
        }
      }
    }
  });

  it("確かめる×テーマでは受け止めを聞かない", () => {
    expect(
      getPurposeTemplateSteps("verify", "theme").some(
        (s) => s.step_kind === "evaluation"
      )
    ).toBe(false);
  });
});

describe("目的の選択と内部の型", () => {
  it("目的とチェックから5型を決め、元に戻せる", () => {
    expect(resolvePurposeType("situation", false)).toBe("understand");
    expect(resolvePurposeType("situation", true)).toBe("discover");
    expect(resolvePurposeType("reaction", false)).toBe("verify");
    expect(resolvePurposeType("reaction", true)).toBe("evaluate");
    expect(resolvePurposeType("future", true)).toBe("envision");
    for (const type of PURPOSE_TYPES) {
      const { optionKey, checked } = toPurposeSelection(type);
      expect(resolvePurposeType(optionKey, checked)).toBe(type);
    }
  });

  it("プロンプトに書く目的の表示名", () => {
    expect(purposeDisplayName("verify", "bill")).toBe(
      "市の案や施策への受け止めを聞く（まだ始まっていない案）"
    );
    expect(purposeDisplayName("discover", "theme")).toBe(
      "今の様子や困りごとを知る（困りごとを中心に聞く）"
    );
    expect(purposeDisplayName("envision", "theme")).toBe("これからを描く");
    expect(purposeDisplayName(null, "theme")).toBe("市民の経験と考えを聞く");
  });
});
