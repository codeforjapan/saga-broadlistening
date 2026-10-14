import { EXTERNAL_IDENTITY_PROVIDERS } from "@mirai-gikai/shared/external-identity/providers";
import type { InterviewParticipationRule } from "@mirai-gikai/shared/interview-participation/participation-mode";
import { isHttpUrl } from "@mirai-gikai/shared/url/is-http-url";
import type { InterviewParticipationView } from "../types/interview-participation-view";

function httpGuideUrl(value: string | undefined): string | null {
  if (!value || !isHttpUrl(value)) return null;
  return new URL(value).href;
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
