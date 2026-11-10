import { calcElapsedMinutes } from "./calc-remaining-minutes";

/** 「終えてまとめに進む」を出すまでに経過させる、目安時間に対する割合 */
export const END_INTERVIEW_AVAILABLE_RATIO = 2 / 3;

/**
 * 対話中に「終えてまとめに進む」を出してよいかを判定する純粋関数。
 *
 * 目安時間の2/3が過ぎてから出す（#245）。目安時間や開始時刻がなく
 * 経過を測れないときは、終える手段がなくならないよう最初から出す。
 *
 * @param estimatedDuration - 目安時間（分）
 * @param sessionStartedAt - セッション開始時刻（ISO string）
 * @param now - 現在時刻（テスト用にDI可能）
 */
export function isEndInterviewAvailable(
  estimatedDuration: number | null | undefined,
  sessionStartedAt: string | undefined,
  now: Date = new Date()
): boolean {
  if (!estimatedDuration || estimatedDuration <= 0 || !sessionStartedAt) {
    return true;
  }
  return (
    calcElapsedMinutes(sessionStartedAt, now) >=
    estimatedDuration * END_INTERVIEW_AVAILABLE_RATIO
  );
}
