import { describe, expect, it } from "vitest";
import { isEndInterviewAvailable } from "./end-interview-availability";

describe("isEndInterviewAvailable", () => {
  const now = new Date("2026-02-23T10:00:00Z");

  it("目安時間がないときは最初から出す", () => {
    expect(isEndInterviewAvailable(null, "2026-02-23T10:00:00Z", now)).toBe(
      true
    );
    expect(
      isEndInterviewAvailable(undefined, "2026-02-23T10:00:00Z", now)
    ).toBe(true);
    expect(isEndInterviewAvailable(0, "2026-02-23T10:00:00Z", now)).toBe(true);
  });

  it("開始時刻がないときは最初から出す", () => {
    expect(isEndInterviewAvailable(15, undefined, now)).toBe(true);
  });

  it("目安時間の2/3が過ぎる前は出さない（15分のうち9分59秒経過）", () => {
    expect(isEndInterviewAvailable(15, "2026-02-23T09:50:01Z", now)).toBe(
      false
    );
  });

  it("目安時間の2/3が過ぎたら出す（15分のうち10分経過）", () => {
    expect(isEndInterviewAvailable(15, "2026-02-23T09:50:00Z", now)).toBe(true);
  });

  it("3で割り切れない目安時間でも2/3の時点で出す（10分のうち6分40秒経過）", () => {
    expect(isEndInterviewAvailable(10, "2026-02-23T09:53:21Z", now)).toBe(
      false
    );
    expect(isEndInterviewAvailable(10, "2026-02-23T09:53:20Z", now)).toBe(true);
  });

  it("目安時間を超えても出したままにする", () => {
    expect(isEndInterviewAvailable(15, "2026-02-23T09:30:00Z", now)).toBe(true);
  });
});
