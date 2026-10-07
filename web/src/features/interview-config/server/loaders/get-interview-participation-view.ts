import "server-only";

import type { InterviewParticipationRule } from "@mirai-gikai/shared/interview-participation/participation-mode";
import { cache } from "react";
import { loadExternalIdentities } from "@/features/interview-session/server/services/resolve-interview-participation";
import type { SessionAccessDeps } from "@/features/interview-session/server/services/verify-session-access";
import { getAuthenticatedUser } from "@/features/interview-session/server/utils/verify-session-ownership";
import { evaluateInterviewParticipation } from "@/features/interview-session/shared/utils/evaluate-interview-participation";
import { env } from "@/lib/env";
import type { InterviewParticipationView } from "../../shared/types/interview-participation-view";
import { buildInterviewParticipationView } from "../../shared/utils/build-interview-participation-view";

// 複数のカード・回答導線でも、同一リクエスト内の認証と外部ID解決は1回だけ。
const getViewerIdentities = cache(async (deps?: SessionAccessDeps) => {
  const auth = await getAuthenticatedUser(deps);
  return auth.authenticated ? loadExternalIdentities(auth.userId, deps) : [];
});

export async function getInterviewParticipationView(
  rule: InterviewParticipationRule & { name: string },
  isPreview = false,
  deps?: SessionAccessDeps
): Promise<InterviewParticipationView> {
  if (isPreview || rule.participation_mode === "public") {
    return { kind: "allowed" };
  }
  const identities = await getViewerIdentities(deps);
  const { allowed } = evaluateInterviewParticipation({ rule, identities });
  return buildInterviewParticipationView({
    allowed,
    rule,
    guideUrls: env.externalIdentityGuideUrls,
  });
}
