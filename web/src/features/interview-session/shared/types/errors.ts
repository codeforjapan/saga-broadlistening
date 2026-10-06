import { INTERVIEW_PARTICIPATION_DENIED_MESSAGE } from "@mirai-gikai/shared/interview-participation/participation-mode";

export class InterviewParticipationDeniedError extends Error {
  constructor() {
    super(INTERVIEW_PARTICIPATION_DENIED_MESSAGE);
    this.name = "InterviewParticipationDeniedError";
  }
}
