import type { InterviewMode } from "@mirai-gikai/shared/interview-prompts/types";

export type { InterviewMode };

/**
 * Epic #54 で interview_configs.mode が廃止され、対話は loop モードに一本化された。
 * bulk / targeted のプロンプトロジックは残っているが、DB から選択されることはない。
 */
export const DEFAULT_INTERVIEW_MODE: InterviewMode = "loop";
