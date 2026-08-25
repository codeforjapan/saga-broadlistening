// ── 分析（analyze）パイプライン ──

/** §8 フィルタ後の分析対象意見（opinion_segments 由来） */
export type TargetOpinion = {
  opinion_segment_id: string;
  opinion_id: string;
  opinion_index: number;
  title: string;
  content: string;
  contextual_quote: string | null;
  richness: number | null;
  // 増分トピック分析用: トピック抽出済みなら時刻、未抽出(新規)なら null。
  topic_extracted_at: string | null;
};

/** 既存 version から引き継ぐトピック（タイトル・説明・割当意見ID） */
export type ExistingTopic = {
  title: string;
  description: string;
  opinion_segment_ids: string[];
};

/** 意見募集に紐づく施策（プロンプトの接地用） */
export type PolicyContext = {
  name: string;
  summary: string | null;
  body: string | null;
};

/**
 * 意見募集（テーマ）コンテキスト（プロンプトの接地用）。
 * 施策0件の抽象テーマ型もあるため policies は空配列になり得る。
 */
export type InterviewConfigContext = {
  name: string;
  description: string | null;
  policies: PolicyContext[];
};

/** Phase1 で抽出されるトピック候補 / Phase2 の最終トピック（保存前） */
export type TopicDraft = {
  title: string;
  description: string;
};

/** Phase3 割当用に id を振った最終トピック（id は "t0","t1"... のローカルID） */
export type FinalTopicWithId = TopicDraft & {
  local_id: string;
};

/** 意見 → トピック割当結果（topic に該当しなければ topic_local_id = null） */
export type OpinionAssignment = {
  opinion_segment_id: string;
  topic_local_id: string | null;
};

/** topic_analysis_version.progress に格納するフェーズ間データ */
export type ProgressData = {
  context: InterviewConfigContext;
  target_opinions: TargetOpinion[];
  candidates?: TopicDraft[];
  final_topics?: FinalTopicWithId[];
};

// ── バックフィル（backfill）──

export type StoredMessage = {
  id: string;
  role: string;
  content: string;
};

export type ReextractionMessage = {
  role: string;
  content: string;
  id?: string;
};

export type BackfillTargetOpinion = {
  opinionId: string;
  sessionId: string;
};

export type ReextractResult = {
  opinionId: string;
  status: "updated" | "skipped" | "failed";
  reason?: string;
};
