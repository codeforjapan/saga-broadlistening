import "server-only";

import { unstable_cache } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";
import {
  isInterviewVisible,
  type LinkedPolicy,
  toLinkedPolicies,
} from "../../shared/utils/interview-visibility";
import { findOpenInterviewConfigWithPoliciesBySlug } from "../repositories/interview-config-repository";
import type { InterviewConfig } from "./get-interview-config";

export type InterviewConfigWithPolicies = {
  config: InterviewConfig;
  policies: LinkedPolicy[];
};

/**
 * slug から募集中の意見募集を、紐づく施策つきで取得する。
 * テーマ単独の参加導線（/interviews/[slug]）の入口で使う。
 *
 * 募集中（status = 'open'）に限り、さらに紐づく施策がすべて未公開のテーマは
 * 除外するため、下書き・終了したテーマや未公開施策の意見募集は
 * URL を直接叩かれても表に出ない。
 */
export async function getInterviewConfigBySlug(
  slug: string
): Promise<InterviewConfigWithPolicies | null> {
  return _getCachedInterviewConfigBySlug(slug);
}

const _getCachedInterviewConfigBySlug = unstable_cache(
  async (slug: string): Promise<InterviewConfigWithPolicies | null> => {
    const { data, error } =
      await findOpenInterviewConfigWithPoliciesBySlug(slug);

    if (error) {
      console.error("Failed to fetch interview config by slug:", error);
      return null;
    }

    if (!data) {
      return null;
    }

    const { policies_interview_configs, ...config } = data;
    const policies = toLinkedPolicies(policies_interview_configs);

    if (!isInterviewVisible(policies)) {
      return null;
    }

    return { config, policies };
  },
  ["interview-config-by-slug"],
  {
    revalidate: 600, // 10分（600秒）
    tags: [CACHE_TAGS.INTERVIEW_CONFIGS, CACHE_TAGS.BILLS],
  }
);
