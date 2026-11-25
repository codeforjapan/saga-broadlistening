import { describe, expect, it } from "vitest";
import { isEndInterviewButtonVisible } from "./end-interview-button-visibility";

describe("isEndInterviewButtonVisible", () => {
  const base = {
    stage: "chat" as const,
    hasTimer: true,
    isTimeUp: false,
    timeUpDismissed: false,
  };

  it("対話中、目安時間内は出さない", () => {
    expect(isEndInterviewButtonVisible(base)).toBe(false);
  });

  it("対話中、目安時間を超過してもプロンプトを閉じるまでは出さない", () => {
    expect(isEndInterviewButtonVisible({ ...base, isTimeUp: true })).toBe(
      false
    );
  });

  it("対話中、目安時間を超過してプロンプトを閉じた後は出す", () => {
    expect(
      isEndInterviewButtonVisible({
        ...base,
        isTimeUp: true,
        timeUpDismissed: true,
      })
    ).toBe(true);
  });

  it("対話中、目安時間がないときは常に出す", () => {
    expect(isEndInterviewButtonVisible({ ...base, hasTimer: false })).toBe(
      true
    );
  });

  it.each([
    "summary",
    "summary_complete",
  ] as const)("%s では出さない（まとめはモーダルで確認して提出する）", (stage) => {
    expect(
      isEndInterviewButtonVisible({
        stage,
        hasTimer: false,
        isTimeUp: true,
        timeUpDismissed: true,
      })
    ).toBe(false);
  });
});
