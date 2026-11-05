import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  BACKGROUND_COLOR,
  OG_COLORS,
  PROGRESS_BAR_COLOR,
  THEME_COLOR,
} from "./brand-meta";
import { AA_LARGE_TEXT_OR_UI, AA_TEXT, contrastRatio } from "./contrast";
import { PRIMITIVES } from "./palette";

const repoRoot = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  ".."
);

describe("ブランドメタ", () => {
  it("すべての値がパレットのプリミティブと一致する（hex直書きがない）", () => {
    const palette = new Set<string>(Object.values(PRIMITIVES));
    const values = [
      THEME_COLOR,
      BACKGROUND_COLOR,
      PROGRESS_BAR_COLOR,
      ...Object.values(OG_COLORS),
    ];

    for (const value of values) {
      expect(palette, value).toContain(value);
    }
  });

  it("theme-color は明るい水色（D-5: 大面積の渋いブルーを避ける）", () => {
    expect(THEME_COLOR).toBe(PRIMITIVES["sky-400"]);
  });

  it("PWA背景は白（D-2）", () => {
    expect(BACKGROUND_COLOR).toBe(PRIMITIVES["base-white"]);
  });

  it("プログレスバーは白背景で3:1以上（細い線のため視認性が必要）", () => {
    expect(
      contrastRatio(PROGRESS_BAR_COLOR, BACKGROUND_COLOR)
    ).toBeGreaterThanOrEqual(AA_LARGE_TEXT_OR_UI);
  });

  it("OG画像の文字色が背景に対して4.5:1以上", () => {
    for (const token of ["text", "textMuted", "accent"] as const) {
      expect(
        contrastRatio(OG_COLORS[token], OG_COLORS.background),
        token
      ).toBeGreaterThanOrEqual(AA_TEXT);
    }
  });

  it("OGバッジの面に文字を載せて4.5:1以上", () => {
    expect(
      contrastRatio(OG_COLORS.text, OG_COLORS.badgeSurface)
    ).toBeGreaterThanOrEqual(AA_TEXT);
  });
});

describe("manifest.json との整合", () => {
  const manifest = JSON.parse(
    readFileSync(join(repoRoot, "web/public/manifest.json"), "utf8")
  ) as {
    theme_color: string;
    background_color: string;
    name: string;
    description: string;
  };

  it("theme_color がトークンと一致する", () => {
    expect(manifest.theme_color).toBe(THEME_COLOR);
  });

  it("background_color がトークンと一致する", () => {
    expect(manifest.background_color).toBe(BACKGROUND_COLOR);
  });

  it("旧ブランド名が残っていない", () => {
    expect(manifest.name).not.toContain("みらい議会");
  });

  it("description に国政由来の語彙が残っていない", () => {
    expect(manifest.description).not.toMatch(/法案|議案|国会|衆議院|参議院/);
  });
});
