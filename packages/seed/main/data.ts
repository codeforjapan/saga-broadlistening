import { randomUUID } from "node:crypto";
import type { Database } from "@mirai-gikai/supabase";
import { withDefaults } from "../shared/insert-seed";
import { pickRespondent } from "../shared/respondents";
import { BULK_OPINION_CONFIG_SLUG } from "./bulk-opinion-data";
import type { OpinionSeed, SeededInterviewSession } from "./seed-types";

type PolicyInsert = Database["public"]["Tables"]["policies"]["Insert"];
type TagInsert = Database["public"]["Tables"]["tags"]["Insert"];
type PoliciesTagsInsert =
  Database["public"]["Tables"]["policies_tags"]["Insert"];
type PoliciesInterviewConfigsInsert =
  Database["public"]["Tables"]["policies_interview_configs"]["Insert"];
type InterviewConfigInsert =
  Database["public"]["Tables"]["interview_configs"]["Insert"];
type InterviewQuestionInsert =
  Database["public"]["Tables"]["interview_questions"]["Insert"];
type InterviewMessageInsert =
  Database["public"]["Tables"]["interview_messages"]["Insert"];
type OpinionReactionInsert =
  Database["public"]["Tables"]["opinion_reactions"]["Insert"];
type ChatSessionInsert =
  Database["public"]["Tables"]["chat_sessions"]["Insert"];
type ChatMessageInsert =
  Database["public"]["Tables"]["chat_messages"]["Insert"];

/**
 * 対話に使うモデル。
 * `packages/shared` の DEFAULT_INTERVIEW_CHAT_MODEL と同じ値。
 * seed から shared へ依存を増やしたくないため定数を複製している。
 */
export const DEFAULT_CHAT_MODEL = "anthropic/claude-haiku-4.5";

/** 施策に紐づく標準の意見募集 */
export const DEFAULT_CONFIG_SLUG = "default-theme";
/** 施策 0 件の抽象テーマ型（下書き） */
export const ABSTRACT_CONFIG_SLUG = "machi-no-mirai";
/** 募集終了済みの意見募集 */
export const CLOSED_CONFIG_SLUG = "kyushoku-2025";

// タグデータ
export const tags: TagInsert[] = [
  {
    label: "エネルギー・環境",
    description: "エネルギー政策、環境保護、気候変動対策に関する施策",
    featured_priority: 1,
  },
  {
    label: "子育て・教育",
    description: "子育て支援、教育政策、若者支援に関する施策",
    featured_priority: 2,
  },
  {
    label: "選挙・政治改革",
    description: "選挙制度、政治改革、民主主義の強化に関する施策",
    featured_priority: 3,
  },
];

/** NOT NULL かつ DEFAULT を持つカラムの既定値（withDefaults の説明を参照） */
const POLICY_DEFAULTS = {
  is_featured: false,
  enable_ai_chat: false,
} satisfies Partial<PolicyInsert>;

const policySeeds: PolicyInsert[] = [
  {
    name: "ガソリン税暫定税率廃止法案",
    slug: "gasoline-tax",
    department: "総務部 税制課",
    contact: "税制課（代表電話の内線 1234）",
    publish_status: "published",
    published_at: "2025-08-01T09:00:00+09:00",
    is_featured: true,
    thumbnail_url: "https://placehold.co/600x400.png",
    knowledge_source: "この施策についてあなたの意見を聞かせてください。",
    enable_ai_chat: true,
  },
  {
    name: "こども家庭庁予算大幅増額法案",
    slug: "kodomo-katei-budget",
    department: "こども未来部 こども政策課",
    contact: "こども政策課（代表電話の内線 2345）",
    publish_status: "published",
    published_at: "2025-01-20T10:00:00+09:00",
    is_featured: true,
    thumbnail_url: "https://placehold.co/600x400.png",
  },
  {
    name: "18歳選挙権完全実施法案",
    slug: "voting-age-18",
    department: "選挙管理委員会事務局",
    contact: "選挙管理委員会事務局（代表電話の内線 3456）",
    publish_status: "published",
    published_at: "2025-02-01T09:00:00+09:00",
    is_featured: false,
    thumbnail_url: "https://placehold.co/600x400.png",
  },
  {
    name: "学校給食無償化促進法案",
    slug: "school-lunch-free",
    department: "教育委員会 学校教育課",
    contact: "学校教育課（代表電話の内線 4567）",
    publish_status: "published",
    published_at: "2025-01-10T09:00:00+09:00",
    is_featured: false,
    thumbnail_url: "https://placehold.co/600x400.png",
  },
  // 一覧のデザイン確認用の追加施策 - ループで生成
  ...Array.from({ length: 4 }, (_, i) => ({
    name: `学校給食無償化促進法案（第${i + 2}号）`,
    slug: `school-lunch-free-${i + 2}`,
    department: "教育委員会 学校教育課",
    contact: "学校教育課（代表電話の内線 4567）",
    publish_status: "published" as const,
    published_at: `2025-08-0${i + 1}T09:00:00+09:00`,
    is_featured: false,
    thumbnail_url: "https://placehold.co/600x400.png",
  })),
  {
    name: "船荷証券の電子化に関する法律案",
    slug: "denshi-bl-policy",
    department: "経済部 産業政策課",
    contact: "産業政策課（代表電話の内線 5678）",
    publish_status: "published",
    published_at: "2025-09-15T09:00:00+09:00",
    is_featured: false,
    thumbnail_url: "https://placehold.co/600x400.png",
    knowledge_source:
      "船荷証券（B/L）の電子化に関する施策について、あなたの意見を聞かせてください。",
    enable_ai_chat: true,
  },
  // 下書き状態の施策（公開前プレビューの確認用。published_at は持たない）
  {
    name: "中学生・高校生向けプログラミング教育必修化法案",
    slug: "programming-education",
    department: "教育委員会 学校教育課",
    contact: "学校教育課（代表電話の内線 4567）",
    publish_status: "draft",
    is_featured: false,
    thumbnail_url: "https://placehold.co/600x400.png",
  },
];

export const policies: PolicyInsert[] = withDefaults(
  POLICY_DEFAULTS,
  policySeeds
);

/** AI質問機能を有効にした施策の名前（run.ts のログ用） */
export const AI_CHAT_POLICY_NAME = "ガソリン税暫定税率廃止法案";

// 施策とタグの関連付け
export function createPoliciesTags(
  insertedPolicies: { id: string; name: string }[],
  insertedTags: { id: string; label: string }[]
): PoliciesTagsInsert[] {
  const policyTagMap: { [policyName: string]: string[] } = {
    ガソリン税暫定税率廃止法案: ["エネルギー・環境"],
    こども家庭庁予算大幅増額法案: ["子育て・教育"],
    "18歳選挙権完全実施法案": ["選挙・政治改革"],
    学校給食無償化促進法案: ["子育て・教育"],
    // 一覧のデザイン確認用の追加施策
    ...Object.fromEntries(
      Array.from({ length: 4 }, (_, i) => [
        `学校給食無償化促進法案（第${i + 2}号）`,
        ["子育て・教育"],
      ])
    ),
    船荷証券の電子化に関する法律案: ["エネルギー・環境"],
    "中学生・高校生向けプログラミング教育必修化法案": ["子育て・教育"],
  };

  const policiesTags: PoliciesTagsInsert[] = [];

  for (const policy of insertedPolicies) {
    const tagLabels = policyTagMap[policy.name] || [];
    for (const tagLabel of tagLabels) {
      const tag = insertedTags.find((t) => t.label === tagLabel);
      if (tag) {
        policiesTags.push({ policy_id: policy.id, tag_id: tag.id });
      }
    }
  }

  return policiesTags;
}

/**
 * 施策と意見募集の紐付け（多対多）。
 * デモとして以下のパターンを網羅する。
 * - 1 施策に 2 つの意見募集（ガソリン税）
 * - 1 つの意見募集に 2 施策（船荷証券の電子化）
 * - 意見募集を持たない施策（18歳選挙権など）
 * - 施策を持たない意見募集（抽象テーマ型 = ABSTRACT_CONFIG_SLUG）
 */
const policyConfigSlugMap: { [policyName: string]: string[] } = {
  ガソリン税暫定税率廃止法案: [DEFAULT_CONFIG_SLUG, BULK_OPINION_CONFIG_SLUG],
  船荷証券の電子化に関する法律案: [BULK_OPINION_CONFIG_SLUG],
  学校給食無償化促進法案: [CLOSED_CONFIG_SLUG],
};

export function createPoliciesInterviewConfigs(
  insertedPolicies: { id: string; name: string }[],
  configIdBySlug: Map<string, string>
): PoliciesInterviewConfigsInsert[] {
  const links: PoliciesInterviewConfigsInsert[] = [];

  for (const policy of insertedPolicies) {
    for (const slug of policyConfigSlugMap[policy.name] ?? []) {
      const configId = configIdBySlug.get(slug);
      if (!configId) {
        throw new Error(`Interview config not found for slug: ${slug}`);
      }
      links.push({ policy_id: policy.id, interview_config_id: configId });
    }
  }

  return links;
}

// 標準の意見募集（施策に紐づく募集中のテーマ）
export function createInterviewConfig(): InterviewConfigInsert {
  return {
    name: "デフォルト設定",
    slug: DEFAULT_CONFIG_SLUG,
    description: "施策について感じていることを自由に伺うテーマ",
    status: "open",
    chat_model: DEFAULT_CHAT_MODEL,
    estimated_duration: 10,
    starts_at: "2025-08-01T00:00:00+09:00",
  };
}

/**
 * 状態の網羅確認用の意見募集。
 * - 抽象テーマ型（施策 0 件）かつ下書き
 * - 募集終了済み
 */
/** NOT NULL かつ DEFAULT を持つカラムの既定値（withDefaults の説明を参照） */
export const INTERVIEW_CONFIG_DEFAULTS = {
  deliberation_enabled: false,
} satisfies Partial<InterviewConfigInsert>;

export const additionalInterviewConfigs: InterviewConfigInsert[] = [
  {
    name: "まちの未来について",
    slug: ABSTRACT_CONFIG_SLUG,
    description:
      "特定の施策に紐づかない、まちづくり全般について広く意見を伺うテーマ",
    status: "draft",
    chat_model: DEFAULT_CHAT_MODEL,
    estimated_duration: 15,
    deliberation_enabled: true,
  },
  {
    name: "学校給食の無償化について",
    slug: CLOSED_CONFIG_SLUG,
    description: "学校給食の無償化について意見を伺ったテーマ（募集終了）",
    status: "closed",
    chat_model: DEFAULT_CHAT_MODEL,
    estimated_duration: 10,
    starts_at: "2025-01-10T00:00:00+09:00",
    ends_at: "2025-03-31T23:59:59+09:00",
  },
];

// インタビュー質問を作成
export function createInterviewQuestions(
  interviewConfigId: string
): Omit<InterviewQuestionInsert, "id" | "created_at" | "updated_at">[] {
  return [
    {
      interview_config_id: interviewConfigId,
      question: "この施策について、まず率直に感じたことを教えてください。",
      follow_up_guide: "回答者の関心のありかを明確にしてください。",
      quick_replies: [
        "暮らしに関係がありそう",
        "気になる点がある",
        "まだよく分からない",
      ],
      question_order: 1,
    },
    {
      interview_config_id: interviewConfigId,
      question: "そう感じる理由を教えてください。",
      follow_up_guide: "具体的な経験や背景を引き出してください。",
      quick_replies: null,
      question_order: 2,
    },
  ];
}

/** 対話の 5 パターン（意見あり 3 / 意見なし 1 / 途中離脱 1） */
const SESSION_PATTERN_COUNT = 5;
/** 上記パターンを何周させるか */
const SESSION_LOOP_COUNT = 20;

// インタビューセッションを作成（5パターン × 20回 = 100件）
export function createInterviewSessions(
  interviewConfigId: string,
  respondentIds: string[]
): SeededInterviewSession[] {
  const now = new Date();
  const sessions: SeededInterviewSession[] = [];

  for (let loop = 0; loop < SESSION_LOOP_COUNT; loop++) {
    const baseOffset = loop * 86400000 * 3; // 3日ずつずらす

    for (let pattern = 0; pattern < SESSION_PATTERN_COUNT; pattern++) {
      const index = loop * SESSION_PATTERN_COUNT + pattern;
      const startedAt = new Date(
        now.getTime() - baseOffset - (pattern + 1) * 3600000
      );

      sessions.push({
        id: randomUUID(),
        interview_config_id: interviewConfigId,
        // パターン4はイベント会場の共用端末からの回答という想定で user_id なし
        user_id: pattern === 3 ? null : pickRespondent(respondentIds, index),
        started_at: startedAt.toISOString(),
        // パターン5は途中離脱なので completed_at なし
        completed_at:
          pattern === 4
            ? null
            : new Date(startedAt.getTime() + 600000).toISOString(),
      });
    }
  }

  return sessions;
}

/** 対話パターンごとの会話ログ */
const conversations = [
  // パターン1: 期待を語る（意見あり）
  [
    {
      role: "assistant" as const,
      content: "この施策について、まず率直に感じたことを教えてください。",
    },
    { role: "user" as const, content: "暮らしに関係がありそうです。" },
    { role: "assistant" as const, content: "そう感じる理由を教えてください。" },
    {
      role: "user" as const,
      content:
        "毎日の生活費に直結する話なので、家計の負担が軽くなることを期待しています。",
    },
    {
      role: "assistant" as const,
      content: "ありがとうございました。ご意見を承りました。",
    },
  ],
  // パターン2: 懸念を語る（意見あり）
  [
    {
      role: "assistant" as const,
      content: "この施策について、まず率直に感じたことを教えてください。",
    },
    { role: "user" as const, content: "気になる点があります。" },
    { role: "assistant" as const, content: "そう感じる理由を教えてください。" },
    {
      role: "user" as const,
      content:
        "財源が不明確だと思います。将来の世代に負担が回らないか心配です。",
    },
    {
      role: "assistant" as const,
      content: "ありがとうございました。ご意見を承りました。",
    },
  ],
  // パターン3: 判断材料が足りない（意見あり）
  [
    {
      role: "assistant" as const,
      content: "この施策について、まず率直に感じたことを教えてください。",
    },
    { role: "user" as const, content: "まだよく分からないです。" },
    { role: "assistant" as const, content: "そう感じる理由を教えてください。" },
    {
      role: "user" as const,
      content: "もっと情報が必要だと思います。特に地域への影響が知りたいです。",
    },
    {
      role: "assistant" as const,
      content: "ありがとうございました。ご意見を承りました。",
    },
  ],
  // パターン4: 対話は完了したが意見は未作成
  [
    {
      role: "assistant" as const,
      content: "この施策について、まず率直に感じたことを教えてください。",
    },
    { role: "user" as const, content: "暮らしに関係がありそうです。" },
    { role: "assistant" as const, content: "そう感じる理由を教えてください。" },
    { role: "user" as const, content: "良い取り組みだと思います。" },
    {
      role: "assistant" as const,
      content: "ありがとうございました。ご意見を承りました。",
    },
  ],
  // パターン5: 進行中（途中で離脱）
  [
    {
      role: "assistant" as const,
      content: "この施策について、まず率直に感じたことを教えてください。",
    },
    { role: "user" as const, content: "うーん、ちょっと考えさせてください" },
  ],
];

// インタビューメッセージを作成（5パターンをループ）
export function createInterviewMessages(
  sessionIds: string[]
): Omit<InterviewMessageInsert, "id" | "created_at" | "updated_at">[] {
  const messages: Omit<
    InterviewMessageInsert,
    "id" | "created_at" | "updated_at"
  >[] = [];

  sessionIds.forEach((sessionId, sessionIndex) => {
    const conversation = conversations[sessionIndex % SESSION_PATTERN_COUNT];
    for (const msg of conversation) {
      messages.push({
        interview_session_id: sessionId,
        role: msg.role,
        content: msg.content,
      });
    }
  });

  return messages;
}

/** 会話ログのうち、意見の根拠になったユーザー発言の位置 */
const OPINION_SOURCE_TURN_INDEX = 3;

/** 意見あり 3 パターンのテンプレート（会話ログのパターン1〜3に対応） */
const opinionTemplates = [
  {
    final_text:
      "この施策は暮らしの安定に直結する重要な取り組みだと考えています。特に物価が上がり続けるなかで、家計への支援効果は大きいはずです。早く実現してほしいと思います。",
    summary:
      "暮らしの安定に寄与する施策として期待している。物価高に苦しむ家庭への支援効果が大きく、早期の実現を望む。",
    role_title: "一般市民",
    role_description: "施策の内容に期待している市民",
    moderation_score: 5,
    contentRichnessTotal: 62,
    segments: [
      {
        title: "家計への支援効果に期待している",
        content:
          "毎日の生活費に直結するため、家計の負担が軽くなることを期待している。",
        richness: 62,
      },
    ],
  },
  {
    final_text:
      "財源の確保が不透明で、将来世代への負担が増えないか心配しています。歳出の見直しや他の財源をきちんと検討したうえで、続けられる制度にしてほしいです。",
    summary:
      "財源の確保が不透明であり、将来世代への負担増大を懸念している。持続可能な制度設計を求めたい。",
    role_title: "会社員",
    role_description: "財政面を懸念する市民",
    moderation_score: 8,
    contentRichnessTotal: 55,
    segments: [
      {
        title: "財源が不明確なことが心配",
        content: "財源が不明確で、将来の世代に負担が回らないか心配している。",
        richness: 55,
      },
    ],
  },
  {
    final_text:
      "現時点では効果と副作用について十分な情報が示されていないと感じます。特に地域経済への影響や長期的な見通しについて、もっと詳しい説明がほしいです。",
    summary:
      "効果と副作用の情報が不足しており判断が難しい。地域経済への影響の分析を求めたい。",
    role_title: "自営業",
    role_description: "判断材料の不足を指摘する市民",
    moderation_score: 3,
    contentRichnessTotal: 48,
    segments: [
      {
        title: "判断するための情報が足りない",
        content: "もっと情報が必要で、特に地域への影響を知りたいと考えている。",
        richness: 48,
      },
    ],
  },
];

/**
 * 意見を作成（パターン1,2,3 のセッションのみ）。
 * パターン4は対話完了だが意見未作成、パターン5は進行中なので意見を作らない。
 */
export function createOpinions(sessionIds: string[]): OpinionSeed[] {
  const seeds: OpinionSeed[] = [];

  sessionIds.forEach((sessionId, index) => {
    const patternIndex = index % SESSION_PATTERN_COUNT;
    if (patternIndex >= opinionTemplates.length) return;

    const template = opinionTemplates[patternIndex];
    // 意見の根拠になったユーザー発言は会話ログから引く（本文の二重管理を避ける）
    const sourceMessageContent =
      conversations[patternIndex][OPINION_SOURCE_TURN_INDEX].content;
    const loopIndex = Math.floor(index / SESSION_PATTERN_COUNT);
    const isPublicByUser = loopIndex < 5;
    const isPublicByAdmin = loopIndex < 3;

    seeds.push({
      opinion: {
        interview_session_id: sessionId,
        final_text: template.final_text,
        summary: template.summary,
        role_title: template.role_title,
        role_description: template.role_description,
        // total_content_richness / moderation_status は生成列なので投入しない
        content_richness: { total: template.contentRichnessTotal },
        moderation_score: template.moderation_score,
        review_status: resolveReviewStatus(
          isPublicByUser,
          isPublicByAdmin,
          loopIndex
        ),
        is_public_by_user: isPublicByUser,
        is_public_by_admin: isPublicByAdmin,
        is_data_reuse_consented: loopIndex < 4,
      },
      segments: template.segments.map((segment, segmentIndex) => ({
        opinion_index: segmentIndex,
        title: segment.title,
        content: segment.content,
        richness: segment.richness,
        contextual_quote: sourceMessageContent,
        sourceMessageContent,
      })),
    });
  });

  return seeds;
}

/**
 * 公開状態の正本である review_status を決める。
 * 本人と職員の両方が公開に同意していれば published、
 * 職員が非公開にしたケース（loopIndex が大きいもの）は hidden とする。
 */
function resolveReviewStatus(
  isPublicByUser: boolean,
  isPublicByAdmin: boolean,
  loopIndex: number
): Database["public"]["Enums"]["opinion_review_status"] {
  if (isPublicByUser && isPublicByAdmin) return "published";
  return loopIndex >= 15 ? "hidden" : "pending_review";
}

// デモ用の固定ID（web の /report/{id} の動作確認に使う）
export const DEMO_SESSION_ID = "00000000-0000-0000-0000-000000000001";
export const DEMO_OPINION_ID = "00000000-0000-0000-0000-000000000001";

// 立場の書き分けを確認するためのデモ用ID
export const DEMO_SESSION_ID_WORK = "00000000-0000-0000-0000-000000000002";
export const DEMO_SESSION_ID_DAILY = "00000000-0000-0000-0000-000000000003";
export const DEMO_SESSION_ID_CITIZEN = "00000000-0000-0000-0000-000000000004";
export const DEMO_OPINION_ID_WORK = "00000000-0000-0000-0000-000000000002";
export const DEMO_OPINION_ID_DAILY = "00000000-0000-0000-0000-000000000003";
export const DEMO_OPINION_ID_CITIZEN = "00000000-0000-0000-0000-000000000004";

// デモ用のインタビューセッション（公開、固定ID）
export function createDemoSession(
  interviewConfigId: string,
  respondentIds: string[]
): SeededInterviewSession {
  const now = new Date();
  return {
    id: DEMO_SESSION_ID,
    interview_config_id: interviewConfigId,
    user_id: pickRespondent(respondentIds, 0),
    started_at: new Date(now.getTime() - 3600000).toISOString(),
    completed_at: new Date(now.getTime() - 3000000).toISOString(),
    rating: 5,
  };
}

const DEMO_SOURCE_MESSAGE =
  "省庁のレスポンスの速さや、官僚の長時間労働が削減され、よりよい人材が官僚になっていく事を期待しています。";

// デモ用のインタビューメッセージ
export function createDemoMessages(): Omit<
  InterviewMessageInsert,
  "id" | "created_at" | "updated_at"
>[] {
  return [
    {
      interview_session_id: DEMO_SESSION_ID,
      role: "assistant",
      content:
        "こんにちは！本日はインタビューにご協力いただきありがとうございます。\n\n佐賀市では、今後の市政の重点的な取り組みをまとめた計画を策定しようとしています。今後の市政に期待する内容や、アイデア、意見について率直なご意見をお聞かせください。佐賀市はどのようなことに取り組んでいくと良いと思いますか？",
    },
    {
      interview_session_id: DEMO_SESSION_ID,
      role: "user",
      content: "行政手続のデジタル化や、ムダの削減を達成して欲しい",
    },
    {
      interview_session_id: DEMO_SESSION_ID,
      role: "assistant",
      content:
        "なるほど。窓口のレスポンス速度の向上と、職員の長時間労働の削減を通じて、より優秀な人材が市役所を志望する好循環を期待されているということですね。とても重要な指摘だと思います。\n\nそうした働き方改革や人材確保という視点から見たとき、佐賀市がこれまで進めてきた行政のデジタル化や情報公開の取り組みは、今のあなたの期待にどの程度応えていると評価されますか？",
    },
    {
      interview_session_id: DEMO_SESSION_ID,
      role: "user",
      content: DEMO_SOURCE_MESSAGE,
    },
    {
      interview_session_id: DEMO_SESSION_ID,
      role: "assistant",
      content: "ありがとうございました。ご意見を承りました。",
    },
  ];
}

// デモ用の意見（固定ID）
export function createDemoOpinion(): OpinionSeed {
  return {
    opinion: {
      id: DEMO_OPINION_ID,
      interview_session_id: DEMO_SESSION_ID,
      final_text:
        "行政手続のデジタル化による業務効率化や職員の働き方改革には期待していますが、システム移行時の混乱や事業者側の対応コスト増大についての懸念も大きいです。慎重に段階を踏んで進めてほしいと考えています。",
      summary:
        "デジタル化推進による業務効率化や働き方改革には期待するが、システム移行時の混乱や対応コスト増大について懸念も大きい。慎重な段階的導入を求める。",
      role_title: "フォワーダー",
      role_description:
        "中国航路担当のフォワーダー実務者\n業界経験20年\n船荷証券（B/L）手続きに日常的に関与",
      content_richness: { total: 78 },
      moderation_score: 4,
      review_status: "published",
      is_public_by_user: true,
      is_public_by_admin: true,
      is_data_reuse_consented: true,
    },
    segments: [
      {
        opinion_index: 0,
        title: "行政手続のデジタル化や、ムダの削減を達成して欲しい",
        content:
          "窓口のレスポンスの速さや、職員の長時間労働が削減され、よりよい人材が市役所に集まっていく事を期待している。",
        contextual_quote: DEMO_SOURCE_MESSAGE,
        richness: 78,
        sourceMessageContent: DEMO_SOURCE_MESSAGE,
      },
    ],
  };
}

/** 立場の書き分け確認用の追加デモデータ（セッション・会話・意見をまとめて持つ） */
const additionalDemoData = [
  {
    sessionId: DEMO_SESSION_ID_WORK,
    opinionId: DEMO_OPINION_ID_WORK,
    startedOffsetMs: 7200000,
    conversation: [
      {
        role: "assistant" as const,
        content:
          "こんにちは！本日はインタビューにご協力いただきありがとうございます。",
      },
      {
        role: "user" as const,
        content:
          "ガソリン価格の高騰で物流コストが上がっています。この施策には期待しています。",
      },
      {
        role: "assistant" as const,
        content:
          "物流業界で働かれている立場からのご意見ですね。具体的にどのような影響がありますか？",
      },
      {
        role: "user" as const,
        content:
          "運送会社を経営していますが、燃料費が経営を圧迫しています。暫定税率が廃止されて少しでも負担が減れば助かります。",
      },
      {
        role: "assistant" as const,
        content: "ありがとうございました。ご意見を承りました。",
      },
    ],
    opinion: {
      final_text:
        "燃料費の高騰が運送業界の経営を直撃しています。暫定税率の廃止による物流コストの削減は急務で、トラック1台あたりの年間燃料費が数十万円単位で変わるため、経営を続けられるかどうかに直結します。",
      summary:
        "燃料費高騰が運送業界の経営を直撃しており、暫定税率の廃止による物流コスト削減は急務。経営の持続可能性に直結する重要な施策だ。",
      role_title: "運送会社経営者",
      role_description:
        "運送会社経営者\n従業員50名規模\n燃料費高騰の影響を直接受けている",
      contentRichnessTotal: 71,
      moderationScore: 6,
      segmentTitle: "燃料費が経営を圧迫している",
      segmentContent:
        "運送会社を経営しているが、燃料費が経営を圧迫している。暫定税率が廃止されて少しでも負担が減れば助かる。",
      sourceMessageIndex: 3,
    },
  },
  {
    sessionId: DEMO_SESSION_ID_DAILY,
    opinionId: DEMO_OPINION_ID_DAILY,
    startedOffsetMs: 10800000,
    conversation: [
      {
        role: "assistant" as const,
        content:
          "こんにちは！本日はインタビューにご協力いただきありがとうございます。",
      },
      {
        role: "user" as const,
        content:
          "地方在住で車が生活必需品なので、ガソリン代が下がるのは嬉しいです。",
      },
      {
        role: "assistant" as const,
        content:
          "生活への影響が大きいとのことですね。どのような場面で車を使われますか？",
      },
      {
        role: "user" as const,
        content:
          "通勤や買い物、子供の送り迎えなど、毎日使っています。公共交通機関がほとんどない地域なので。",
      },
      {
        role: "assistant" as const,
        content: "ありがとうございました。ご意見を承りました。",
      },
    ],
    opinion: {
      final_text:
        "公共交通機関がほとんどない地域では車が唯一の移動手段です。ガソリン代の軽減は生活に直結します。子育て世帯として送り迎えや買い物で毎日車を使うので、家計の負担が軽くなることを強く望みます。",
      summary:
        "公共交通機関がほぼない地方では車は唯一の移動手段であり、ガソリン代の軽減は生活に直結する問題。家計への負担軽減を強く望んでいる。",
      role_title: "主婦",
      role_description:
        "地方在住の主婦\n車が唯一の移動手段\n子育て中で送り迎えに車を使用",
      contentRichnessTotal: 64,
      moderationScore: 2,
      segmentTitle: "車が生活必需品",
      segmentContent:
        "通勤や買い物、子供の送り迎えなど毎日車を使っている。公共交通機関がほとんどない地域なのでガソリン代が下がると助かる。",
      sourceMessageIndex: 3,
    },
  },
  {
    sessionId: DEMO_SESSION_ID_CITIZEN,
    opinionId: DEMO_OPINION_ID_CITIZEN,
    startedOffsetMs: 14400000,
    conversation: [
      {
        role: "assistant" as const,
        content:
          "こんにちは！本日はインタビューにご協力いただきありがとうございます。",
      },
      {
        role: "user" as const,
        content:
          "環境問題も気になりますが、今の物価高を考えると減税は必要だと思います。",
      },
      {
        role: "assistant" as const,
        content:
          "環境と経済のバランスを考えていらっしゃるのですね。どのような点が気になりますか？",
      },
      {
        role: "user" as const,
        content:
          "ガソリン車から電気自動車への移行も進めつつ、当面の生活支援として減税があってもいいと思います。",
      },
      {
        role: "assistant" as const,
        content: "ありがとうございました。ご意見を承りました。",
      },
    ],
    opinion: {
      final_text:
        "ガソリン税の減税は短期的には家計の支えになりますが、環境負荷の面では化石燃料への依存を長引かせる可能性もあります。EVの普及支援と組み合わせた総合的なエネルギー政策として検討してほしいです。",
      summary:
        "ガソリン税減税は短期的な家計支援になるが、環境負荷の観点からは懸念もある。EV普及支援策と組み合わせた総合的な政策として検討すべき。",
      role_title: "会社員",
      role_description:
        "会社員\n環境問題に関心あり\n電気自動車への乗り換えを検討中",
      contentRichnessTotal: 58,
      moderationScore: 3,
      segmentTitle: "環境と経済のバランス",
      segmentContent:
        "ガソリン車から電気自動車への移行も進めつつ、当面の生活支援として減税があってもいいと考える。",
      sourceMessageIndex: 3,
    },
  },
];

// 追加のデモ用セッション
export function createAdditionalDemoSessions(
  interviewConfigId: string,
  respondentIds: string[]
): SeededInterviewSession[] {
  const now = new Date();
  return additionalDemoData.map((demo, index) => ({
    id: demo.sessionId,
    interview_config_id: interviewConfigId,
    user_id: pickRespondent(respondentIds, index + 1),
    started_at: new Date(now.getTime() - demo.startedOffsetMs).toISOString(),
    completed_at: new Date(
      now.getTime() - demo.startedOffsetMs + 600000
    ).toISOString(),
  }));
}

// 追加のデモ用メッセージ
export function createAdditionalDemoMessages(): Omit<
  InterviewMessageInsert,
  "id" | "created_at" | "updated_at"
>[] {
  return additionalDemoData.flatMap((demo) =>
    demo.conversation.map((turn) => ({
      interview_session_id: demo.sessionId,
      role: turn.role,
      content: turn.content,
    }))
  );
}

/**
 * 追加のデモ用意見。
 * review_status は published / pending_review / hidden を1件ずつ割り当て、
 * 職員向けの絞り込み UI をデモできるようにしている。
 */
const additionalDemoReviewStatuses: Database["public"]["Enums"]["opinion_review_status"][] =
  ["published", "pending_review", "hidden"];

export function createAdditionalDemoOpinions(): OpinionSeed[] {
  return additionalDemoData.map((demo, index) => {
    const reviewStatus = additionalDemoReviewStatuses[index];
    const sourceMessageContent =
      demo.conversation[demo.opinion.sourceMessageIndex].content;

    return {
      opinion: {
        id: demo.opinionId,
        interview_session_id: demo.sessionId,
        final_text: demo.opinion.final_text,
        summary: demo.opinion.summary,
        role_title: demo.opinion.role_title,
        role_description: demo.opinion.role_description,
        content_richness: { total: demo.opinion.contentRichnessTotal },
        moderation_score: demo.opinion.moderationScore,
        review_status: reviewStatus,
        is_public_by_user: true,
        is_public_by_admin: reviewStatus === "published",
        is_data_reuse_consented: reviewStatus === "published",
      },
      segments: [
        {
          opinion_index: 0,
          title: demo.opinion.segmentTitle,
          content: demo.opinion.segmentContent,
          contextual_quote: sourceMessageContent,
          richness: demo.opinion.contentRichnessTotal,
          sourceMessageContent,
        },
      ],
    };
  });
}

/** 公開済みの意見に付けるリアクション（1意見あたり最大3件、ユーザーは重複させない） */
const REACTIONS_PER_OPINION = 3;
const reactionTypes = ["helpful", "helpful", "hmm"];

export function createOpinionReactions(
  publishedOpinionIds: string[],
  respondentIds: string[]
): OpinionReactionInsert[] {
  if (respondentIds.length === 0) return [];

  const reactions: OpinionReactionInsert[] = [];
  // unique(opinion_id, user_id) があるため、1意見あたりの件数はプール数で頭打ちにする
  const reactionCount = Math.min(REACTIONS_PER_OPINION, respondentIds.length);

  publishedOpinionIds.forEach((opinionId, opinionIndex) => {
    for (let i = 0; i < reactionCount; i++) {
      reactions.push({
        opinion_id: opinionId,
        user_id: respondentIds[(opinionIndex + i) % respondentIds.length],
        reaction_type: reactionTypes[i],
      });
    }
  });

  return reactions;
}

/** 施策ページの「AIに質問する」対話（enable_ai_chat が true の施策向け） */
const chatConversations = [
  [
    { role: "user" as const, message: "この施策は誰が対象になりますか？" },
    {
      role: "assistant" as const,
      message:
        "この施策は市内にお住まいのすべての方が対象です。特に自動車を日常的に利用される世帯への影響が大きいと想定されています。",
    },
  ],
  [
    { role: "user" as const, message: "いつから始まる予定ですか？" },
    {
      role: "assistant" as const,
      message:
        "開始時期は市議会での審議を経て決まります。現時点では次年度当初からの実施を目指して検討が進められています。",
    },
  ],
  [
    { role: "user" as const, message: "財源はどこから出るのでしょうか？" },
    {
      role: "assistant" as const,
      message:
        "財源については既存事業の見直しと国の交付金の活用が検討されています。詳細は担当課までお問い合わせください。",
    },
  ],
];

export function createChatSessions(
  policyId: string,
  respondentIds: string[]
): Omit<ChatSessionInsert, "id" | "created_at" | "updated_at">[] {
  return chatConversations.map((_, index) => ({
    policy_id: policyId,
    user_id: pickRespondent(respondentIds, index),
  }));
}

export function createChatMessages(
  sessionIds: string[]
): Omit<ChatMessageInsert, "id" | "created_at" | "updated_at">[] {
  return sessionIds.flatMap((sessionId, index) =>
    chatConversations[index % chatConversations.length].map((turn) => ({
      session_id: sessionId,
      role: turn.role,
      message: turn.message,
    }))
  );
}
