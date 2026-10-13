import { INTERVIEW_PARTICIPATION_DENIED_MESSAGE } from "@mirai-gikai/shared/interview-participation/participation-mode";

export class InterviewParticipationDeniedError extends Error {
  constructor() {
    super(INTERVIEW_PARTICIPATION_DENIED_MESSAGE);
    this.name = "InterviewParticipationDeniedError";
  }
}

/**
 * 開始画面で同意する前に会話を送ろうとした（進行中のセッションがない）。
 * セッションは同意と同時に作るので、チャットAPIでは作らない（#158）。
 */
export const INTERVIEW_SESSION_NOT_STARTED_MESSAGE =
  "インタビューが開始されていません。開始画面からはじめてください。";

export class InterviewSessionNotStartedError extends Error {
  constructor() {
    super(INTERVIEW_SESSION_NOT_STARTED_MESSAGE);
    this.name = "InterviewSessionNotStartedError";
  }
}

/** 職員プレビューからの操作。トークンが有効なら参加条件を問わない */
export type PreviewCredential = {
  policyId: string;
  token: string;
};
