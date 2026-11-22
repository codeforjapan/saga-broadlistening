/**
 * `palette.ts` から `tokens.css` を生成する。
 *
 *   pnpm --filter @mirai-gikai/branding build:css
 *
 * 生成結果はリポジトリにコミットする（Tailwind から `@import` するため）。
 * `tokens-css.test.ts` がコミット済みCSSと生成結果の一致を検証するので、
 * `palette.ts` を編集したら必ず再生成すること。
 */

import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PRIMITIVES, SHADCN_UI_TOKENS } from "./palette";
import { SHADOWS } from "./shadows";
import { THEME_NAMES, type Theme } from "./theme-types";
import { resolveTheme } from "./themes";
import {
  BODY_FONT_WEIGHT,
  FONT_FAMILIES,
  INPUT_MIN_FONT_SIZE,
  LINE_HEIGHTS,
  TEXT_SCALE,
} from "./typography";

export function renderTokensCss(): string {
  const primitiveVars = Object.entries(PRIMITIVES)
    .map(([name, value]) => `  --color-${name}: ${value};`)
    .join("\n");

  const themeVars = (theme: Theme) =>
    [
      ...Object.entries(theme.colors).map(
        ([name, primitive]) => `  --${name}: var(--color-${primitive});`
      ),
      `  --heading-font: ${theme.headingFont};`,
      `  --page-background: ${theme.pageBackground};`,
    ].join("\n");

  const semanticThemeVars = Object.keys(resolveTheme("default").colors)
    .map((name) => `  --color-${name}: var(--${name});`)
    .join("\n");

  const themeBlocks = THEME_NAMES.map((name) => {
    const selector =
      name === "default" ? ":root,\n.theme-default" : `.theme-${name}`;
    return `${selector} {\n${themeVars(resolveTheme(name))}\n}`;
  }).join("\n\n");

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
 * 値の変更は packages/branding/src/palette.ts・brand.themes.ts を編集し、
 * pnpm --filter @mirai-gikai/branding build:css で再生成します。
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

  /* 見出しの書体はテーマで変える（brand.themes.ts の headingFont） */
  h1,
  h2,
  h3,
  h4 {
    font-family: var(--heading-font);
  }

  /* ルビは本文の60%（D-16） */
  rt {
    font-size: var(--text-ruby);
    line-height: var(--text-ruby--line-height);
  }
}

/* テーマ（brand.themes.ts）。クラスのないページは default の値になる。
   default 以外のテーマも、書かれていない値を default で補ってすべて出力する
   （テーマを入れ子にしても、親のテーマの値を引き継がないため） */
${themeBlocks}

:root {
  /* chart / sidebar（値は移行前のまま。案3-1への割り当ては #14） */
${uiVars}
}

@theme inline {
  /* セマンティック変数をユーティリティクラスとして公開する */
${semanticThemeVars}
${uiThemeVars}
  --font-heading: var(--heading-font);
}

/* ページの地。テーマの pageBackground */
@utility bg-page {
  background: var(--page-background);
}

/* iOS Safari はフォーカスした入力欄の文字が 16px 未満だと自動ズームする。
   ピンチズーム（WCAG 1.4.4）を許可したまま自動ズームだけを防ぐため、
   タッチ端末ではテキスト入力系の文字サイズを max(16px, 親の文字サイズ) にする。
   @layer の外に置くことで text-sm 等のユーティリティより優先される。
   そのためタッチ端末では入力欄自体の text-* 指定は大小とも効かない。
   大きくしたい場合は !text-lg のように important で指定する */
@media (pointer: coarse) {
  input:not(
      [type="checkbox"],
      [type="radio"],
      [type="range"],
      [type="file"],
      [type="color"],
      [type="hidden"],
      [type="button"],
      [type="submit"],
      [type="reset"],
      [type="image"]
    ),
  textarea,
  select {
    font-size: max(${INPUT_MIN_FONT_SIZE}, 1em);
  }
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
