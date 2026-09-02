import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { renderTokensCss } from "./generate-css";

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
