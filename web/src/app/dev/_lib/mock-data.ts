import type { BillWithContent } from "@/features/bills/shared/types";
import type { InterviewReportViewData } from "@/features/interview-session/shared/schemas";

const baseBill: BillWithContent = {
  id: "mock-bill-001",
  name: "サンプル施策",
  slug: "mock-policy-001",
  department: "こども未来部",
  contact: "kodomo@example.jp",
  is_featured: false,
  thumbnail_url: null,
  share_thumbnail_url: null,
  parent_policy_id: null,
  sort_order: 0,
  related_links: [],
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

/** まとめ確認モーダル（STEP 1）の表示確認用のまとめ */
export const mockInterviewReport: InterviewReportViewData = {
  summary:
    "結婚2年目、今年30歳になるのを機に子どもがほしいと思いはじめたが、仕事がバリバリで疲れてしんどく、妊娠・出産に意識を向ける時間がとれない状況",
  final_text:
    "結婚して2年が経ち、今年30歳になるのを機に、そろそろ子どもがほしいと話すようになりました。ただ、仕事はまだバリバリやっていて、妊娠や出産のことに意識を向けるのがなかなか難しい状況です。時間がとれないし、疲れてしんどいというのが正直なところです。子育ての前に、妊娠・出産という段階があるのに、そこに向き合う余裕がない、というのが今いちばん気になっていることです。",
  role_title: "会社員（既婚）",
  role_description:
    "結婚2年目で、今年30歳になる。仕事を精力的にこなしながら、子どもを持つことを意識し始めている。",
  opinions: [
    {
      title: "妊娠・出産に向き合う時間がほしい",
      content:
        "仕事が忙しく、妊娠や出産について考えたり調べたりする時間がとれない。",
      source_message_id: null,
      contextual_quote: null,
      richness: null,
      concern: null,
      proposal: null,
      reasoning_types: null,
    },
  ],
};
