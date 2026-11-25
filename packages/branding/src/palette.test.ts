import { describe, expect, it } from "vitest";
import {
  AA_LARGE_TEXT_OR_UI,
  AA_TEXT,
  contrastRatio,
  meetsAaText,
} from "./contrast";
import {
  LARGE_TEXT_ONLY_TOKENS,
  PRIMITIVES,
  resolveSemantic,
  SURFACE_ONLY_TOKENS,
  TEXT_SAFE_TOKENS,
} from "./palette";
import { THEME_NAMES } from "./theme-types";
import { resolveTheme } from "./themes";

const WHITE = PRIMITIVES["base-white"];

describe("プリミティブパレット", () => {
  it("すべての値が6桁hexである", () => {
    for (const [name, value] of Object.entries(PRIMITIVES)) {
      expect(value, name).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it("コントラスト比が期待値どおり（対 base-white）", () => {
    // 要求仕様 付録「コントラスト早見表」の実測値。仕様の表には以下3件の誤りがあり、
    // 本テストは WCAG 2.1 の定義に基づく計算結果を正とする（Epic #8 に報告済み）。
    //   base-ink    仕様 15.3 → 実測 14.2
    //   yellow-400  仕様  2.3 → 実測  1.4
    //   lavender-500 仕様 4.0 → 実測  3.9
    // いずれも「どの用途に使えるか」の判定（AA 4.5:1 / 3:1）は仕様の意図と変わらない。
    const expected: Array<[keyof typeof PRIMITIVES, number]> = [
      ["base-ink", 14.2],
      ["base-ink-muted", 5.9],
      ["lavender-600", 5.8],
      ["sky-700", 4.7],
      ["green-700", 4.7],
      ["lavender-500", 3.9],
      ["yellow-400", 1.4],
      ["green-400", 2.0],
      ["sky-400", 2.0],
    ];

    for (const [token, ratio] of expected) {
      // 期待値は小数第1位までの表記なので ±0.1 を許容幅とする
      expect(
        Math.abs(contrastRatio(PRIMITIVES[token], WHITE) - ratio),
        token
      ).toBeLessThanOrEqual(0.1);
    }
  });
});

describe("白文字禁止ルール（本トンマナの最重要ルール）", () => {
  it.each(SURFACE_ONLY_TOKENS)(
    "%s の面に白文字を載せるとAA不達になる",
    (token) => {
      expect(meetsAaText(WHITE, PRIMITIVES[token])).toBe(false);
    }
  );

  it.each(SURFACE_ONLY_TOKENS)(
    "%s の面に base-ink を載せれば 4.5:1 以上を満たす",
    (token) => {
      expect(
        contrastRatio(PRIMITIVES["base-ink"], PRIMITIVES[token])
      ).toBeGreaterThanOrEqual(AA_TEXT);
    }
  );
});

describe("文字に使えるトークン", () => {
  it.each(TEXT_SAFE_TOKENS)("%s は対白 4.5:1 以上", (token) => {
    expect(
      contrastRatio(PRIMITIVES[token], WHITE),
      token
    ).toBeGreaterThanOrEqual(AA_TEXT);
  });
});

describe("大テキスト・UI部品にのみ使えるトークン", () => {
  it.each(LARGE_TEXT_ONLY_TOKENS)(
    "%s は対白 3:1 以上だが 4.5:1 未満（本文には使えない）",
    (token) => {
      const ratio = contrastRatio(PRIMITIVES[token], WHITE);
      expect(ratio, token).toBeGreaterThanOrEqual(AA_LARGE_TEXT_OR_UI);
      expect(ratio, token).toBeLessThan(AA_TEXT);
    }
  );

  it("注意喚起テキストには yellow-700 を使えば AA を満たす", () => {
    expect(meetsAaText(PRIMITIVES["yellow-700"], WHITE)).toBe(true);
  });
});

describe.each(THEME_NAMES)("テーマ %s の色", (theme) => {
  const resolve = (token: Parameters<typeof resolveSemantic>[0]) =>
    resolveSemantic(token, theme);

  it("すべての色トークンがプリミティブを指す", () => {
    for (const [token, primitive] of Object.entries(resolveTheme(theme).colors)) {
      expect(PRIMITIVES, token).toHaveProperty(primitive);
    }
  });

  it("background は白（D-2）", () => {
    expect(resolve("background")).toBe("#ffffff");
  });

  it("primary の面に primary-foreground を載せて 4.5:1 以上", () => {
    expect(
      contrastRatio(resolve("primary-foreground"), resolve("primary"))
    ).toBeGreaterThanOrEqual(AA_TEXT);
  });

  it("ring はフォーカス可視性 3:1 以上（対 background）", () => {
    expect(
      contrastRatio(resolve("ring"), resolve("background"))
    ).toBeGreaterThanOrEqual(AA_LARGE_TEXT_OR_UI);
  });

  it("foreground / muted-foreground は本文として 4.5:1 以上", () => {
    for (const token of ["foreground", "muted-foreground"] as const) {
      expect(
        contrastRatio(resolve(token), resolve("background")),
        token
      ).toBeGreaterThanOrEqual(AA_TEXT);
    }
  });

  it("secondary / accent などの面に foreground を載せて 4.5:1 以上", () => {
    for (const surface of ["secondary", "accent", "muted", "card"] as const) {
      expect(
        contrastRatio(resolve("foreground"), resolve(surface)),
        surface
      ).toBeGreaterThanOrEqual(AA_TEXT);
    }
  });

  it("primary-accent の文字は白と secondary の面の上で 4.5:1 以上", () => {
    for (const surface of ["background", "secondary"] as const) {
      expect(
        contrastRatio(resolve("primary-accent"), resolve(surface)),
        surface
      ).toBeGreaterThanOrEqual(AA_TEXT);
    }
  });

  it("destructive の面には白文字を載せられる（破壊的操作の視認性）", () => {
    expect(
      contrastRatio(resolve("destructive-foreground"), resolve("destructive"))
    ).toBeGreaterThanOrEqual(AA_TEXT);
  });
});

describe("default の色", () => {
  it("primary-foreground は黒であり、白ではない（D-13）", () => {
    expect(resolveSemantic("primary-foreground")).toBe(
      PRIMITIVES["base-ink"]
    );
    expect(resolveSemantic("primary-foreground")).not.toBe(WHITE);
  });

  it("primary-accent の文字は薄い面の上でも 4.5:1 以上（ページ背景が base-surface のため）", () => {
    // #96 の再発防止: sky-700 は白面では 4.7:1 だが base-surface 上で 4.37:1 と AA を割った。
    // 文字用アクセントは、文字が載りうる薄い面すべてで AA を満たすことを機械的に担保する
    const accent = resolveSemantic("primary-accent");
    for (const surface of [
      "base-white",
      "base-surface",
      "sky-50",
      "sky-100",
    ] as const) {
      expect(
        contrastRatio(accent, PRIMITIVES[surface]),
        surface
      ).toBeGreaterThanOrEqual(AA_TEXT);
    }
  });
});

describe("interview の色", () => {
  it("primary-accent の文字はグラデーションの地の上でも 4.5:1 以上", () => {
    const accent = resolveSemantic("primary-accent", "interview");
    for (const surface of ["emerald-100", "emerald-50"] as const) {
      expect(
        contrastRatio(accent, PRIMITIVES[surface]),
        surface
      ).toBeGreaterThanOrEqual(AA_TEXT);
    }
  });
});
