/**
 * AIインタビューのターン制御（純粋関数）。
 *
 * コードが持つのは外枠だけ: 発話の上限（全体と、最後・再開の話題）、話題ごとの目安、最初と最後の話題、ステージ遷移、
 * 選択肢ボタン。深掘りするか・何を聞くか・早めに次へ移るか・間の話題をどの順に聞くかは
 * LLM が上限の範囲で決める。
 */
import {
  QUESTION_TURN_LIMIT_PER_TOPIC,
  QUESTION_TURNS_PER_TOPIC,
  RESUME_TOPIC_TURN_LIMIT,
  SKIP_QUESTION_REPLY,
} from "./constants";
import type { TurnSignals } from "./read-signals";
import type { InterviewQuestion, InterviewStage } from "./types";

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
  /** 質問の発話の上限（質問の数 × QUESTION_TURN_LIMIT_PER_TOPIC） */
  questionTurnLimit: number;
  /** 上限までの残り（今回を含む） */
  remainingQuestionTurns: number;
  /** いまの話題（話題が1つもない設定では null） */
  current: TurnTopic | null;
  /** いまの話題で、これまでに使った発話 */
  topicTurns: number;
  /** いまの話題の発話の目安。超えてよいかは topicTurnSoft */
  topicTurnTarget: number;
  /** 目安を超えて続けてよいか（次へ移れる事前定義の話題だけ true） */
  topicTurnSoft: boolean;
  /**
   * いまの話題で使える発話の上限までの残り（今回を含む）。
   * 全体の残りから、まだ聞いていない話題に1回ずつ残した分。最後の話題と再開の話題は目安が上限
   */
  left: number;
  /**
   * 次に聞ける話題。最初の話題の後は、最後の話題を除くまだ聞いていない話題のどれでもよい。
   * 最後の話題は、ほかを聞き終えてから
   */
  candidates: TurnTopic[];
  /** LLM が次の話題を選べなかったときに移る話題（candidates の先頭） */
  next: TurnTopic | null;
  /** まだ聞いていない話題（いまの話題を除く） */
  remainingTopics: TurnTopic[];
  /** これまでに聞いた話題の ID */
  askedIds: Set<string>;
}

/**
 * その話題の発話の目安（最初の質問を含む）。
 * 設定した質問はどれも同じ回数を目安にし、再開の話題だけ短くする。
 */
export function topicTurnTarget(topic: TurnTopic): number {
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
    topics.filter((t) => t.predefined).length * QUESTION_TURN_LIMIT_PER_TOPIC
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
 * 次に聞ける話題。最後の話題（言い足しの質問など）は、ほかを聞き終えてから聞く。
 * 最初の話題は、最初の発話で聞くので候補に出てこない。
 */
function selectCandidates(
  topics: TurnTopic[],
  remainingTopics: TurnTopic[]
): TurnTopic[] {
  const last = topics.at(-1);
  const middle = remainingTopics.filter((t) => t !== last);
  return middle.length > 0 ? middle : remainingTopics;
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

  // 再開の話題の後に事前定義の話題は無い（要約から戻るのは付け足しのため）
  const remainingTopics =
    current && !current.predefined
      ? []
      : topics.filter((t) => t !== current && !askedIds.has(t.id));
  const candidates = selectCandidates(topics, remainingTopics);

  const topicTurns = current ? usedCount(metas, current.id) : 0;
  const topicTurnTargetValue = current ? topicTurnTarget(current) : 0;
  // 目安を超えてよいのは、次へ移れる事前定義の話題だけ。最後の話題は次へ移る代わりに
  // 要約に入るので、再開の話題と同じく目安を上限にする
  const topicTurnSoft = !!current?.predefined && remainingTopics.length > 0;
  // 全体の残りから、まだ聞いていない話題に1回ずつ残した分まで使える
  const room = remainingQuestionTurns - remainingTopics.length;
  const topicLimit = topicTurnSoft
    ? room
    : Math.min(room, topicTurnTargetValue - topicTurns);
  const left = current ? topicLimit : 0;

  return {
    questionTurn,
    questionTurnLimit,
    remainingQuestionTurns,
    current,
    topicTurns,
    topicTurnTarget: topicTurnTargetValue,
    topicTurnSoft,
    left: Math.max(0, left),
    candidates,
    next: candidates[0] ?? null,
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
 * chat の生成後に、要約へ進むかを決める。
 * 終えたいと言われたか、最後の話題を聞き終えたら要約へ。話題が残っているときの
 * wrap_up は無視する（途中で打ち切らないため）。
 */
export function decideChatExit({
  state,
  signals,
}: {
  state: TurnState;
  signals: TurnSignals;
}): boolean {
  return (
    signals.endRequest || (signals.wrapUp && state.candidates.length === 0)
  );
}

/**
 * LLM が返した question_id を、いまの話題か次に聞ける話題に読み替える。
 * 本文は表示済みなので作り直さず、保存する値だけを直す。
 */
export function normalizeQuestionId(
  raw: unknown,
  state: TurnState
): TurnTopic | null {
  const { current, next, left } = state;
  const chosen = findChosenCandidate(raw, state);
  if (chosen) return chosen;
  // 発話が0なのに次の話題を選ばなかったら、候補の先頭に移ったものとする
  if (left === 0) return next ?? current;
  return current;
}

/** LLM が返した question_id が、次に聞ける話題のどれかを指していればその話題 */
function findChosenCandidate(
  raw: unknown,
  state: TurnState
): TurnTopic | undefined {
  if (typeof raw !== "string") return undefined;
  return state.candidates.find((t) => raw === t.label || raw === t.id);
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
  // 次の話題に移った発話は、LLM が選んだ話題を ID で示したときだけ選択肢を出す。
  // 候補の先頭に読み替えただけなら、実際に聞いた話題と違う選択肢になりうるため
  const confirmed =
    topic === state.current || !!findChosenCandidate(rawQuestionId, state);
  return {
    questionId: topic.id,
    quickReplies:
      firstAsk && topic.predefined && confirmed ? buildQuickReplies(topic) : [],
  };
}
