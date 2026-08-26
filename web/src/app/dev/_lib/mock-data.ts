import type { BillWithContent } from "@/features/bills/shared/types";

const baseBill: BillWithContent = {
  id: "mock-bill-001",
  name: "サンプル施策",
  slug: "mock-policy-001",
  department: "こども未来部",
  contact: "kodomo@example.jp",
  is_featured: false,
  approved_by: null,
  approved_at: "2026-02-15T00:00:00Z",
  thumbnail_url: null,
  share_thumbnail_url: null,
  published_at: "2026-02-15T00:00:00Z",
  publish_status: "published",
  knowledge_source: null,
  enable_ai_chat: false,
  created_at: "2026-02-15T00:00:00Z",
  updated_at: "2026-02-15T00:00:00Z",
  bill_content: {
    id: "mock-content-001",
    policy_id: "mock-bill-001",
    title: "サンプル施策のタイトル",
    summary:
      "この施策は開発プレビュー用のサンプルデータです。施策の要約文がここに表示されます。実際のデータではありません。",
    content: "# サンプルコンテンツ\n\n本文がここに入ります。",
    difficulty_level: "normal",
    created_at: "2026-02-15T00:00:00Z",
    updated_at: "2026-02-15T00:00:00Z",
  },
  tags: [
    { id: "tag-1", label: "経済" },
    { id: "tag-2", label: "環境" },
  ],
};

export function createMockBill(
  overrides: Partial<BillWithContent> = {}
): BillWithContent {
  return {
    ...baseBill,
    ...overrides,
  };
}
