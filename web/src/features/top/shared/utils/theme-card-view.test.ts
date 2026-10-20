import { describe, expect, it } from "vitest";
import { DEFAULT_INTERVIEW_THUMBNAIL } from "@/features/interview-config/shared/utils/interview-theme";
import {
  selectTopThemeCards,
  type ThemeCardSource,
  toThemeCardView,
  showsComingSoon,
  usesThemeGrid,
} from "./theme-card-view";

const youthTheme = {
  id: "config-youth",
  name: "若者支援",
  slug: "wakamono-shien",
  status: "open",
  estimated_duration: 10,
  created_at: "2026-09-01T00:00:00Z",
  participation_mode: "public" as const,
  allowed_provider_keys: [],
  interview_sessions: [{ count: 64 }],
  theme_voice_summaries: [],
};

function source(overrides: Partial<ThemeCardSource> = {}): ThemeCardSource {
  return {
    id: "policy-youth",
    name: "若者支援",
    thumbnail_url: "https://example.jp/youth.png",
    parent_policy_id: null,
    policy_contents: [
      {
        title: "若い世代が、自分らしい未来を描けるまちへ",
        summary: "ふつうの説明",
        difficulty_level: "normal",
      },
      {
        title: "難しい見出し",
        summary: "難しい説明",
        difficulty_level: "hard",
      },
    ],
    child_policies: [{ publish_status: "published" }],
    policies_interview_configs: [{ interview_configs: youthTheme }],
    ...overrides,
  };
}

describe("toThemeCardView", () => {
  it("親施策とテーマからカードの表示用データを作る", () => {
    const view = toThemeCardView(source(), "normal");
    expect(view).toEqual({
      policyId: "policy-youth",
      policyName: "若者支援",
      bannerSrc: "https://example.jp/youth.png",
      title: "若い世代が、自分らしい未来を描けるまちへ",
      summary: "ふつうの説明",
      interview: {
        slug: "wakamono-shien",
        prompt: "若者支援について、あなたの経験や考えを聞かせてください",
        durationLabel: "約10分〜",
        participantLabel: "64人が参加",
        isOpen: true,
        hasPublishedSummary: false,
        participationRule: {
          name: "若者支援",
          participation_mode: "public",
          allowed_provider_keys: [],
        },
      },
    });
  });

  it("表示中の難易度の本文を使い、なければふつうの本文を使う", () => {
    expect(toThemeCardView(source(), "hard").title).toBe("難しい見出し");
    const normalOnly = source({
      policy_contents: [
        { title: "ふつう", summary: null, difficulty_level: "normal" },
      ],
    });
    expect(toThemeCardView(normalOnly, "hard").title).toBe("ふつう");
  });

  it("本文も画像もなければ施策名と既定の画像を使う", () => {
    const view = toThemeCardView(
      source({ policy_contents: [], thumbnail_url: null }),
      "normal"
    );
    expect(view.title).toBe("若者支援");
    expect(view.summary).toBeNull();
    expect(view.bannerSrc).toBe(DEFAULT_INTERVIEW_THUMBNAIL);
  });

  it("テーマにつながっていなければきかせて枠を出さない", () => {
    expect(
      toThemeCardView(source({ policies_interview_configs: [] }), "normal")
        .interview
    ).toBeNull();
  });
});

describe("selectTopThemeCards", () => {
  const ids = (views: { policyId: string }[]) => views.map((v) => v.policyId);

  describe("親施策が1件以上あるとき", () => {
    it("親施策だけを、取得した順にカードにする", () => {
      const sources = [
        source({ id: "standard", child_policies: [] }),
        source({ id: "parent-a" }),
        source({
          id: "child",
          parent_policy_id: "parent-a",
          child_policies: [],
        }),
        source({ id: "parent-b" }),
      ];
      expect(ids(selectTopThemeCards(sources, "normal"))).toEqual([
        "parent-a",
        "parent-b",
      ]);
    });

    it("テーマにつながらない親施策もカードにする（きかせて枠なし）", () => {
      const [view] = selectTopThemeCards(
        [source({ id: "parent", policies_interview_configs: [] })],
        "normal"
      );
      expect(view?.policyId).toBe("parent");
      expect(view?.interview).toBeNull();
    });

    it("子が下書きだけの施策は親施策に数えない", () => {
      const sources = [
        source({
          id: "draft-children",
          child_policies: [{ publish_status: "draft" }],
        }),
        source({ id: "parent" }),
      ];
      expect(ids(selectTopThemeCards(sources, "normal"))).toEqual(["parent"]);
    });
  });

  describe("親施策が1件もないとき", () => {
    it("テーマにつながる施策を、取得した順にカードにする", () => {
      const sources = [
        source({ id: "a", child_policies: [] }),
        source({
          id: "no-theme",
          child_policies: [],
          policies_interview_configs: [],
        }),
        source({ id: "b", child_policies: [] }),
      ];
      expect(ids(selectTopThemeCards(sources, "normal"))).toEqual(["a", "b"]);
    });

    it("つながるテーマが下書きだけの施策はカードにしない", () => {
      const sources = [
        source({
          id: "draft-theme",
          child_policies: [],
          policies_interview_configs: [
            { interview_configs: { ...youthTheme, status: "draft" } },
          ],
        }),
      ];
      expect(selectTopThemeCards(sources, "normal")).toEqual([]);
    });

    it("テーマにつながる施策もなければ空（TOP は「準備中」だけになる）", () => {
      expect(
        selectTopThemeCards(
          [source({ child_policies: [], policies_interview_configs: [] })],
          "normal"
        )
      ).toEqual([]);
      expect(selectTopThemeCards([], "normal")).toEqual([]);
    });
  });
});

describe("usesThemeGrid", () => {
  it("3件以下は縦並び、4件以上は2カラムのグリッド", () => {
    expect(usesThemeGrid(1)).toBe(false);
    expect(usesThemeGrid(3)).toBe(false);
    expect(usesThemeGrid(4)).toBe(true);
  });
});

describe("showsComingSoon", () => {
  it("テーマが3件未満のときだけ「準備中」を出す", () => {
    expect(showsComingSoon(0)).toBe(true);
    expect(showsComingSoon(2)).toBe(true);
    expect(showsComingSoon(3)).toBe(false);
    expect(showsComingSoon(4)).toBe(false);
  });
});
