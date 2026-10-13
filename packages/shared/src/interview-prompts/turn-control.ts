/**
 * AIインタビューのターン制御（純粋関数）。
 *
 * コードが持つのは外枠だけ: 発話の上限（全体と話題ごと）、話題の順番、ステージ遷移、
 * 選択肢ボタン。深掘りするか・何を聞くか・早めに次へ移るかは LLM が上限の範囲で決める。
 */
import {
  QUESTION_TURNS_PER_TOPIC,
  RESUME_MIN_SUMMARY_TURNS,
  RESUME_TOPIC_TURN_LIMIT,
  SKIP_QUESTION_REPLY,
  SUMMARY_TURN_LIMIT,
} from "./constants";
import type {
  InterviewQuestion,
  InterviewStage,
  SummaryPhase,
  SummaryResponse,
} from "./types";

/** summary から chat に戻ったときに開く話題の ID（interview_questions には無い） */
export const RESUME_TOPIC_ID = "resume";

/** 再開の話題の名前（進捗バーに出す） */
export const RESUME_TOPIC_TITLE = "付け足し";

export interface TurnTopic {
  /** interview_questions.id（再開の話題は RESUME_TOPIC_ID） */
  id: string;
  /** プロンプトで使う短い ID（Q1, Q2 … / 再開は R） */
  label: string;
  /** 聞けたら話が豊かになる観点（interview_questions.follow_up_guide） */
  followUpGuide: string | null;
  question: string;
  quickReplies: string[];
  /** interview_questions にある事前定義の話題か（再開の話題は false） */
  predefined: boolean;
}

/** 過去の assistant 発話から、ターン制御に使う部分だけを取り出したもの */
export interface AssistantTurnMeta {
  questionId: string | null;
  /** その発話を生成したステージ。記録の無い古い発話は null（chat として扱う） */
  stage: InterviewStage | null;
}

export interface TurnState {
  /** これまでの質問の発話数（最初の発話と要約の段階の発話は数えない） */
  questionTurn: number;
  /** 質問の発話の上限（質問の数 × QUESTION_TURNS_PER_TOPIC） */
  questionTurnLimit: number;
  /** 上限までの残り（今回を含む） */
  remainingQuestionTurns: number;
  /** いまの話題（話題が1つもない設定では null） */
  current: TurnTopic | null;
  /** いまの話題で使える発話（今回を含む） */
  left: number;
  next: TurnTopic | null;
  /** まだ聞いていない話題（いまの話題より後） */
  remainingTopics: TurnTopic[];
  /** これまでに聞いた話題の ID */
  askedIds: Set<string>;
}

/**
 * その話題で使える発話の数（最初の質問を含む）。
 * 設定した質問はどれも同じ回数まで深掘りでき、再開の話題だけ短くする。
 */
export function topicTurnLimit(topic: TurnTopic): number {
  return topic.predefined ? QUESTION_TURNS_PER_TOPIC : RESUME_TOPIC_TURN_LIMIT;
}

/** interview_questions の並びを、ターン制御の話題にする */
export function buildTurnTopics(questions: InterviewQuestion[]): TurnTopic[] {
  return questions.map((q, index) => ({
    id: q.id,
    label: `Q${index + 1}`,
    followUpGuide: q.follow_up_guide?.trim() || null,
    question: q.question,
    quickReplies: (q.quick_replies ?? []).filter((r) => r.trim().length > 0),
    predefined: true,
  }));
}

/**
 * 質問の発話の上限。設定した質問（事前定義の話題）の数に比例させ、
 * 質問が多い設定でも1問あたりに使える発話が減らないようにする。
 */
export function computeQuestionTurnLimit(topics: TurnTopic[]): number {
  return (
    topics.filter((t) => t.predefined).length * QUESTION_TURNS_PER_TOPIC
  );
}

/** summary から chat に戻ったときの話題 */
export const RESUME_TOPIC: TurnTopic = {
  id: RESUME_TOPIC_ID,
  label: "R",
  followUpGuide: "回答者が付け足したいこと",
  question: "付け足したいことを続けて話してもらう",
  quickReplies: [],
  predefined: false,
};

/**
 * これまでの質問の発話数。最初の発話（あいさつと最初の質問）と、
 * 要約の段階の発話（再開を受ける発話を含む）は数えない。
 */
export function countQuestionTurns(metas: AssistantTurnMeta[]): number {
  return metas.slice(1).filter((m) => m.stage !== "summary").length;
}

/** これまでの要約の段階の発話数（再開を挟んでも通算） */
export function countSummaryTurns(metas: AssistantTurnMeta[]): number {
  return metas.filter((m) => m.stage === "summary").length;
}

/** summary から chat に戻る再開を、すでに使ったか */
export function hasUsedResume(metas: AssistantTurnMeta[]): boolean {
  return metas.some((m) => m.questionId === RESUME_TOPIC_ID);
}

/**
 * 要約の段階の場面を、セッションのステージと直前の発話から決める。
 * このリクエストで要約に入った（セッションがまだ chat）なら初回の要約。
 * 要約の段階では、直前の発話が要約の段階のものなら返事を受けるところ、
 * chat の発話（終えたいと言われた直後）なら初回の要約。
 */
export function resolveSummaryPhase({
  sessionStage,
  metas,
}: {
  sessionStage: InterviewStage;
  metas: AssistantTurnMeta[];
}): SummaryPhase {
  if (sessionStage !== "summary") return "first";
  return metas.at(-1)?.stage === "summary" ? "reply" : "first";
}

function usedCount(metas: AssistantTurnMeta[], topicId: string): number {
  return metas.filter((m) => m.questionId === topicId).length;
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
 * 毎ターン、過去の assistant 発話からいまの話題・この話題の残りの発話・次の話題を計算する。
 */
export function computeTurnState({
  topics,
  metas,
}: {
  topics: TurnTopic[];
  metas: AssistantTurnMeta[];
}): TurnState {
  const questionTurn = countQuestionTurns(metas);
  const questionTurnLimit = computeQuestionTurnLimit(topics);
  const remainingQuestionTurns = questionTurnLimit - questionTurn;
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
  // これから聞ける話題（飛ばして戻れない話題は数えない）
  const remainingTopics = topics
    .slice(currentIndex + 1)
    .filter((t) => !askedIds.has(t.id));

  let left = current
    ? topicTurnLimit(current) - usedCount(metas, current.id)
    : 0;
  // 残りの話題に最低1回ずつ回す（話題ごとの上限の合計が全体の上限と同じなので、
  // 通常は起きない。再開した後などの保険）
  if (remainingQuestionTurns <= remainingTopics.length) left = 0;

  return {
    questionTurn,
    questionTurnLimit,
    remainingQuestionTurns,
    current,
    left: Math.max(0, left),
    next: remainingTopics[0] ?? null,
    remainingTopics,
    askedIds,
  };
}

/**
 * chat の生成前に、要約へ入るかを決める。
 * 「終える」ボタン・質問の発話の上限・すべての話題を聞き終えた、のいずれかで入る。
 */
export function decideSummaryEntry({
  state,
  endButton,
}: {
  state: TurnState;
  endButton: boolean;
}): boolean {
  return (
    endButton ||
    state.questionTurn >= state.questionTurnLimit ||
    (state.left === 0 && state.next === null)
  );
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

/** 初めて聞く質問に表示する選択肢ボタン（「とばす」はコードが足す） */
export function buildQuickReplies(topic: TurnTopic): string[] {
  return [...topic.quickReplies, SKIP_QUESTION_REPLY];
}

export interface ChatTurnResult {
  /** 保存する question_id（interview_questions.id か RESUME_TOPIC_ID） */
  questionId: string | null;
  /** 表示する選択肢ボタン。初めて聞く事前定義の質問のときだけ */
  quickReplies: string[];
}

/**
 * chat の生成後に、保存する question_id と選択肢ボタンを決める。
 */
export function resolveChatTurn({
  state,
  rawQuestionId,
}: {
  state: TurnState;
  rawQuestionId: unknown;
}): ChatTurnResult {
  const topic = normalizeQuestionId(rawQuestionId, state);
  if (!topic) return { questionId: null, quickReplies: [] };
  const firstAsk = !state.askedIds.has(topic.id);
  return {
    questionId: topic.id,
    quickReplies: firstAsk && topic.predefined ? buildQuickReplies(topic) : [],
  };
}

export interface SummaryState {
  phase: SummaryPhase;
  /** 要約の段階で使える残りの発話（今回を含む） */
  remainingTurns: number;
  canResume: boolean;
  isLast: boolean;
}

export function computeSummaryState({
  topics,
  metas,
  phase,
  forceClose,
}: {
  /** 質問の発話の上限を決めるための話題（再開できるかの判定に使う） */
  topics: TurnTopic[];
  metas: AssistantTurnMeta[];
  phase: SummaryPhase;
  /** summary 中に「終える」ボタンが押された */
  forceClose: boolean;
}): SummaryState {
  const remainingTurns = SUMMARY_TURN_LIMIT - countSummaryTurns(metas);
  const remainingQuestionTurns =
    computeQuestionTurnLimit(topics) - countQuestionTurns(metas);
  return {
    phase,
    remainingTurns,
    // 再開は1回まで。戻った後に質問の発話が1回は残り、
    // 要約の段階に「再開を受ける発話・もう一度の要約・締め」が残ること
    canResume:
      !hasUsedResume(metas) &&
      remainingQuestionTurns >= 1 &&
      remainingTurns >= RESUME_MIN_SUMMARY_TURNS,
    isLast: remainingTurns <= 1 || forceClose,
  };
}

export interface SummaryTurnResult {
  stage: InterviewStage;
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
    return { stage: "summary_complete", resumed: false };
  }
  if (
    summaryState.phase === "reply" &&
    response === "resume" &&
    summaryState.canResume
  ) {
    return { stage: "chat", resumed: true };
  }
  return { stage: "summary", resumed: false };
}
