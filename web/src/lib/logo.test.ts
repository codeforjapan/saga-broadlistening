import { BRAND_CONFIG } from "@mirai-gikai/branding/config";
import { describe, expect, it } from "vitest";
import { type LogoVariant, logoImageProps } from "./logo";

// ロゴの実寸と設定値の一致は packages/branding の brand.config.test.ts で確認する
const LOGOS: Record<
  LogoVariant,
  { src: string; width: number; height: number }
> = {
  full: BRAND_CONFIG.assets.logo,
  compact: BRAND_CONFIG.assets.logoCompact,
};

describe("logoImageProps", () => {
  it.each<LogoVariant>([
    "full",
    "compact",
  ])("%s は設定したパスと、指定の高さに合わせた幅を返す", (variant) => {
    const logo = LOGOS[variant];
    for (const height of [32, 76, 88]) {
      expect(logoImageProps(variant, height)).toEqual({
        src: logo.src,
        width: Math.round((height * logo.width) / logo.height),
        height,
      });
    }
  });

  it("実寸の高さを渡すと実寸の幅（四捨五入）を返す", () => {
    const { logo } = BRAND_CONFIG.assets;
    expect(logoImageProps("full", logo.height).width).toBe(
      Math.round(logo.width)
    );
  });
});
