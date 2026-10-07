import { EXTERNAL_IDENTITY_PROVIDERS } from "@mirai-gikai/shared/external-identity/providers";
import type { InterviewParticipationRule } from "@mirai-gikai/shared/interview-participation/participation-mode";
import type { InterviewParticipationView } from "../types/interview-participation-view";

function httpGuideUrl(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.href
      : null;
  } catch {
    return null;
  }
}

/** UIDや外部IDの内部IDをClient Componentへ渡さず、表示用の情報だけを作る。 */
export function buildInterviewParticipationView(params: {
  allowed: boolean;
  rule: InterviewParticipationRule & { name: string };
  guideUrls: Partial<Record<string, string>>;
}): InterviewParticipationView {
  if (params.allowed) return { kind: "allowed" };
  return {
    kind: "guide",
    themeName: params.rule.name,
    providers: EXTERNAL_IDENTITY_PROVIDERS.filter((provider) =>
      params.rule.allowed_provider_keys.includes(provider.key)
    ).map((provider) => ({
      key: provider.key,
      displayName: provider.displayName,
      guideUrl: httpGuideUrl(params.guideUrls[provider.key]),
    })),
  };
}
