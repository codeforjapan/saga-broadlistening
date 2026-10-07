import "server-only";

import type { ComponentProps } from "react";
import { validatePreviewToken } from "@/features/bills/server/loaders/validate-preview-token";
import { InterviewLPPage as InterviewLPView } from "../../client/components/interview-lp-page";
import { getInterviewParticipationView } from "../loaders/get-interview-participation-view";

export async function InterviewLPPage(
  props: Omit<ComponentProps<typeof InterviewLPView>, "participation">
) {
  const { target, interviewConfig } = props;
  const isPreview =
    target.kind === "policy" &&
    (await validatePreviewToken(target.policyId, target.previewToken));
  const participation = await getInterviewParticipationView(
    interviewConfig,
    isPreview
  );
  return <InterviewLPView {...props} participation={participation} />;
}
