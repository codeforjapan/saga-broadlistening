import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { renderTokensCss } from "./generate-css";
import { INPUT_MIN_FONT_SIZE } from "./typography";

const tokensCssPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "tokens.css"
);

describe("tokens.css", () => {
  it("palette.ts から生成した内容と一致する（再生成漏れの検出）", () => {
    const committed = readFileSync(tokensCssPath, "utf8");

    expect(committed).toBe(renderTokensCss());
  });
});

describe("iOS のフォーカス時自動ズーム対策", () => {
  const css = renderTokensCss();
  const start = css.indexOf("@media (pointer: coarse)");

  it("タッチ端末でテキスト入力系を最小サイズ以上に保つルールがある", () => {
    expect(start).toBeGreaterThan(-1);
    const rule = css.slice(start);
    expect(rule).toContain("textarea,");
    expect(rule).toContain('[type="checkbox"]');
    expect(rule).toContain(`font-size: max(${INPUT_MIN_FONT_SIZE}, 1em);`);
  });

  it("ルールは @layer の外にある（text-sm 等のユーティリティに負けないため）", () => {
    expect(start).toBeGreaterThan(-1);
    // 直前までのブレースがすべて閉じている＝どのブロック（@layer 含む）にも属さない
    const before = css.slice(0, start);
    const depth =
      (before.match(/\{/g) ?? []).length - (before.match(/\}/g) ?? []).length;
    expect(depth).toBe(0);
  });
});
