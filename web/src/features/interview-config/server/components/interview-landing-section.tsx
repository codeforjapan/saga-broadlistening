import "server-only";

import { validatePreviewToken } from "@/features/bills/server/loaders/validate-preview-token";
import { InterviewLandingSection as InterviewLandingView } from "../../client/components/interview-landing-section";
import type { InterviewTarget } from "../../shared/types/interview-target";
import { getInterviewConfig } from "../loaders/get-interview-config";
import { getInterviewConfigBySlug } from "../loaders/get-interview-config-by-slug";
import { getInterviewParticipationView } from "../loaders/get-interview-participation-view";

export async function InterviewLandingSection({
  target,
}: {
  target: InterviewTarget;
}) {
  const config =
    target.kind === "policy"
      ? await getInterviewConfig(target.policyId)
      : (await getInterviewConfigBySlug(target.slug))?.config;
  if (!config) return null;
  const isPreview =
    target.kind === "policy" &&
    (await validatePreviewToken(target.policyId, target.previewToken));
  const participation = await getInterviewParticipationView(config, isPreview);
  return <InterviewLandingView target={target} participation={participation} />;
}
