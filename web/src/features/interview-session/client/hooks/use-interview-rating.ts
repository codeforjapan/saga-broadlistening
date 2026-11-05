"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { InterviewProgress } from "../../shared/utils/calc-interview-progress";

const RATING_WIDGET_THRESHOLD = 65;

interface UseInterviewRatingProps {
  progress: InterviewProgress | null;
  hasRated?: boolean;
}

/**
 * 評価ウィジェットの表示制御を管理するhook
 * プログレスが閾値に達したら1回だけ表示
 * 既に評価済み（hasRated=true）の場合は表示しない
 */
export function useInterviewRating({
  progress,
  hasRated,
}: UseInterviewRatingProps) {
  const ratingTriggered = useRef(!!hasRated);
  const [showRating, setShowRating] = useState(false);

  useEffect(() => {
    if (
      !ratingTriggered.current &&
      progress &&
      progress.percentage >= RATING_WIDGET_THRESHOLD
    ) {
      ratingTriggered.current = true;
      setShowRating(true);
    }
  }, [progress]);

  const handleRatingDismiss = useCallback(() => {
    setShowRating(false);
  }, []);

  return { showRating, handleRatingDismiss };
}
