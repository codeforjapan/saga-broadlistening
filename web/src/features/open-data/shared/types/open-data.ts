export type OpenDataMessage = {
  role: "assistant" | "user";
  content: string;
};

export type OpenDataInterviewItem = {
  opinionId: string;
  /** 意見募集（テーマ）のID */
  interviewConfigId: string;
  /** 意見募集（テーマ）名 */
  interviewConfigName: string;
  roleTitle: string | null;
  roleDescription: string | null;
  summary: string | null;
  /** 提出された意見の本文（見出しの下にトピックを並べた形） */
  finalText: string;
  messages: OpenDataMessage[];
  createdAt: string;
};

export type OpenDataInterviewsResult = {
  items: OpenDataInterviewItem[];
  nextCursor: string | null;
};
