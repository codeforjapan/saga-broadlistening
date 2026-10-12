import { SUMMARY_START_TURN, TURN_LIMIT } from "./constants";
import { STEP_KIND_LABELS } from "./purpose-types/types";
import type { SummaryState, TurnState, TurnTopic } from "./turn-control";

function nextNote(next: TurnTopic, state: TurnState): string {
  const isLast =
    state.remainingRequired.length <= 1 &&
    state.remainingRequired[state.remainingRequired.length - 1] === next;
  if (next.kind === "evaluation") {
    return "（受け止めの質問。選択肢ボタンはシステムが出す）";
  }
  if (isLast) return "（最後の質問）";
  if (next.quickReplies.length > 0) return "（選択肢ボタンはシステムが出す）";
  return "";
}

function remainingTopicsLine(state: TurnState): string {
  const { remainingRequired, pendingOptional } = state;
  if (remainingRequired.length === 0 && pendingOptional.length === 0) {
    return "- 残りの話題：なし";
  }
  const labels = remainingRequired.map((t) => t.label).join("・") || "なし";
  const optionalNote =
    pendingOptional.length > 0
      ? `。${pendingOptional.map((t) => t.label).join("・")} は残りの発話数によってシステムが決める`
      : "";
  return `- 残りの話題：${labels}（あと${remainingRequired.length}つ${optionalNote}）`;
}

/**
 * 「いまの状況」節。コードが毎ターン作り、回答者には見せない。
 */
export function renderTurnState(
  state: TurnState,
  { piiNotice }: { piiNotice: "pending" | "done" | null }
): string {
  const { current, next, left } = state;
  const lines = [
    "# いまの状況（システムから。回答者には見せない）",
    `- 発話：これまで${state.assistantTurn}回（上限${TURN_LIMIT}。${SUMMARY_START_TURN}回に達したら要約に入る）`,
  ];
  if (current) {
    lines.push(
      `- いまの話題：${current.label}「${current.title}」（${STEP_KIND_LABELS[current.kind]}）。この話題で使える発話：あと${left}回${left > 0 ? "（今回を含む）" : ""}`
    );
  }
  if (left >= 1) {
    lines.push("- 続けても、次の話題に移ってもよい");
  } else if (next) {
    lines.push(`- 今回は次の話題に移る（question_id は ${next.label}）`);
  }
  lines.push(
    next
      ? `- 次の話題：${next.label}「${next.title}」${nextNote(next, state)}`
      : "- 次の話題：なし（この話題が最後）"
  );
  lines.push(remainingTopicsLine(state));
  if (current?.hint) {
    lines.push(
      `- この話題で聞けたら豊かになる観点：${current.hint}（満たさなくてよい）`
    );
  }
  if (piiNotice) {
    lines.push(`- 伏せ字の案内：${piiNotice === "pending" ? "まだ" : "済み"}`);
  }
  return lines.join("\n");
}

/** 「出力」節。question_id に入れてよい値を、いまと次の話題の ID で明記する */
export function renderChatOutputInstructions(state: TurnState): string {
  const { current, next, left } = state;
  const qidLine =
    left === 0 && next
      ? `- question_id：今回は ${next.label}`
      : next && current
        ? `- question_id：いまの話題を続けるなら ${current.label}、次の話題に移るなら ${next.label}。それ以外は入れない（続きを促すだけの発話はいまの話題）`
        : `- question_id：${current?.label ?? "なし"}`;
  return [
    qidLine,
    "- topic_title：その話題の短い名前",
    "- text：回答者に表示する本文",
    "- end_request：回答者が終えたい・やめたいとはっきり言ったら true（「疲れた」だけなら false）",
    "- personal_request：直前の回答が、特定の場所や本人の案件への対応を求めていたら true",
    "- off_topic：直前の回答が、市政に関係するがこのテーマの外の話だったら true",
  ].join("\n");
}

/** 要約用プロンプトの「要約の状況」節 */
export function renderSummaryState(summaryState: SummaryState): string {
  const yesNo = (v: boolean) => (v ? "はい" : "いいえ");
  return [
    "## 要約の状況（システムから）",
    `- 場面：${summaryState.phase === "first" ? "初回の要約" : "返事を受けたところ"}`,
    `- 残りの発話：${summaryState.remainingTurns}回`,
    `- インタビューに戻れるか：${yesNo(summaryState.canResume)}`,
    `- これが最後の発話か：${yesNo(summaryState.isLast)}`,
  ].join("\n");
}
