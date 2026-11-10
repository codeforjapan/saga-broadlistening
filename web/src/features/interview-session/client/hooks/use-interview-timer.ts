"use client";

import { useEffect, useState } from "react";
import { calcRemainingMinutes } from "../../shared/utils/calc-remaining-minutes";
import { isEndInterviewAvailable } from "../../shared/utils/end-interview-availability";

interface UseInterviewTimerProps {
  estimatedDuration: number | null | undefined;
  sessionStartedAt: string | undefined;
}

interface UseInterviewTimerResult {
  /** 残り分数。タイムマネジメント不要の場合はnull */
  remainingMinutes: number | null;
  /** 目安時間を超過したかどうか */
  isTimeUp: boolean;
  /** 対話中に「終えてまとめに進む」を出してよいか（目安時間の2/3経過後） */
  canEndInterview: boolean;
}

/**
 * インタビューの残り時間を管理するフック
 *
 * 10秒ごとに現在時刻を更新し、残り時間などはそこから描画時に計算する。
 * estimatedDurationがnull/undefinedの場合はタイムマネジメントしない。
 */
export function useInterviewTimer({
  estimatedDuration,
  sessionStartedAt,
}: UseInterviewTimerProps): UseInterviewTimerResult {
  const [now, setNow] = useState(() => new Date());
  const hasTimer = Boolean(estimatedDuration && sessionStartedAt);

  useEffect(() => {
    if (!hasTimer) return;
    setNow(new Date());
    const interval = setInterval(() => setNow(new Date()), 10000);
    return () => clearInterval(interval);
  }, [hasTimer]);

  const remainingMinutes =
    hasTimer && sessionStartedAt
      ? calcRemainingMinutes(estimatedDuration, sessionStartedAt, now)
      : null;

  return {
    remainingMinutes,
    isTimeUp: remainingMinutes !== null && remainingMinutes <= 0,
    canEndInterview: isEndInterviewAvailable(
      estimatedDuration,
      sessionStartedAt,
      now
    ),
  };
}
