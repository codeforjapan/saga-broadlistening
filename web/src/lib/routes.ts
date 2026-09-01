/**
 * web アプリの内部ルート定義
 *
 * app/ ディレクトリの page.tsx と 1:1 対応する。
 * Link href や router.push には必ずこのファイルの関数を使うこと。
 * 新しいページを追加したらここにもルートを追加し、テストを通すこと。
 */

export const routes = {
  // ── 静的ルート ──────────────────────────────────────
  home: () => "/" as const,
  terms: () => "/terms" as const,
  privacy: () => "/privacy" as const,
  developers: () => "/developers" as const,
  developersOpenDataApi: () => "/developers/open-data-api" as const,
  interviewDataTerms: () => "/developers/interview-data-terms" as const,

  // ── 施策 ──────────────────────────────────────────
  billDetail: (billId: string) => `/bills/${billId}` as const,
  billOpinions: (billId: string) => `/bills/${billId}/opinions` as const,
  billTopics: (billId: string) => `/bills/${billId}/topics` as const,
  billTopicDetail: (billId: string, topicId: string, filter?: string) =>
    filter && filter !== "all"
      ? (`/bills/${billId}/topics/${topicId}?filter=${encodeURIComponent(filter)}` as const)
      : (`/bills/${billId}/topics/${topicId}` as const),

  // ── インタビュー ──────────────────────────────────
  interviews: () => "/interviews" as const,
  interviewLP: (billId: string) => `/bills/${billId}/interview` as const,
  interviewDisclosure: (billId: string) =>
    `/bills/${billId}/interview/disclosure` as const,
  interviewChat: (billId: string) => `/bills/${billId}/interview/chat` as const,

  // ── インタビュー（テーマ単独。施策に紐づかない抽象テーマ型もここを通る） ──
  interviewThemeLP: (slug: string) => `/interviews/${slug}` as const,
  interviewThemeDisclosure: (slug: string) =>
    `/interviews/${slug}/disclosure` as const,
  interviewThemeChat: (slug: string) => `/interviews/${slug}/chat` as const,
  interviewThemeTopics: (slug: string) => `/interviews/${slug}/topics` as const,
  interviewThemeTopicDetail: (slug: string, topicId: string) =>
    `/interviews/${slug}/topics/${topicId}` as const,

  // ── プレビュー（token 付き） ──────────────────────
  previewBillDetail: (billId: string, token: string) =>
    `/preview/bills/${billId}?token=${encodeURIComponent(token)}` as const,
  previewInterviewLP: (billId: string, token: string) =>
    `/preview/bills/${billId}/interview?token=${encodeURIComponent(token)}` as const,
  previewInterviewDisclosure: (billId: string, token: string) =>
    `/preview/bills/${billId}/interview/disclosure?token=${encodeURIComponent(token)}` as const,
  previewInterviewChat: (billId: string, token: string) =>
    `/preview/bills/${billId}/interview/chat?token=${encodeURIComponent(token)}` as const,

  // ── レポート ──────────────────────────────────────
  publicReport: (reportId: string) => `/report/${reportId}` as const,
  reportComplete: (reportId: string) => `/report/${reportId}/complete` as const,
  legacyReportChatLog: (reportId: string) =>
    `/report/${reportId}/chat-log` as const,
} as const;
