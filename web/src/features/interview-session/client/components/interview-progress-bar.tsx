"use client";

import { Progress } from "@/components/ui/progress";
import type { InterviewStageLabel } from "../../shared/utils/calc-interview-progress";

interface InterviewProgressBarProps {
  percentage: number;
  stageLabel: InterviewStageLabel;
}

/** 進み具合はバーと段階のラベルだけで伝える。残り時間や残りの問数は出さない（#273） */
export function InterviewProgressBar({
  percentage,
  stageLabel,
}: InterviewProgressBarProps) {
  return (
    <div>
      <div className="mb-2 flex w-fit rounded-[10px] bg-secondary px-3 py-0.5 md:mb-2.5 md:px-4">
        <p className="text-[13px] font-bold leading-[22px] text-foreground md:text-sm md:leading-[25px]">
          {stageLabel}
        </p>
      </div>
      <Progress
        value={percentage}
        aria-label="進み具合"
        className="h-1.5 rounded-full bg-border md:h-[7px] [&>[data-slot=progress-indicator]]:bg-decor"
      />
    </div>
  );
}
