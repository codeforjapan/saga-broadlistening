import { describe, expect, it } from "vitest";
import {
  isBasedOnOutdatedAnalysis,
  selectVoiceSummary,
  toVoiceSummaryStatus,
} from "./voice-summary-status";

describe("isBasedOnOutdatedAnalysis", () => {
  it("公開中の分析と同じ版なら古くない", () => {
    expect(isBasedOnOutdatedAnalysis("v2", "v2")).toBe(false);
  });

  it("分析を新しく公開したら古い", () => {
    expect(isBasedOnOutdatedAnalysis("v1", "v2")).toBe(true);
  });

  it("元の分析が分からない、または公開中の分析がなければ古い", () => {
    expect(isBasedOnOutdatedAnalysis(null, "v2")).toBe(true);
    expect(isBasedOnOutdatedAnalysis("v1", null)).toBe(true);
  });
});

describe("selectVoiceSummary", () => {
  const summaries = [
    { id: "archived", status: "archived" },
    { id: "published", status: "published" },
    { id: "draft", status: "draft" },
  ];

  it("指定された版を選ぶ", () => {
    expect(selectVoiceSummary(summaries, "archived")?.id).toBe("archived");
  });

  it("指定がなければ下書き、なければ公開中、なければ最新", () => {
    expect(selectVoiceSummary(summaries, undefined)?.id).toBe("draft");
    expect(selectVoiceSummary(summaries.slice(0, 2), undefined)?.id).toBe(
      "published"
    );
    expect(selectVoiceSummary(summaries.slice(0, 1), "missing")?.id).toBe(
      "archived"
    );
    expect(selectVoiceSummary([], undefined)).toBeNull();
  });
});

describe("toVoiceSummaryStatus", () => {
  it("不明な値は下書き扱い", () => {
    expect(toVoiceSummaryStatus("published")).toBe("published");
    expect(toVoiceSummaryStatus("unknown")).toBe("draft");
  });
});
