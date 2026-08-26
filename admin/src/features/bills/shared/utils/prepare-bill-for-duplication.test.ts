import { describe, expect, it } from "vitest";
import type { Bill } from "../types";
import {
  prepareBillContentsForDuplication,
  prepareBillForDuplication,
} from "./prepare-bill-for-duplication";

const baseBill: Bill = {
  id: "bill-001",
  name: "テスト議案",
  slug: "test-bill",
  created_at: "2025-01-01T00:00:00Z",
  updated_at: "2025-01-02T00:00:00Z",
  department: "こども未来部",
  contact: "kodomo@example.jp",
  publish_status: "published",
  published_at: "2025-01-03T00:00:00Z",
  approved_by: "admin-001",
  approved_at: "2025-01-03T00:00:00Z",
  is_featured: true,
  knowledge_source: null,
  enable_ai_chat: true,
  thumbnail_url: null,
  share_thumbnail_url: null,
};

describe("prepareBillForDuplication", () => {
  it("id, created_at, updated_atを除去する", () => {
    const result = prepareBillForDuplication(baseBill, "new-slug");
    expect(result).not.toHaveProperty("id");
    expect(result).not.toHaveProperty("created_at");
    expect(result).not.toHaveProperty("updated_at");
  });

  it("名前に「(複製)」を付与する", () => {
    const result = prepareBillForDuplication(baseBill, "new-slug");
    expect(result.name).toBe("テスト議案 (複製)");
  });

  it("publish_statusをdraftに設定し、published_atをリセットする", () => {
    const result = prepareBillForDuplication(baseBill, "new-slug");
    expect(result.publish_status).toBe("draft");
    expect(result.published_at).toBeNull();
  });

  it("承認情報をリセットする", () => {
    const result = prepareBillForDuplication(baseBill, "new-slug");
    expect(result.approved_by).toBeNull();
    expect(result.approved_at).toBeNull();
  });

  it("渡されたslugを設定する", () => {
    const result = prepareBillForDuplication(baseBill, "new-slug");
    expect(result.slug).toBe("new-slug");
  });

  it("その他のフィールドを保持する", () => {
    const result = prepareBillForDuplication(baseBill, "new-slug");
    expect(result.department).toBe("こども未来部");
    expect(result.is_featured).toBe(true);
    expect(result.enable_ai_chat).toBe(true);
  });
});

describe("prepareBillContentsForDuplication", () => {
  const contents = [
    {
      id: "content-001",
      policy_id: "bill-001",
      title: "概要",
      content: "内容1",
      summary: "要約1",
      difficulty_level: "normal" as const,
      created_at: "2025-01-01T00:00:00Z",
      updated_at: "2025-01-01T00:00:00Z",
    },
    {
      id: "content-002",
      policy_id: "bill-001",
      title: "詳細",
      content: "内容2",
      summary: "要約2",
      difficulty_level: "hard" as const,
      created_at: "2025-01-01T00:00:00Z",
      updated_at: "2025-01-01T00:00:00Z",
    },
  ];

  it("id, policy_idを除去し新しいpolicy_idを設定する", () => {
    const result = prepareBillContentsForDuplication(contents, "new-bill-id");
    for (const item of result) {
      expect(item).not.toHaveProperty("id");
      expect(item.policy_id).toBe("new-bill-id");
    }
  });

  it("元のコンテンツデータを保持する", () => {
    const result = prepareBillContentsForDuplication(contents, "new-bill-id");
    expect(result).toHaveLength(2);
    expect(result[0].title).toBe("概要");
    expect(result[0].content).toBe("内容1");
    expect(result[1].title).toBe("詳細");
    expect(result[1].content).toBe("内容2");
  });

  it("空配列を渡すと空配列を返す", () => {
    const result = prepareBillContentsForDuplication([], "new-bill-id");
    expect(result).toEqual([]);
  });
});
