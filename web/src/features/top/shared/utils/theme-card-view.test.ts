import { describe, expect, it } from "vitest";
import { DEFAULT_INTERVIEW_THUMBNAIL } from "@/features/interview-config/shared/utils/interview-theme";
import {
  type ThemeCardSource,
  toThemeCardView,
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
        participationRule: {
          name: "若者支援",
          participation_mode: "public",
          allowed_provider_keys: [],
        },
      },
    });
  });

  it("表示中の難易度の本文を使い、なければふつうの本文を使う", () => {
    expect(toThemeCardView(source(), "hard")?.title).toBe("難しい見出し");
    const normalOnly = source({
      policy_contents: [
        { title: "ふつう", summary: null, difficulty_level: "normal" },
      ],
    });
    expect(toThemeCardView(normalOnly, "hard")?.title).toBe("ふつう");
  });

  it("本文も画像もなければ施策名と既定の画像を使う", () => {
    const view = toThemeCardView(
      source({ policy_contents: [], thumbnail_url: null }),
      "normal"
    );
    expect(view?.title).toBe("若者支援");
    expect(view?.summary).toBeNull();
    expect(view?.bannerSrc).toBe(DEFAULT_INTERVIEW_THUMBNAIL);
  });

  it("テーマにつながっていなければきかせて枠を出さない", () => {
    expect(
      toThemeCardView(source({ policies_interview_configs: [] }), "normal")
        ?.interview
    ).toBeNull();
  });

  it("公開中の子を持たない施策はカードにしない", () => {
    expect(
      toThemeCardView(source({ child_policies: [] }), "normal")
    ).toBeNull();
  });
});

describe("usesThemeGrid", () => {
  it("3件以下は縦並び、4件以上は2カラムのグリッド", () => {
    expect(usesThemeGrid(1)).toBe(false);
    expect(usesThemeGrid(3)).toBe(false);
    expect(usesThemeGrid(4)).toBe(true);
  });
});
