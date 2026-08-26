import { describe, expect, it } from "vitest";
import {
  buildInterviewThemes,
  DEFAULT_INTERVIEW_THUMBNAIL,
  formatParticipantCount,
  type InterviewThemeLinkRow,
} from "./interview-theme";

function createRow(
  overrides: Omit<Partial<InterviewThemeLinkRow>, "config"> & {
    config?: Partial<InterviewThemeLinkRow["config"]>;
  } = {}
): InterviewThemeLinkRow {
  const { config, ...rest } = overrides;
  return {
    policyId: "policy-1",
    linkedAt: "2025-09-01T00:00:00+00:00",
    policyThumbnailUrl: "https://example.com/policy.png",
    policyTagLabel: "子育て・教育",
    ...rest,
    config: {
      id: "config-1",
      name: "子育て支援について",
      description: "子育てしやすいまちにするために必要な支援を伺います",
      estimatedDuration: 5,
      thumbnailUrl: "https://example.com/theme.png",
      createdAt: "2025-09-01T00:00:00+00:00",
      participantCount: 128,
      ...config,
    },
  };
}

describe("buildInterviewThemes", () => {
  it("テーマの情報と参加人数をカード表示用にまとめる", () => {
    const themes = buildInterviewThemes([createRow()]);

    expect(themes).toEqual([
      {
        id: "config-1",
        name: "子育て支援について",
        description: "子育てしやすいまちにするために必要な支援を伺います",
        estimatedDuration: 5,
        thumbnailUrl: "https://example.com/theme.png",
        participantCount: 128,
        categoryLabel: "子育て・教育",
        policyId: "policy-1",
      },
    ]);
  });

  it("テーマに画像がなければ施策の画像を使う", () => {
    const themes = buildInterviewThemes([
      createRow({ config: { thumbnailUrl: null } }),
    ]);

    expect(themes[0].thumbnailUrl).toBe("https://example.com/policy.png");
  });

  it("テーマにも施策にも画像がなければ既定の画像を使う", () => {
    const themes = buildInterviewThemes([
      createRow({ config: { thumbnailUrl: null }, policyThumbnailUrl: null }),
    ]);

    expect(themes[0].thumbnailUrl).toBe(DEFAULT_INTERVIEW_THUMBNAIL);
  });

  it("施策にタグがなければカテゴリを表示しない", () => {
    const themes = buildInterviewThemes([createRow({ policyTagLabel: null })]);

    expect(themes[0].categoryLabel).toBeNull();
  });

  it("テーマは作成日時の新しい順に並ぶ", () => {
    const themes = buildInterviewThemes([
      createRow({
        policyId: "policy-old",
        config: { id: "config-old", createdAt: "2025-01-01T00:00:00+00:00" },
      }),
      createRow({
        policyId: "policy-new",
        config: { id: "config-new", createdAt: "2025-12-01T00:00:00+00:00" },
      }),
    ]);

    expect(themes.map((theme) => theme.id)).toEqual([
      "config-new",
      "config-old",
    ]);
  });

  it("1施策に募集中テーマが複数あるとき、LPが出す1件だけを残す", () => {
    const themes = buildInterviewThemes([
      createRow({
        linkedAt: "2025-09-01T00:00:00+00:00",
        config: { id: "config-old" },
      }),
      createRow({
        linkedAt: "2025-10-01T00:00:00+00:00",
        config: { id: "config-new" },
      }),
    ]);

    expect(themes.map((theme) => theme.id)).toEqual(["config-new"]);
  });

  it("紐付け日時が同じときはテーマIDの大きい方を残す", () => {
    const themes = buildInterviewThemes([
      createRow({ config: { id: "config-a" } }),
      createRow({ config: { id: "config-b" } }),
    ]);

    expect(themes.map((theme) => theme.id)).toEqual(["config-b"]);
  });

  it("別の施策から辿り着けるテーマは残る", () => {
    const themes = buildInterviewThemes([
      createRow({
        policyId: "policy-1",
        linkedAt: "2025-10-01T00:00:00+00:00",
        config: { id: "config-1" },
      }),
      createRow({
        policyId: "policy-1",
        linkedAt: "2025-09-01T00:00:00+00:00",
        config: { id: "config-2", createdAt: "2025-08-01T00:00:00+00:00" },
      }),
      createRow({
        policyId: "policy-2",
        linkedAt: "2025-09-01T00:00:00+00:00",
        config: { id: "config-2", createdAt: "2025-08-01T00:00:00+00:00" },
      }),
    ]);

    expect(
      themes.map((theme) => ({ id: theme.id, policyId: theme.policyId }))
    ).toEqual([
      { id: "config-1", policyId: "policy-1" },
      { id: "config-2", policyId: "policy-2" },
    ]);
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
