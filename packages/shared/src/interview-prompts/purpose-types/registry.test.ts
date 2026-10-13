import { describe, expect, it } from "vitest";
import {
  EVALUATE_TEMPLATE_TOPICS_MAX,
  EVALUATION_QUICK_REPLIES_MAX,
  QUICK_REPLIES_MAX,
  TEMPLATE_TOPICS_MAX,
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
const UNDECIDED_REPLY = "まだ決められない";

describe("目的別テンプレート", () => {
  it.each(
    PURPOSE_TYPES.flatMap((type) => SUBJECTS.map((subject) => [type, subject]))
  )("%s×%s は話題の数と選択肢の数が上限に収まる", (type, subject) => {
    const steps = getPurposeTemplateSteps(
      type as (typeof PURPOSE_TYPES)[number],
      subject as (typeof SUBJECTS)[number]
    );
    expect(steps.length).toBeLessThanOrEqual(
      type === "evaluate" ? EVALUATE_TEMPLATE_TOPICS_MAX : TEMPLATE_TOPICS_MAX
    );
    expect(steps.at(-1)?.quick_replies).toEqual(["特にない"]);
    for (const step of steps) {
      // 受け止めの質問だけ「まだ決められない」を含めて5つまで
      expect(step.quick_replies.length).toBeLessThanOrEqual(
        step.quick_replies.includes(UNDECIDED_REPLY)
          ? EVALUATION_QUICK_REPLIES_MAX
          : QUICK_REPLIES_MAX
      );
    }
  });

  it("受け止めの質問は「まだ決められない」を選択肢の最後に置く", () => {
    const evaluationSteps = Object.values(PURPOSE_TYPE_DEFINITIONS).flatMap(
      (definition) =>
        SUBJECTS.flatMap((subject) =>
          definition[subject].steps.filter((step) =>
            step.quick_replies.includes(UNDECIDED_REPLY)
          )
        )
    );
    // 確かめる×施策、評価する×施策・テーマ
    expect(evaluationSteps).toHaveLength(3);
    for (const step of evaluationSteps) {
      expect(step.quick_replies.at(-1)).toBe(UNDECIDED_REPLY);
    }
  });

  it("確かめる×テーマでは受け止めを聞かない", () => {
    expect(
      getPurposeTemplateSteps("verify", "theme").some((s) =>
        s.quick_replies.includes(UNDECIDED_REPLY)
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
