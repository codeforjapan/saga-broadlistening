import { expect, it } from "vitest";
import { appendLanguageGuide } from "./language-guide";

it("プロンプトの後ろに空行を1つ挟んで言葉づかいをつなげる", () => {
  expect(
    appendLanguageGuide("# 人物像\n聞き手です。\n", "\n## 言葉づかい\n- 主人 → 配偶者\n")
  ).toBe("# 人物像\n聞き手です。\n\n## 言葉づかい\n- 主人 → 配偶者");
});
