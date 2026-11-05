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

/**
 * 要約の段階を終えた（summary_complete の）セッションに、さらに送ろうとした。
 * 未開始（409）と区別できるよう、本文を変える。
 */
export const INTERVIEW_ALREADY_COMPLETED_MESSAGE =
  "このインタビューはすでに終わっています。";

export class InterviewAlreadyCompletedError extends Error {
  constructor() {
    super(INTERVIEW_ALREADY_COMPLETED_MESSAGE);
    this.name = "InterviewAlreadyCompletedError";
  }
}

/** 職員プレビューからの操作。トークンが有効なら参加条件を問わない */
export type PreviewCredential = {
  policyId: string;
  token: string;
};
