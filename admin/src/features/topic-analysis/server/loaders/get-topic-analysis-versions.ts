import "server-only";

import { findVersionsByInterviewConfigId } from "../repositories/topic-analysis-repository";

export async function getTopicAnalysisVersions(interviewConfigId: string) {
  return findVersionsByInterviewConfigId(interviewConfigId);
}
