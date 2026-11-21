"use client";

import { Progress } from "@/components/ui/progress";
import { InterviewTimer } from "./interview-timer";

interface InterviewProgressBarProps {
  percentage: number;
  currentTopic: string | null;
  remainingMinutes?: number | null;
}

export function InterviewProgressBar({
  percentage,
  currentTopic,
  remainingMinutes,
}: InterviewProgressBarProps) {
  return (
    <div>
      {(currentTopic || remainingMinutes != null) && (
        <div className="mb-2 flex items-center gap-2 md:mb-2.5">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            {currentTopic && (
              <div className="inline-flex max-w-full rounded-[10px] bg-secondary px-3 py-0.5 md:px-4">
                <p className="min-w-0 truncate text-[13px] font-bold leading-[22px] text-foreground md:text-sm md:leading-[25px]">
                  {currentTopic}
                </p>
              </div>
            )}
          </div>
          {remainingMinutes != null && (
            <div className="ml-auto shrink-0">
              <InterviewTimer remainingMinutes={remainingMinutes} />
            </div>
          )}
        </div>
      )}
      <Progress
        value={percentage}
        className="h-1.5 rounded-full bg-progress-track md:h-[7px] [&>[data-slot=progress-indicator]]:bg-progress"
      />
    </div>
  );
}
