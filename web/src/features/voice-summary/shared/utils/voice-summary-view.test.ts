import { describe, expect, it } from "vitest";
import {
  buildVoiceSummaryMetadata,
  formatVoiceSummaryMeta,
  selectSourceTopics,
} from "./voice-summary-view";

describe("formatVoiceSummaryMeta", () => {
  it("トピック数・意見数と更新日を出す", () => {
    expect(
      formatVoiceSummaryMeta({
        topicCount: 12,
        opinionCount: 1086,
        publishedAt: "2026-10-08T03:00:00Z",
      })
    ).toBe("12件のトピック・1,086件の意見をもとにAIが整理 · 2026.10.8 更新");
  });

  it("公開日がなければ件数だけ", () => {
    expect(
      formatVoiceSummaryMeta({
        topicCount: 1,
        opinionCount: 2,
        publishedAt: null,
      })
    ).toBe("1件のトピック・2件の意見をもとにAIが整理");
  });
});

describe("selectSourceTopics", () => {
  const topics = [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }];

  it("記録した順に上位3件を選ぶ", () => {
    expect(selectSourceTopics(["d", "b", "a", "c"], topics)).toEqual([
      { id: "d" },
      { id: "b" },
      { id: "a" },
    ]);
  });

  it("見つからないトピックは飛ばす", () => {
    expect(selectSourceTopics(["x", "c"], topics)).toEqual([{ id: "c" }]);
  });

  it("記録がなければ空", () => {
    expect(selectSourceTopics([], topics)).toEqual([]);
  });
});

describe("buildVoiceSummaryMetadata", () => {
  const base = {
    canonical: "/interviews/wakamono-shien/summary",
    shareImageUrl: "https://example.com/theme.jpg",
  };

  it("タイトルは「みんなの声のまとめ：〇〇」、説明は冒頭の段落", () => {
    const metadata = buildVoiceSummaryMetadata({
      ...base,
      subjectName: "若者支援",
      lead: "冒頭の段落",
    });
    expect(metadata.title).toBe("みんなの声のまとめ：若者支援");
    expect(metadata.description).toBe("冒頭の段落");
    expect(metadata.alternates).toEqual({ canonical: base.canonical });
  });

  it("OGP と X のカードに、まとめのタイトルと共有画像を入れる", () => {
    const metadata = buildVoiceSummaryMetadata({
      ...base,
      subjectName: "若者支援",
      lead: "冒頭の段落",
    });
    expect(metadata.openGraph).toMatchObject({
      title: "みんなの声のまとめ：若者支援",
      description: "冒頭の段落",
      images: [{ url: base.shareImageUrl }],
    });
    expect(metadata.twitter).toMatchObject({
      title: "みんなの声のまとめ：若者支援",
      images: [base.shareImageUrl],
    });
  });

  it("対象も冒頭の段落もなければ、汎用のタイトルと説明", () => {
    const metadata = buildVoiceSummaryMetadata({
      ...base,
      subjectName: null,
      lead: null,
    });
    expect(metadata.title).toBe("みんなの声のまとめ");
    expect(metadata.description).toBeTruthy();
  });
});
