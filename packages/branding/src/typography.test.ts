import { describe, expect, it } from "vitest";
import {
  BODY_FONT_WEIGHT,
  FONT_FAMILIES,
  LINE_HEIGHTS,
  TEXT_SCALE,
} from "./typography";

/** rem → px（ルート16px前提） */
function remToPx(value: string): number {
  return Number.parseFloat(value.replace("rem", "")) * 16;
}

describe("サイズスケール（要求仕様4.2 / D-16）", () => {
  it("本文は17px", () => {
    expect(remToPx(TEXT_SCALE.body.size)).toBe(17);
  });

  it("注釈は14px", () => {
    expect(remToPx(TEXT_SCALE.caption.size)).toBe(14);
  });

  it("h1は26〜30pxの範囲", () => {
    const px = remToPx(TEXT_SCALE.h1.size);
    expect(px).toBeGreaterThanOrEqual(26);
    expect(px).toBeLessThanOrEqual(30);
  });

  it("h2は20px、ボタンは16px", () => {
    expect(remToPx(TEXT_SCALE.h2.size)).toBe(20);
    expect(remToPx(TEXT_SCALE.button.size)).toBe(16);
  });

  it("ルビは本文の60%（em指定なので親に追従する）", () => {
    expect(TEXT_SCALE.ruby.size).toBe("0.6em");
  });

  it("compactスケールは14〜15px（D-14）", () => {
    for (const token of ["compact-body", "compact-caption"] as const) {
      const px = remToPx(TEXT_SCALE[token].size);
      expect(px, token).toBeGreaterThanOrEqual(14);
      expect(px, token).toBeLessThanOrEqual(15);
    }
  });

  it("compactスケールは通常の本文より小さい", () => {
    expect(remToPx(TEXT_SCALE["compact-body"].size)).toBeLessThan(
      remToPx(TEXT_SCALE.body.size)
    );
  });
});

describe("行間", () => {
  it("すべて倍率指定（px固定ではない）", () => {
    // 固定px指定だとルビ表示ON/OFFで行高が変わったときに破綻する（要求仕様4.2）
    for (const [name, spec] of Object.entries(TEXT_SCALE)) {
      expect(spec.lineHeight, name).toMatch(/^\d+(\.\d+)?$/);
    }
    for (const [name, value] of Object.entries(LINE_HEIGHTS)) {
      expect(value, name).toMatch(/^\d+(\.\d+)?$/);
    }
  });

  it("本文は1.8、ルビ表示時は1.9で余裕を持たせる", () => {
    expect(TEXT_SCALE.body.lineHeight).toBe("1.8");
    expect(TEXT_SCALE["body-rubied"].lineHeight).toBe("1.9");
    expect(Number(TEXT_SCALE["body-rubied"].lineHeight)).toBeGreaterThan(
      Number(TEXT_SCALE.body.lineHeight)
    );
  });

  it("注釈は1.6、h1は1.35", () => {
    expect(TEXT_SCALE.caption.lineHeight).toBe("1.6");
    expect(TEXT_SCALE.h1.lineHeight).toBe("1.35");
  });
});

describe("ウェイト（D-7）", () => {
  it("本文の基準は500", () => {
    expect(BODY_FONT_WEIGHT).toBe("500");
  });

  it("見出し・ボタンは700", () => {
    expect(TEXT_SCALE.h1.fontWeight).toBe("700");
    expect(TEXT_SCALE.h2.fontWeight).toBe("700");
    expect(TEXT_SCALE.button.fontWeight).toBe("700");
  });
});

describe("書体", () => {
  it("見出しは Zen Maru Gothic（D-15）", () => {
    expect(FONT_FAMILIES.heading).toContain("--font-zen-maru-gothic");
  });

  it("本文は Noto Sans JP", () => {
    expect(FONT_FAMILIES.sans).toContain("--font-noto-sans-jp");
  });

  it("すべてフォールバックを明示している", () => {
    for (const [name, value] of Object.entries(FONT_FAMILIES)) {
      expect(value.split(",").length, name).toBeGreaterThanOrEqual(2);
    }
  });

  it("見出しが読めない環境でも本文書体にフォールバックする", () => {
    expect(FONT_FAMILIES.heading).toContain("--font-noto-sans-jp");
  });
});
