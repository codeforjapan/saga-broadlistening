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

  it("要約中は時間に関係なく常に出す", () => {
    expect(isEndInterviewButtonVisible({ ...base, stage: "summary" })).toBe(
      true
    );
  });

  it("要約完了後は出さない", () => {
    expect(
      isEndInterviewButtonVisible({
        stage: "summary_complete",
        hasTimer: false,
        isTimeUp: true,
        timeUpDismissed: true,
      })
    ).toBe(false);
  });
});
