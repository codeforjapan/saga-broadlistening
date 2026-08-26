import { describe, expect, it } from "vitest";
import {
  type OpenDataBillRow,
  toOpenDataBillDetail,
  toOpenDataBillItem,
} from "./to-open-data-bill";

const baseRow: OpenDataBillRow = {
  id: "123e4567-e89b-12d3-a456-426614174000",
  name: "テスト施策",
  slug: "test-policy",
  department: "こども未来部",
  contact: "kodomo@example.jp",
  published_at: "2026-01-15T00:00:00+00:00",
  created_at: "2026-01-01T00:00:00+00:00",
  policy_contents: [{ title: "わかりやすいタイトル", summary: "概要" }],
  policies_tags: [{ tags: { id: "tag-1", label: "経済" } }],
};

describe("toOpenDataBillItem", () => {
  it("施策行をAPIレスポンス形式に変換する", () => {
    expect(toOpenDataBillItem(baseRow)).toEqual({
      billId: "123e4567-e89b-12d3-a456-426614174000",
      name: "テスト施策",
      slug: "test-policy",
      title: "わかりやすいタイトル",
      summary: "概要",
      department: "こども未来部",
      contact: "kodomo@example.jp",
      publishedAt: "2026-01-15T00:00:00+00:00",
      tags: [{ id: "tag-1", label: "経済" }],
      createdAt: "2026-01-01T00:00:00+00:00",
    });
  });

  it("概要が未設定なら空文字にする", () => {
    const item = toOpenDataBillItem({
      ...baseRow,
      policy_contents: [{ title: "タイトル", summary: null }],
    });
    expect(item.summary).toBe("");
  });

  it("タグがない場合は空配列を返す", () => {
    const item = toOpenDataBillItem({ ...baseRow, policies_tags: [] });
    expect(item.tags).toEqual([]);
  });

  it("タグの参照が欠けている場合は除外する", () => {
    const item = toOpenDataBillItem({
      ...baseRow,
      policies_tags: [{ tags: null }, { tags: { id: "tag-2", label: "環境" } }],
    });
    expect(item.tags).toEqual([{ id: "tag-2", label: "環境" }]);
  });
});

describe("toOpenDataBillDetail", () => {
  it("一覧項目に本文（content）を加えて返す", () => {
    const detail = toOpenDataBillDetail({
      ...baseRow,
      policy_contents: [
        { title: "タイトル", summary: "概要", content: "# 本文" },
      ],
    });
    expect(detail.title).toBe("タイトル");
    expect(detail.content).toBe("# 本文");
  });
});
