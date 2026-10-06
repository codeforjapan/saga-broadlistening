import type { ExternalIdentityProviderKey } from "@mirai-gikai/shared/external-identity/providers";
import {
  canParticipateInInterview,
  type InterviewParticipationRule,
  PUBLIC_PARTICIPATION_RULE,
} from "@mirai-gikai/shared/interview-participation/participation-mode";

export type LinkedExternalIdentity = {
  id: string;
  providerKey: ExternalIdentityProviderKey;
};

export type InterviewParticipation = {
  /** テーマの参加条件を満たしているか */
  allowed: boolean;
  /** 回答（セッション）に記録する外部ID。紐付きがなければ null */
  externalIdentityId: string | null;
};

/**
 * 解決済みの外部ID一覧からテーマの参加可否を決め、セッションに記録する外部IDを選ぶ。
 *
 * - 職員プレビュー（isPreview）は参加条件を問わない（public として扱う）
 * - 記録する外部IDは、許可された連携元のものを優先し、なければ先頭（Cookie 由来）
 *   参加条件に関係なく、紐付きがあれば記録する（属性データの突合は public テーマも対象）
 */
export function evaluateInterviewParticipation(params: {
  rule: InterviewParticipationRule;
  identities: readonly LinkedExternalIdentity[];
  isPreview?: boolean;
}): InterviewParticipation {
  const { identities, isPreview = false } = params;
  const rule = isPreview ? PUBLIC_PARTICIPATION_RULE : params.rule;

  const preferred =
    identities.find((identity) =>
      params.rule.allowed_provider_keys.includes(identity.providerKey)
    ) ?? identities[0];

  return {
    allowed: canParticipateInInterview({
      rule,
      linkedProviderKeys: identities.map((identity) => identity.providerKey),
    }),
    externalIdentityId: preferred?.id ?? null,
  };
}
