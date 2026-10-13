import { describe, expect, it } from "vitest";
import {
  extractSummaryLead,
  renderVoiceSummaryHtml,
  validateVoiceSummaryMarkdown,
} from "./markdown";

const VALID = `# 若者が佐賀市で未来を描き、活躍し続けるには？

進学や就職をきっかけに市外へ出る理由として、**学びや仕事の選択肢の少なさ**が挙がっています。

## いま感じている課題
- **若い世代の市外への流出**：進学や就職をきっかけに市外へ出る

> **特に多かった声**
> 「市内に求人がほとんどない」という声が多く寄せられています。

## 背景にある要因
1. **教育機会の制限**：大学の選択肢が少ない
1. **雇用環境**：専門職の求人が少ない

### 学びの場を充実させる
- **大学の魅力を高める**：カリキュラムを充実させる
`;

function errorsOf(markdown: string): string[] {
  const result = validateVoiceSummaryMarkdown(markdown);
  return result.ok ? [] : result.errors;
}

describe("validateVoiceSummaryMarkdown", () => {
  it("8つの記法だけのまとめを受け付ける", () => {
    expect(validateVoiceSummaryMarkdown(VALID)).toEqual({ ok: true });
  });

  it.each([
    ["表", "# 問い\n\n| a | b |\n|---|---|\n| 1 | 2 |", "使えない記法"],
    ["画像", "# 問い\n\n![図](https://example.jp/a.png)", "画像"],
    ["リンク", "# 問い\n\n[市HP](https://example.jp)", "リンク"],
    ["コード", "# 問い\n\n```\ncode\n```", "コード"],
    ["インラインコード", "# 問い\n\n`code`", "コード"],
    ["HTML", "# 問い\n\n<div>html</div>", "HTML"],
    ["#### 見出し", "# 問い\n\n#### 小さすぎる見出し", "#### 以下"],
    ["斜体", "# 問い\n\n*斜体*", "斜体"],
    ["区切り線", "# 問い\n\n---\n\n段落", "区切り線"],
  ])("%s を拒否する", (_label, markdown, expected) => {
    expect(errorsOf(markdown).join("\n")).toContain(expected);
  });

  it("# 見出しが2つあれば拒否する", () => {
    expect(errorsOf("# 問い1\n\n段落\n\n# 問い2")).toContain(
      "# 見出しは冒頭に1つだけにしてください"
    );
  });

  it("冒頭が # 見出しでなければ拒否する", () => {
    expect(errorsOf("段落から始まる\n\n# 問い")).toContain(
      "冒頭は # 見出し（問い）にしてください"
    );
  });

  it("空なら拒否する", () => {
    expect(errorsOf("  \n")).toEqual(["本文を入力してください"]);
  });
});

describe("renderVoiceSummaryHtml", () => {
  it("見出し・太字・引用・番号つきリストを HTML にする", () => {
    const html = renderVoiceSummaryHtml(VALID);
    expect(html).toContain("<h1>若者が佐賀市で未来を描き、活躍し続けるには？</h1>");
    expect(html).toContain("<strong>学びや仕事の選択肢の少なさ</strong>");
    expect(html).toContain("<blockquote>");
    expect(html).toContain("<ol>");
  });

  it("検証を通っていない本文でも javascript: の URL を出さない", () => {
    const html = renderVoiceSummaryHtml("# 問い\n\n[x](javascript:alert(1))");
    expect(html).not.toContain("javascript:");
  });

  it("検証を通っていない本文でも、外部リンクや画像のタグを出さない（文字は残す）", () => {
    const html = renderVoiceSummaryHtml(
      "# 問い\n\n[市HP](https://example.jp) ![図](https://example.jp/a.png)"
    );
    expect(html).not.toContain("<a");
    expect(html).not.toContain("<img");
    expect(html).toContain("市HP");
  });

  it("生の HTML は出力しない", () => {
    expect(renderVoiceSummaryHtml("# 問い\n\n<script>alert(1)</script>")).not.toContain(
      "<script>"
    );
  });
});

describe("extractSummaryLead", () => {
  it("最初の # 見出しと直後の段落を取り出す（太字は外す）", () => {
    expect(extractSummaryLead(VALID)).toEqual({
      question: "若者が佐賀市で未来を描き、活躍し続けるには？",
      lead: "進学や就職をきっかけに市外へ出る理由として、学びや仕事の選択肢の少なさが挙がっています。",
    });
  });

  it("見出しがなければ両方 null", () => {
    expect(extractSummaryLead("段落だけ")).toEqual({
      question: null,
      lead: null,
    });
  });

  it("見出しの直後が段落でなければ lead は null", () => {
    expect(extractSummaryLead("# 問い\n\n> 引用から始まる")).toEqual({
      question: "問い",
      lead: null,
    });
  });

  it("空文字なら両方 null", () => {
    expect(extractSummaryLead("")).toEqual({ question: null, lead: null });
  });
});
