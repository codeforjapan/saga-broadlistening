import { describe, expect, it } from "vitest";
import { buildPublicTopicAnalysis } from "./build-public-topic-analysis";
import type { RawOpinionRow, RawTopicRow } from "./public-types";

const meta = {
  interview_config_id: "config-1",
  version: 3,
  generated_at: "2026-06-09T00:00:00.000Z",
};

/** デフォルト「表示可能」な論点行を作る。 */
function op(overrides: Partial<RawOpinionRow> = {}): RawOpinionRow {
  return {
    id: "o1",
    opinion_id: "op1",
    created_at: "2026-06-09T00:00:00.000Z",
    title: "t",
    content: "c",
    contextual_quote: "q",
    source_message_id: null,
    richness: null,
    review_status: "published",
    moderation_status: "ok",
    role_title: null,
    ...overrides,
  };
}

function topic(id: string, opinions: RawOpinionRow[]): RawTopicRow {
  return { id, title: `title-${id}`, description: `desc-${id}`, opinions };
}

describe("buildPublicTopicAnalysis（§8 表示時フィルタ）", () => {
  it("未公開・非公開・モデレーションNG/警告の論点を除外する", () => {
    const result = buildPublicTopicAnalysis(meta, [
      topic("t0", [
        op({ id: "ok" }),
        op({ id: "pending", review_status: "pending_review" }),
        op({ id: "hidden", review_status: "hidden" }),
        op({ id: "ng", moderation_status: "ng" }),
        op({ id: "warning", moderation_status: "warning" }),
        op({ id: "null-mod", moderation_status: null }),
      ]),
    ]);
    expect(result.topics).toHaveLength(1);
    const ids = result.topics[0].opinions.map((o) => o.id);
    expect(ids).toEqual(["ok"]);
    expect(result.topics[0].opinion_count).toBe(1);
    expect(result.total_opinions).toBe(1);
  });

  it("フィルタ後に0件のトピックはカードを作らない", () => {
    const result = buildPublicTopicAnalysis(meta, [
      topic("t0", [op({ id: "a" })]),
      topic("t1", [op({ id: "b", review_status: "hidden" })]),
    ]);
    expect(result.topics.map((t) => t.id)).toEqual(["t0"]);
  });

  it("件数をフィルタ後集合から再計算する", () => {
    const result = buildPublicTopicAnalysis(meta, [
      topic("t0", [
        op({ id: "a" }),
        op({ id: "b" }),
        // 除外される（カウントに含めない）
        op({ id: "x", review_status: "pending_review" }),
      ]),
    ]);
    expect(result.topics[0].opinion_count).toBe(2);
    expect(result.total_opinions).toBe(2);
  });

  it("question_snippet は 4a では null 固定", () => {
    const result = buildPublicTopicAnalysis(meta, [topic("t0", [op()])]);
    expect(result.topics[0].opinions[0].question_snippet).toBeNull();
  });

  it("role_title を意見カードに引き継ぐ（引用の属性表示用）", () => {
    const result = buildPublicTopicAnalysis(meta, [
      topic("t0", [op({ id: "a", role_title: "育休経験者" })]),
    ]);
    expect(result.topics[0].opinions[0].role_title).toBe("育休経験者");
  });

  it("表示される論点は必ず公開済み（opinion_public=true）", () => {
    const result = buildPublicTopicAnalysis(meta, [
      topic("t0", [
        op({ id: "a" }),
        // 未公開はそもそも表示対象から除外される
        op({ id: "b", review_status: "pending_review" }),
      ]),
    ]);
    const ids = result.topics[0].opinions.map((o) => o.id);
    expect(ids).toEqual(["a"]);
    expect(result.topics[0].opinions.every((o) => o.opinion_public)).toBe(true);
  });

  it("全トピックが空なら topics 空・total 0、meta は保持", () => {
    const result = buildPublicTopicAnalysis(meta, [
      topic("t0", [op({ review_status: "hidden" })]),
    ]);
    expect(result.topics).toEqual([]);
    expect(result.total_opinions).toBe(0);
    expect(result.version).toBe(3);
    expect(result.interview_config_id).toBe("config-1");
    expect(result.generated_at).toBe("2026-06-09T00:00:00.000Z");
  });

  it("論点を richness 降順で並べ、null は最後尾にする", () => {
    const result = buildPublicTopicAnalysis(meta, [
      topic("t0", [
        op({ id: "low", richness: 10 }),
        op({ id: "none", richness: null }),
        op({ id: "high", richness: 90 }),
        op({ id: "mid", richness: 50 }),
      ]),
    ]);
    expect(result.topics[0].opinions.map((o) => o.id)).toEqual([
      "high",
      "mid",
      "low",
      "none",
    ]);
  });

  it("richness 同点は元順序を保つ（安定ソート）", () => {
    const result = buildPublicTopicAnalysis(meta, [
      topic("t0", [
        op({ id: "a", richness: 50 }),
        op({ id: "b", richness: 50 }),
        op({ id: "c", richness: 50 }),
      ]),
    ]);
    expect(result.topics[0].opinions.map((o) => o.id)).toEqual(["a", "b", "c"]);
  });

  it("richness を PublicOpinion に引き継ぐ", () => {
    const result = buildPublicTopicAnalysis(meta, [
      topic("t0", [op({ id: "a", richness: 77 })]),
    ]);
    expect(result.topics[0].opinions[0].richness).toBe(77);
  });

  it("件数集計は richness ソートの影響を受けない", () => {
    const result = buildPublicTopicAnalysis(meta, [
      topic("t0", [
        op({ id: "a", richness: 10 }),
        op({ id: "b", richness: 90 }),
      ]),
    ]);
    expect(result.topics[0].opinion_count).toBe(2);
  });
});

describe("buildPublicTopicAnalysis のトピック順", () => {
  // 2階層化で topic.sort_order の意味が「全トピックの件数降順」から
  // 「大トピック → 配下の中トピック」の深さ優先順に変わった。公開ページは
  // フラット表示なので、ここで件数降順に戻さないと web の並びが黙って変わる。
  it("件数降順に並べる（入力の sort_order 順ではない）", () => {
    const result = buildPublicTopicAnalysis(meta, [
      topic("mid", [op({ id: "a" }), op({ id: "b" })]),
      topic("few", [op({ id: "c" })]),
      topic("many", [op({ id: "d" }), op({ id: "e" }), op({ id: "f" })]),
    ]);

    expect(result.topics.map((t) => t.id)).toEqual(["many", "mid", "few"]);
    expect(result.topics.map((t) => t.opinion_count)).toEqual([3, 2, 1]);
  });

  it("同数なら入力順（sort_order 順）を保つ", () => {
    const result = buildPublicTopicAnalysis(meta, [
      topic("first", [op({ id: "a" })]),
      topic("second", [op({ id: "b" })]),
      topic("third", [op({ id: "c" })]),
    ]);

    expect(result.topics.map((t) => t.id)).toEqual([
      "first",
      "second",
      "third",
    ]);
  });

  // 大トピックは論点を直接持たないので、論点0件のトピックとして落ちる。
  it("論点0件のトピック（大トピック）は含めない", () => {
    const result = buildPublicTopicAnalysis(meta, [
      topic("big", []),
      topic("leaf", [op({ id: "a" })]),
    ]);

    expect(result.topics.map((t) => t.id)).toEqual(["leaf"]);
  });
});
