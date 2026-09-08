import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  BACKGROUND_COLOR,
  THEME_COLOR,
} from "@mirai-gikai/design-tokens/brand-meta";
import { SITE_DESCRIPTION, SITE_NAME } from "@mirai-gikai/shared/site";
import { describe, expect, it } from "vitest";
import manifest from "./manifest";

describe("manifest", () => {
  it("名前と説明をブランド定数から引く", () => {
    const { name, short_name, description } = manifest();
    expect(name).toBe(SITE_NAME);
    expect(short_name).toBe(SITE_NAME);
    expect(description).toBe(SITE_DESCRIPTION);
  });

  it("テーマ色をデザイントークンから引く", () => {
    const { theme_color, background_color } = manifest();
    expect(theme_color).toBe(THEME_COLOR);
    expect(background_color).toBe(BACKGROUND_COLOR);
  });

  it("旧ブランド名・国政由来の語彙が残っていない", () => {
    const { name, description } = manifest();
    for (const text of [name, description]) {
      expect(text).not.toMatch(/CHIKAT|みらい議会|佐賀/);
      expect(text).not.toMatch(/法案|議案|国会|衆議院|参議院/);
    }
  });

  it("192/512 それぞれに any と maskable のエントリを出す", () => {
    const icons = manifest().icons ?? [];
    expect(icons.map(({ sizes, purpose }) => `${sizes}:${purpose}`)).toEqual([
      "192x192:any",
      "192x192:maskable",
      "512x512:any",
      "512x512:maskable",
    ]);
  });

  // 静的manifestから移したときにパスを打ち間違えても気付けるようにする
  it("アイコンのsrcがpublic配下に実在する", () => {
    const publicDir = join(import.meta.dirname, "..", "..", "public");
    for (const { src } of manifest().icons ?? []) {
      expect(existsSync(join(publicDir, String(src)))).toBe(true);
    }
  });
});
