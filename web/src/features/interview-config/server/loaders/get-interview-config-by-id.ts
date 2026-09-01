import "server-only";

import { unstable_cache } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { toLinkedPolicies } from "../../shared/utils/interview-visibility";
import { findInterviewConfigWithPoliciesById } from "../repositories/interview-config-repository";
import type { InterviewConfigWithPolicies } from "./get-interview-config-by-slug";

/**
 * IDから意見募集を、紐づく施策つきで取得する（ステータス問わず）。
 *
 * 対話は1メッセージごとにこの取得を通るため、slug 版と同じくキャッシュに載せる。
 * 公開してよいかの判定は呼び出し側（resolveInterviewChatContext）が行う。
 */
export async function getInterviewConfigWithPoliciesById(
  configId: string
): Promise<InterviewConfigWithPolicies | null> {
  return _getCachedInterviewConfigById(configId);
}

const _getCachedInterviewConfigById = unstable_cache(
  async (configId: string): Promise<InterviewConfigWithPolicies | null> => {
    const { data, error } = await findInterviewConfigWithPoliciesById(configId);

    if (error) {
      console.error("Failed to fetch interview config:", error);
      return null;
    }

    if (!data) {
      return null;
    }

    const { policies_interview_configs, ...config } = data;
    return { config, policies: toLinkedPolicies(policies_interview_configs) };
  },
  ["interview-config-by-id"],
  {
    revalidate: 600, // 10分（600秒）
    tags: [CACHE_TAGS.INTERVIEW_CONFIGS, CACHE_TAGS.BILLS],
  }
);
