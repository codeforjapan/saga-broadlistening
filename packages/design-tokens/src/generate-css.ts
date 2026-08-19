/**
 * `palette.ts` から `tokens.css` を生成する。
 *
 *   pnpm --filter @mirai-gikai/design-tokens build:css
 *
 * 生成結果はリポジトリにコミットする（Tailwind から `@import` するため）。
 * `tokens-css.test.ts` がコミット済みCSSと生成結果の一致を検証するので、
 * `palette.ts` を編集したら必ず再生成すること。
 */

import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PRIMITIVES, SEMANTICS } from "./palette";

export function renderTokensCss(): string {
  const primitiveVars = Object.entries(PRIMITIVES)
    .map(([name, value]) => `  --color-${name}: ${value};`)
    .join("\n");

  const semanticVars = Object.entries(SEMANTICS)
    .map(([name, primitive]) => `  --${name}: var(--color-${primitive});`)
    .join("\n");

  const semanticThemeVars = Object.keys(SEMANTICS)
    .map((name) => `  --color-${name}: var(--${name});`)
    .join("\n");

  return `/**
 * 佐賀市AI公聴基盤 デザイントークン（案3-1 水色基調）
 *
 * このファイルは自動生成です。直接編集しないでください。
 * 値の変更は packages/design-tokens/src/palette.ts を編集し、
 * pnpm --filter @mirai-gikai/design-tokens build:css で再生成します。
 */

@theme {
  /* プリミティブパレット */
${primitiveVars}
}

:root {
  /* shadcn/ui セマンティック変数 */
${semanticVars}
}

@theme inline {
  /* セマンティック変数をユーティリティクラスとして公開する */
${semanticThemeVars}
}
`;
}

const isMain =
  process.argv[1] != null &&
  fileURLToPath(import.meta.url) === process.argv[1];

if (isMain) {
  const outPath = join(dirname(fileURLToPath(import.meta.url)), "..", "tokens.css");
  writeFileSync(outPath, renderTokensCss(), "utf8");
  console.log(`generated: ${outPath}`);
}
