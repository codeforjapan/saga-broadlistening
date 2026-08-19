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
import { PRIMITIVES, SEMANTICS, SHADCN_UI_TOKENS } from "./palette";
import { SHADOWS } from "./shadows";
import {
  BODY_FONT_WEIGHT,
  FONT_FAMILIES,
  LINE_HEIGHTS,
  TEXT_SCALE,
} from "./typography";

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

  const uiVars = Object.entries(SHADCN_UI_TOKENS)
    .map(([name, value]) => `  --${name}: ${value};`)
    .join("\n");

  const uiThemeVars = Object.keys(SHADCN_UI_TOKENS)
    .map((name) => `  --color-${name}: var(--${name});`)
    .join("\n");

  const fontVars = Object.entries(FONT_FAMILIES)
    .map(([name, value]) => `  --font-${name}: ${value};`)
    .join("\n");

  const textVars = Object.entries(TEXT_SCALE)
    .flatMap(([name, spec]) => {
      const lines = [
        `  --text-${name}: ${spec.size};`,
        `  --text-${name}--line-height: ${spec.lineHeight};`,
      ];
      if ("fontWeight" in spec) {
        lines.push(`  --text-${name}--font-weight: ${spec.fontWeight};`);
      }
      return lines;
    })
    .join("\n");

  const leadingVars = Object.entries(LINE_HEIGHTS)
    .map(([name, value]) => `  --leading-${name}: ${value};`)
    .join("\n");

  const shadowVars = Object.entries(SHADOWS)
    .map(([name, value]) => `  --shadow-${name}: ${value};`)
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

  /* 書体（実体は各アプリの next/font が定義する変数） */
${fontVars}

  /* サイズ・行間スケール（行間は倍率指定。ルビON/OFFで崩れないため） */
${textVars}

  /* 行間ユーティリティ */
${leadingVars}

  /* シャドウ（D-6: 面の区切りは線ではなくシャドウで表現する） */
${shadowVars}
}

@layer base {
  /* 本文は W500 を基準にする（D-7） */
  body {
    font-weight: ${BODY_FONT_WEIGHT};
  }

  /* 見出しのみ丸ゴを適用する（日本語書体は容量が大きいため。要求仕様4.3） */
  h1,
  h2,
  h3,
  h4 {
    font-family: var(--font-heading);
  }

  /* ルビは本文の60%（D-16） */
  rt {
    font-size: var(--text-ruby);
    line-height: var(--text-ruby--line-height);
  }
}

:root {
  /* shadcn/ui セマンティック変数 */
${semanticVars}

  /* chart / sidebar（値は移行前のまま。案3-1への割り当ては #14） */
${uiVars}
}

@theme inline {
  /* セマンティック変数をユーティリティクラスとして公開する */
${semanticThemeVars}
${uiThemeVars}
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
