/**
 * チャットページを開いたときに、開始画面（同意の案内）を出すか会話を続けるかを決める（#158）。
 *
 * - 進行中のセッションがない → 開始画面。「はじめる」で同意を記録してセッションを作る
 * - 進行中のセッションがある → 同意の有無に関わらず会話を続ける
 *   （consented_at の追加前に始まったセッションは同意の記録がないが、途中で止めない）
 */
export function resolveChatEntry<T extends { consented_at: string | null }>(
  activeSession: T | null
): { kind: "start" } | { kind: "resume"; session: T } {
  return activeSession
    ? { kind: "resume", session: activeSession }
    : { kind: "start" };
}
