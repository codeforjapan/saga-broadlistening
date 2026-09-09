import { describe, expect, it } from "vitest";
import {
  buildInterviewThemeCardAction,
  buildInterviewThemes,
  DEFAULT_INTERVIEW_THUMBNAIL,
  formatParticipantCount,
  type InterviewConfigListRow,
  type InterviewThemeRow,
  resolveInterviewThumbnail,
  toInterviewThemeRows,
} from "./interview-theme";

describe("resolveInterviewThumbnail", () => {
  it("テーマの画像を最優先する", () => {
    expect(
      resolveInterviewThumbnail(
        "https://example.com/theme.png",
        "https://example.com/policy.png"
      )
    ).toBe("https://example.com/theme.png");
  });

  it("テーマに画像がなければ施策の画像を使う", () => {
    expect(
      resolveInterviewThumbnail(null, "https://example.com/policy.png")
    ).toBe("https://example.com/policy.png");
  });

  it("どちらもなければ既定の画像を使う", () => {
    expect(resolveInterviewThumbnail(null, null)).toBe(
      DEFAULT_INTERVIEW_THUMBNAIL
    );
  });

  it("未指定（undefined）も画像なしとして扱う", () => {
    expect(resolveInterviewThumbnail(undefined, undefined)).toBe(
      DEFAULT_INTERVIEW_THUMBNAIL
    );
  });
});

function createRow(
  overrides: Partial<InterviewThemeRow> = {}
): InterviewThemeRow {
  return {
    id: "config-1",
    slug: "kosodate-shien",
    name: "子育て支援について",
    description: "子育てしやすいまちにするために必要な支援を伺います",
    estimatedDuration: 5,
    thumbnailUrl: "https://example.com/theme.png",
    createdAt: "2025-09-01T00:00:00+00:00",
    participantCount: 128,
    policies: [
      {
        isPublished: true,
        thumbnailUrl: "https://example.com/policy.png",
        tagLabel: "子育て・教育",
      },
    ],
    ...overrides,
  };
}

describe("buildInterviewThemes", () => {
  it("テーマの情報と参加人数をカード表示用にまとめる", () => {
    const themes = buildInterviewThemes([createRow()]);

    expect(themes).toEqual([
      {
        id: "config-1",
        slug: "kosodate-shien",
        name: "子育て支援について",
        description: "子育てしやすいまちにするために必要な支援を伺います",
        estimatedDuration: 5,
        thumbnailUrl: "https://example.com/theme.png",
        participantCount: 128,
        categoryLabel: "子育て・教育",
      },
    ]);
  });

  it("施策に紐づかない抽象テーマ型もそのまま並べる", () => {
    const themes = buildInterviewThemes([createRow({ policies: [] })]);

    expect(themes.map((theme) => theme.id)).toEqual(["config-1"]);
  });

  it("抽象テーマ型はフォールバック元の施策がないのでカテゴリを表示しない", () => {
    const themes = buildInterviewThemes([createRow({ policies: [] })]);

    expect(themes[0].categoryLabel).toBeNull();
  });

  it("紐づく施策がすべて未公開のテーマは一覧に出さない", () => {
    const themes = buildInterviewThemes([
      createRow({
        policies: [
          { isPublished: false, thumbnailUrl: null, tagLabel: "子育て・教育" },
        ],
      }),
    ]);

    expect(themes).toEqual([]);
  });

  it("公開済み施策が1件でもあれば一覧に出す", () => {
    const themes = buildInterviewThemes([
      createRow({
        policies: [
          { isPublished: false, thumbnailUrl: null, tagLabel: null },
          {
            isPublished: true,
            thumbnailUrl: "https://example.com/policy.png",
            tagLabel: "子育て・教育",
          },
        ],
      }),
    ]);

    expect(themes[0].categoryLabel).toBe("子育て・教育");
  });

  it("テーマに画像がなければ公開済み施策の画像を使う", () => {
    const themes = buildInterviewThemes([createRow({ thumbnailUrl: null })]);

    expect(themes[0].thumbnailUrl).toBe("https://example.com/policy.png");
  });

  it("未公開施策の画像はフォールバックに使わない", () => {
    const themes = buildInterviewThemes([
      createRow({
        thumbnailUrl: null,
        policies: [
          {
            isPublished: false,
            thumbnailUrl: "https://example.com/draft.png",
            tagLabel: null,
          },
          { isPublished: true, thumbnailUrl: null, tagLabel: null },
        ],
      }),
    ]);

    expect(themes[0].thumbnailUrl).toBe(DEFAULT_INTERVIEW_THUMBNAIL);
  });

  it("テーマにも施策にも画像がなければ既定の画像を使う", () => {
    const themes = buildInterviewThemes([
      createRow({ thumbnailUrl: null, policies: [] }),
    ]);

    expect(themes[0].thumbnailUrl).toBe(DEFAULT_INTERVIEW_THUMBNAIL);
  });

  it("施策にタグがなければカテゴリを表示しない", () => {
    const themes = buildInterviewThemes([
      createRow({
        policies: [
          {
            isPublished: true,
            thumbnailUrl: "https://example.com/policy.png",
            tagLabel: null,
          },
        ],
      }),
    ]);

    expect(themes[0].categoryLabel).toBeNull();
  });

  it("テーマは作成日時の新しい順に並ぶ", () => {
    const themes = buildInterviewThemes([
      createRow({ id: "config-old", createdAt: "2025-01-01T00:00:00+00:00" }),
      createRow({ id: "config-new", createdAt: "2025-12-01T00:00:00+00:00" }),
    ]);

    expect(themes.map((theme) => theme.id)).toEqual([
      "config-new",
      "config-old",
    ]);
  });

  it("作成日時が同じときはテーマIDの大きい順に並ぶ", () => {
    const themes = buildInterviewThemes([
      createRow({ id: "config-a" }),
      createRow({ id: "config-b" }),
    ]);

    expect(themes.map((theme) => theme.id)).toEqual(["config-b", "config-a"]);
  });

  it("同じ施策に募集中テーマが複数あっても、どちらも一覧に出す", () => {
    const themes = buildInterviewThemes([
      createRow({ id: "config-1", createdAt: "2025-10-01T00:00:00+00:00" }),
      createRow({ id: "config-2", createdAt: "2025-09-01T00:00:00+00:00" }),
    ]);

    expect(themes.map((theme) => theme.id)).toEqual(["config-1", "config-2"]);
  });
});

describe("formatParticipantCount", () => {
  it("3桁ごとに区切って表示する", () => {
    expect(formatParticipantCount(1234)).toBe("1,234人が参加");
  });

  it("0人のときは表示しない", () => {
    expect(formatParticipantCount(0)).toBeNull();
  });
});

describe("buildInterviewThemeCardAction", () => {
  it("募集中のテーマは参加導線（テーマのLP）へ送る", () => {
    expect(buildInterviewThemeCardAction("kosodate", "participate")).toEqual({
      href: "/interviews/kosodate",
      ctaLabel: "はじめる",
    });
  });

  it("募集終了のテーマはLPが無いため結果（トピック一覧）へ送る", () => {
    expect(buildInterviewThemeCardAction("kosodate", "results")).toEqual({
      href: "/interviews/kosodate/topics",
      ctaLabel: "結果を見る",
    });
  });
});

describe("toInterviewThemeRows", () => {
  const config: InterviewConfigListRow = {
    id: "config-1",
    slug: "kosodate",
    name: "子育て支援について",
    description: "説明",
    estimated_duration: 5,
    thumbnail_url: null,
    created_at: "2026-01-01T00:00:00Z",
    interview_sessions: [{ count: 3 }],
    policies_interview_configs: [
      {
        policies: {
          publish_status: "published",
          thumbnail_url: "https://example.com/policy.png",
          policies_tags: [{ tags: { label: "子育て" } }],
        },
      },
    ],
  };

  it("参加人数・施策の画像とタグを表示用の形に移す", () => {
    expect(toInterviewThemeRows([config])).toEqual([
      {
        id: "config-1",
        slug: "kosodate",
        name: "子育て支援について",
        description: "説明",
        estimatedDuration: 5,
        thumbnailUrl: null,
        createdAt: "2026-01-01T00:00:00Z",
        participantCount: 3,
        policies: [
          {
            isPublished: true,
            thumbnailUrl: "https://example.com/policy.png",
            tagLabel: "子育て",
          },
        ],
      },
    ]);
  });

  it("参加0人・施策0件（抽象テーマ型）でも欠損なく移す", () => {
    const rows = toInterviewThemeRows([
      {
        ...config,
        interview_sessions: [],
        policies_interview_configs: [],
      },
    ]);

    expect(rows[0].participantCount).toBe(0);
    expect(rows[0].policies).toEqual([]);
  });

  it("未公開施策は isPublished=false として移す", () => {
    const rows = toInterviewThemeRows([
      {
        ...config,
        policies_interview_configs: [
          {
            policies: {
              publish_status: "draft",
              thumbnail_url: null,
              policies_tags: [],
            },
          },
        ],
      },
    ]);

    expect(rows[0].policies).toEqual([
      { isPublished: false, thumbnailUrl: null, tagLabel: null },
    ]);
  });
});
