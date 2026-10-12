/**
 * AIインタビューのターン制御（純粋関数）。
 *
 * コードが持つのは外枠だけ: 発話の上限、話題の順番、話題ごとの発話予算、ステージ遷移、
 * 選択肢ボタン。深掘りするか・何を聞くか・早めに次へ移るかは LLM が予算の範囲で決める。
 */
import {
  DEFAULT_TURN_BUDGET,
  MAX_TURN_BUDGET,
  MIN_TURN_BUDGET,
  RESUME_MIN_REMAINING_TURNS,
  RESUME_TURN_BUDGET,
  SIDE_TURN_EXEMPT_PER_TOPIC,
  SKIP_QUESTION_REPLY,
  SUMMARY_RESERVE_TURNS,
  SUMMARY_START_TURN,
  TURN_LIMIT,
} from "./constants";
import { findPurposeStepTitle } from "./purpose-types/registry";
import type {
  InterviewSubjectKind,
  PurposeType,
  StepKind,
} from "./purpose-types/types";
import type {
  InterviewConfig,
  InterviewEndReason,
  InterviewQuestion,
  InterviewStage,
  SummaryPhase,
  PromptBillInput,
  SummaryResponse,
} from "./types";

/** summary から chat に戻ったときに開く話題の ID（interview_questions には無い） */
export const RESUME_TOPIC_ID = "resume";

/** 受け止めの質問に必ず含める選択肢 */
export const UNDECIDED_REPLY = "まだ決められない";

export interface TurnTopic {
  /** interview_questions.id（再開の話題は RESUME_TOPIC_ID） */
  id: string;
  /** プロンプトで使う短い ID（Q1, Q2 … / 再開は R） */
  label: string;
  title: string;
  kind: StepKind;
  turnBudget: number;
  required: boolean;
  hint: string | null;
  question: string;
  quickReplies: string[];
  /** interview_questions にある事前定義の話題か（再開の話題は false） */
  predefined: boolean;
}

/** 過去の assistant 発話から、ターン制御に使う部分だけを取り出したもの */
export interface AssistantTurnMeta {
  questionId: string | null;
  budgetExempt: boolean;
}

export interface TurnState {
  /** これまでのAIの発話数 */
  assistantTurn: number;
  /** TURN_LIMIT までの残り */
  remainingTurns: number;
  /** いまの話題（話題が1つもない設定では null） */
  current: TurnTopic | null;
  /** いまの話題で使える発話（今回を含む） */
  left: number;
  next: TurnTopic | null;
  /** まだ聞いていない必須の話題（いまの話題より後） */
  remainingRequired: TurnTopic[];
  /** まだ聞いていない任意の話題（いまの話題より後。聞くかはシステムが決める） */
  pendingOptional: TurnTopic[];
  /** これまでに聞いた話題の ID */
  askedIds: Set<string>;
}

function clampBudget(value: number | null | undefined): number {
  if (value == null || !Number.isFinite(value)) return DEFAULT_TURN_BUDGET;
  return Math.min(MAX_TURN_BUDGET, Math.max(MIN_TURN_BUDGET, Math.trunc(value)));
}

/** interview_questions の並びを、ターン制御の話題にする */
export function buildTurnTopics(
  questions: InterviewQuestion[],
  {
    purposeType,
    subject,
  }: { purposeType: PurposeType | null; subject: InterviewSubjectKind }
): TurnTopic[] {
  return questions.map((q, index) => ({
    id: q.id,
    label: `Q${index + 1}`,
    title:
      findPurposeStepTitle(purposeType, subject, q.step_key) ??
      `質問${index + 1}`,
    kind: q.step_kind ?? "episode",
    turnBudget: clampBudget(q.turn_budget),
    required: q.required ?? true,
    hint: q.hint?.trim() || null,
    question: q.question,
    quickReplies: (q.quick_replies ?? []).filter((r) => r.trim().length > 0),
    predefined: true,
  }));
}

/** 意見募集の設定（目的）と施策の有無から、話題を組み立てる */
export function buildInterviewTopics(
  questions: InterviewQuestion[],
  interviewConfig: InterviewConfig,
  bill: PromptBillInput
): TurnTopic[] {
  return buildTurnTopics(questions, {
    purposeType: interviewConfig?.purpose_type ?? null,
    subject: bill ? "bill" : "theme",
  });
}

/** summary から chat に戻ったときの話題 */
export const RESUME_TOPIC: TurnTopic = {
  id: RESUME_TOPIC_ID,
  label: "R",
  title: "付け足し",
  kind: "add_more",
  turnBudget: RESUME_TURN_BUDGET,
  required: false,
  hint: "回答者が付け足したいこと",
  question: "付け足したいことを続けて話してもらう",
  quickReplies: [],
  predefined: false,
};

function usedCount(metas: AssistantTurnMeta[], topicId: string): number {
  return metas.filter((m) => m.questionId === topicId && !m.budgetExempt)
    .length;
}

function findCurrentTopic(
  topics: TurnTopic[],
  metas: AssistantTurnMeta[]
): TurnTopic | null {
  for (let i = metas.length - 1; i >= 0; i--) {
    const id = metas[i].questionId;
    if (!id) continue;
    if (id === RESUME_TOPIC_ID) return RESUME_TOPIC;
    const topic = topics.find((t) => t.id === id);
    if (topic) return topic;
  }
  return topics[0] ?? null;
}

/**
 * 毎ターン、過去の assistant 発話からいまの話題・残り予算・次の話題を計算する。
 */
export function computeTurnState({
  topics,
  metas,
}: {
  topics: TurnTopic[];
  metas: AssistantTurnMeta[];
}): TurnState {
  const assistantTurn = metas.length;
  const remainingTurns = TURN_LIMIT - assistantTurn;
  const askedIds = new Set(
    metas.map((m) => m.questionId).filter((id): id is string => !!id)
  );
  const current = findCurrentTopic(topics, metas);

  // 話題は前にしか進まない。再開の話題の後に事前定義の話題は無い
  const currentIndex = !current
    ? -1
    : current.predefined
      ? topics.indexOf(current)
      : topics.length;
  const after = topics
    .slice(currentIndex + 1)
    .filter((t) => !askedIds.has(t.id));
  // これから聞ける必須の話題（飛ばして戻れない話題は数えない）
  const undoneRequired = after.filter((t) => t.required).length;

  let left = current ? current.turnBudget - usedCount(metas, current.id) : 0;
  // 残りの必須の話題に最低1回ずつ回す
  if (remainingTurns - SUMMARY_RESERVE_TURNS <= undoneRequired) left = 0;
  const hasRoomForOptional =
    remainingTurns - SUMMARY_RESERVE_TURNS > undoneRequired + 1;
  const next = after.find((t) => t.required || hasRoomForOptional) ?? null;

  return {
    assistantTurn,
    remainingTurns,
    current,
    left: Math.max(0, left),
    next,
    remainingRequired: after.filter((t) => t.required),
    pendingOptional: after.filter((t) => !t.required),
    askedIds,
  };
}

/**
 * chat の生成前に、要約へ入るかを決める。入るならそのきっかけを返す。
 */
export function decideSummaryEntry({
  state,
  endButton,
}: {
  state: TurnState;
  endButton: boolean;
}): InterviewEndReason | null {
  if (endButton) return "end_button";
  if (state.assistantTurn >= SUMMARY_START_TURN) return "turn_limit";
  if (state.left === 0 && state.next === null) return "completed";
  return null;
}

/**
 * LLM が返した question_id を、いまの話題か次の話題に読み替える。
 * 本文は表示済みなので作り直さず、保存する値だけを直す。
 */
export function normalizeQuestionId(
  raw: unknown,
  state: TurnState
): TurnTopic | null {
  const { current, next, left } = state;
  if (left === 0) return next ?? current;
  if (
    next &&
    typeof raw === "string" &&
    (raw === next.label || raw === next.id)
  ) {
    return next;
  }
  return current;
}

/** 個別の要望・テーマ外の話への対応を、この話題の予算から除けるか */
export function canExemptBudget(
  metas: AssistantTurnMeta[],
  topicId: string
): boolean {
  const exempted = metas.filter(
    (m) => m.questionId === topicId && m.budgetExempt
  ).length;
  return exempted < SIDE_TURN_EXEMPT_PER_TOPIC;
}

/** 初めて聞く質問に表示する選択肢ボタン（「とばす」はコードが足す） */
export function buildQuickReplies(topic: TurnTopic): string[] {
  const replies = [...topic.quickReplies];
  if (topic.kind === "evaluation" && !replies.includes(UNDECIDED_REPLY)) {
    replies.push(UNDECIDED_REPLY);
  }
  return [...replies, SKIP_QUESTION_REPLY];
}

export interface ChatTurnResult {
  /** 保存する question_id（interview_questions.id か RESUME_TOPIC_ID） */
  questionId: string | null;
  /** 保存・表示する話題名（コードが決めた話題の名前） */
  topicTitle: string | null;
  budgetExempt: boolean;
  /** 表示する選択肢ボタン。初めて聞く事前定義の質問のときだけ */
  quickReplies: string[];
}

/**
 * chat の生成後に、保存する question_id・予算の除外・選択肢ボタンを決める。
 */
export function resolveChatTurn({
  state,
  metas,
  rawQuestionId,
  sideTurn,
}: {
  state: TurnState;
  metas: AssistantTurnMeta[];
  rawQuestionId: unknown;
  /** personal_request か off_topic が立った発話 */
  sideTurn: boolean;
}): ChatTurnResult {
  const topic = normalizeQuestionId(rawQuestionId, state);
  if (!topic) {
    return {
      questionId: null,
      topicTitle: null,
      budgetExempt: false,
      quickReplies: [],
    };
  }
  const firstAsk = !state.askedIds.has(topic.id);
  return {
    questionId: topic.id,
    topicTitle: topic.title,
    budgetExempt: sideTurn && canExemptBudget(metas, topic.id),
    quickReplies: firstAsk && topic.predefined ? buildQuickReplies(topic) : [],
  };
}

export interface SummaryState {
  phase: SummaryPhase;
  remainingTurns: number;
  canResume: boolean;
  isLast: boolean;
}

export function computeSummaryState({
  assistantTurn,
  phase,
  resumeUsed,
  forceClose,
}: {
  assistantTurn: number;
  phase: SummaryPhase;
  resumeUsed: boolean;
  /** summary 中に「終える」ボタンが押された */
  forceClose: boolean;
}): SummaryState {
  const remainingTurns = TURN_LIMIT - assistantTurn;
  return {
    phase,
    remainingTurns,
    // 再開を受ける発話の後に、要約へ戻る前の chat の発話が少なくとも1回残ること
    canResume:
      remainingTurns >= RESUME_MIN_REMAINING_TURNS &&
      assistantTurn + 1 < SUMMARY_START_TURN &&
      !resumeUsed,
    isLast: remainingTurns <= 1 || forceClose,
  };
}

export interface SummaryTurnResult {
  stage: InterviewStage;
  summaryPhase: SummaryPhase | null;
  /** chat に戻った（再開の話題を開いた） */
  resumed: boolean;
}

/** summary の生成後に、次のステージを決める */
export function resolveSummaryTurn(
  summaryState: SummaryState,
  response: SummaryResponse
): SummaryTurnResult {
  if (
    summaryState.isLast ||
    (summaryState.phase === "reply" && response === "agree")
  ) {
    return { stage: "summary_complete", summaryPhase: null, resumed: false };
  }
  if (
    summaryState.phase === "reply" &&
    response === "resume" &&
    summaryState.canResume
  ) {
    return { stage: "chat", summaryPhase: null, resumed: true };
  }
  return { stage: "summary", summaryPhase: "reply", resumed: false };
}
