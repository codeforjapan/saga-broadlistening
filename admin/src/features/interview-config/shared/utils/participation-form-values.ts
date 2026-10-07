import {
  type ExternalIdentityProviderKey,
  isExternalIdentityProviderKey,
} from "@mirai-gikai/shared/external-identity/providers";
import {
  DEFAULT_PARTICIPATION_MODE,
  type InterviewParticipationMode,
} from "@mirai-gikai/shared/interview-participation/participation-mode";

export type ParticipationFormValues = {
  participation_mode: InterviewParticipationMode;
  allowed_provider_keys: ExternalIdentityProviderKey[];
};

/**
 * 保存済みの意見募集（または未保存）から、フォームに載せる参加条件を作る。
 * DB の allowed_provider_keys は text[] なので、レジストリにあるキーだけを残す。
 */
export function toParticipationFormValues(
  config:
    | {
        participation_mode: InterviewParticipationMode;
        allowed_provider_keys: string[];
      }
    | null
    | undefined
): ParticipationFormValues {
  return {
    participation_mode:
      config?.participation_mode ?? DEFAULT_PARTICIPATION_MODE,
    allowed_provider_keys: (config?.allowed_provider_keys ?? []).filter(
      isExternalIdentityProviderKey
    ),
  };
}
