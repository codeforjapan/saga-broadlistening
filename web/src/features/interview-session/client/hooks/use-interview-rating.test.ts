// @vitest-environment jsdom
import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { InterviewProgress } from "../../shared/utils/calc-interview-progress";
import { useInterviewRating } from "./use-interview-rating";

const progressAt = (percentage: number): InterviewProgress => ({
  percentage,
  stageLabel: "もう少し聞かせて",
});

describe("useInterviewRating", () => {
  it("星評価を出す設定なら、進み具合が閾値を超えたときに出す", () => {
    const { result, rerender } = renderHook(
      ({ progress }) =>
        useInterviewRating({ enabled: true, progress, hasRated: false }),
      { initialProps: { progress: progressAt(10) } }
    );
    expect(result.current.showRating).toBe(false);

    rerender({ progress: progressAt(80) });
    expect(result.current.showRating).toBe(true);
  });

  it("星評価を出さない設定（既定）なら、閾値を超えても出さない", () => {
    const { result } = renderHook(() =>
      useInterviewRating({
        enabled: false,
        progress: progressAt(100),
        hasRated: false,
      })
    );
    expect(result.current.showRating).toBe(false);
  });

  it("評価済みなら出さない", () => {
    const { result } = renderHook(() =>
      useInterviewRating({
        enabled: true,
        progress: progressAt(100),
        hasRated: true,
      })
    );
    expect(result.current.showRating).toBe(false);
  });
});
