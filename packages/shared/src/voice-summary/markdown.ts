import type { Root, RootContent } from "mdast";
import rehypeSanitize, { type Options as SanitizeSchema } from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";

/**
 * みんなの声のまとめ（theme_voice_summaries.content_md）の記法（Epic #162 / #160）。
 *
 * 公開画面では Markdown をそのまま描画するので、使える記法を8つに絞る:
 *   # 見出し（冒頭に1つだけ）／## 見出し／### 小見出し／- 箇条書き／1. 番号つき／
 *   **太字**／> 引用／段落
 * 表・画像・リンク・コード・HTML・#### 以下の見出し・斜体などは使わない。
 * AI の生成直後と admin の保存時の両方でこの検証を通す。
 */

const ALLOWED_BLOCKS = new Set([
  "heading",
  "paragraph",
  "list",
  "listItem",
  "blockquote",
]);
const ALLOWED_INLINES = new Set(["text", "strong", "break"]);

const NODE_LABELS: Record<string, string> = {
  code: "コード",
  inlineCode: "コード",
  html: "HTML",
  image: "画像",
  imageReference: "画像",
  link: "リンク",
  linkReference: "リンク",
  definition: "リンクの定義",
  emphasis: "斜体（*〜* / _〜_）",
  delete: "取り消し線",
  thematicBreak: "区切り線（---）",
  table: "表",
};

export type VoiceSummaryValidation =
  | { ok: true }
  | { ok: false; errors: string[] };

function parse(markdown: string): Root {
  return unified().use(remarkParse).parse(markdown);
}

function walk(node: RootContent, errors: Set<string>, depth: number) {
  if (node.type === "heading") {
    if (node.depth > 3) {
      errors.add("見出しは # / ## / ### までにしてください（#### 以下は使えません）");
    }
  } else if (!ALLOWED_BLOCKS.has(node.type) && !ALLOWED_INLINES.has(node.type)) {
    errors.add(
      `使えない記法があります: ${NODE_LABELS[node.type] ?? node.type}`
    );
    return;
  }
  if (node.type === "list" && depth > 0) {
    errors.add("入れ子の箇条書きは使えません");
  }
  if ("children" in node) {
    for (const child of node.children as RootContent[]) {
      walk(child, errors, node.type === "list" ? depth + 1 : depth);
    }
  }
}

/** 記法の検証。問題がなければ ok、あればエラーメッセージ（重複なし）を返す */
export function validateVoiceSummaryMarkdown(
  markdown: string
): VoiceSummaryValidation {
  const errors = new Set<string>();
  const root = parse(markdown);

  if (root.children.length === 0) {
    return { ok: false, errors: ["本文を入力してください"] };
  }

  const first = root.children[0];
  if (first.type !== "heading" || first.depth !== 1) {
    errors.add("冒頭は # 見出し（問い）にしてください");
  }
  const h1Count = root.children.filter(
    (node) => node.type === "heading" && node.depth === 1
  ).length;
  if (h1Count > 1) {
    errors.add("# 見出しは冒頭に1つだけにしてください");
  }

  for (const node of root.children) {
    walk(node, errors, 0);
  }
  // GFM を使わないので、表は「| で始まり | で終わる行」の段落として読まれる。行の形で検出する
  if (/^\s*\|.*\|\s*$/m.test(markdown)) {
    errors.add(`使えない記法があります: ${NODE_LABELS.table}`);
  }

  return errors.size === 0 ? { ok: true } : { ok: false, errors: [...errors] };
}

/**
 * 描画で残すタグ。8つの記法に対応するものだけにし、属性は付けない（リンク・画像・表などは出さない）。
 * 本文が記法の検証を通っていなくても、公開画面に外部リンクや外部画像が出ないようにする。
 */
const RENDER_SCHEMA: SanitizeSchema = {
  tagNames: ["h1", "h2", "h3", "p", "ul", "ol", "li", "strong", "blockquote", "br"],
  attributes: {},
  strip: ["script", "style"],
};

/**
 * まとめの Markdown を HTML にする（web の公開画面と admin のプレビューで同じものを使う）。
 * 生の HTML は出力しない（remark-rehype の既定で捨てる）。記法の検証を通っていない本文
 * （手で入れた行・保存前のプレビューなど）でも、8つの記法以外のタグは残さない（RENDER_SCHEMA）。
 * スタイルは voice-summary.css の `.voice-summary-content` で当てる。
 */
export function renderVoiceSummaryHtml(markdown: string): string {
  return String(
    unified()
      .use(remarkParse)
      .use(remarkRehype)
      .use(rehypeSanitize, RENDER_SCHEMA)
      .use(rehypeStringify)
      .processSync(markdown)
  );
}

/**
 * 親ページ・きかせてページのプレビューに出す「問い」と「冒頭の段落」。
 * 最初の # 見出しと、その直後の段落を取り出す（どちらもなければ null）。
 */
export function extractSummaryLead(markdown: string): {
  question: string | null;
  lead: string | null;
} {
  const root = parse(markdown);
  const index = root.children.findIndex(
    (node) => node.type === "heading" && node.depth === 1
  );
  if (index === -1) {
    return { question: null, lead: null };
  }
  const next = root.children[index + 1];
  return {
    question: toPlainText(root.children[index]),
    lead: next?.type === "paragraph" ? toPlainText(next) : null,
  };
}

function toPlainText(node: RootContent): string {
  if (node.type === "text") return node.value;
  if ("children" in node) {
    return (node.children as RootContent[]).map(toPlainText).join("");
  }
  return "";
}
