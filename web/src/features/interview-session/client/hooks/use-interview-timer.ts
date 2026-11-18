"use client";

import { useEffect, useState } from "react";
import { calcRemainingMinutes } from "../../shared/utils/calc-remaining-minutes";

interface UseInterviewTimerProps {
  estimatedDuration: number | null | undefined;
  sessionStartedAt: string | undefined;
}

interface UseInterviewTimerResult {
  /** 残り分数。タイムマネジメント不要の場合はnull */
  remainingMinutes: number | null;
  /** 目安時間を超過したかどうか */
  isTimeUp: boolean;
  /** 目安時間が設定され、残り時間を測っているか */
  hasTimer: boolean;
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
  const timerStartedAt = estimatedDuration ? sessionStartedAt : undefined;
  const hasTimer = timerStartedAt !== undefined;

  useEffect(() => {
    if (!hasTimer) return;
    setNow(new Date());
    const interval = setInterval(() => setNow(new Date()), 10000);
    return () => clearInterval(interval);
  }, [hasTimer]);

  const remainingMinutes = timerStartedAt
    ? calcRemainingMinutes(estimatedDuration, timerStartedAt, now)
    : null;

  return {
    remainingMinutes,
    isTimeUp: remainingMinutes !== null && remainingMinutes <= 0,
    hasTimer,
  };
}
