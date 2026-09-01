import "server-only";

import { unstable_cache } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";
import {
  isInterviewVisible,
  type LinkedPolicy,
  toLinkedPolicies,
} from "../../shared/utils/interview-visibility";
import {
  findOpenInterviewConfigWithPoliciesBySlug,
  findResultsInterviewConfigWithPoliciesBySlug,
  type InterviewConfigWithPoliciesResult,
} from "../repositories/interview-config-repository";
import type { InterviewConfig } from "./get-interview-config";

export type InterviewConfigWithPolicies = {
  config: InterviewConfig;
  policies: LinkedPolicy[];
};

/**
 * 取得結果を公開判定込みで表示用の形に整える。
 *
 * 紐づく施策がすべて未公開のテーマは、URL を直接叩かれても表に出さない。
 */
async function resolveVisibleConfig(
  label: string,
  query: () => Promise<InterviewConfigWithPoliciesResult>
): Promise<InterviewConfigWithPolicies | null> {
  const { data, error } = await query();

  if (error) {
    console.error(`Failed to fetch ${label} interview config by slug:`, error);
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
}

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
  async (slug: string): Promise<InterviewConfigWithPolicies | null> =>
    resolveVisibleConfig("open", () =>
      findOpenInterviewConfigWithPoliciesBySlug(slug)
    ),
  ["interview-config-by-slug"],
  {
    revalidate: 600, // 10分（600秒）
    tags: [CACHE_TAGS.INTERVIEW_CONFIGS, CACHE_TAGS.BILLS],
  }
);

/**
 * slug から結果表示用の意見募集を、紐づく施策つきで取得する。
 * テーマ単独のトピック分析（/interviews/[slug]/topics）の入口で使う。
 *
 * 募集が終わった（closed）テーマでも分析結果は見せるため、参加導線と違って
 * status = 'open' に限定しない。下書き（draft）と未公開施策の意見募集は除外する。
 */
export async function getResultsInterviewConfigBySlug(
  slug: string
): Promise<InterviewConfigWithPolicies | null> {
  return _getCachedResultsInterviewConfigBySlug(slug);
}

const _getCachedResultsInterviewConfigBySlug = unstable_cache(
  async (slug: string): Promise<InterviewConfigWithPolicies | null> =>
    resolveVisibleConfig("results", () =>
      findResultsInterviewConfigWithPoliciesBySlug(slug)
    ),
  ["results-interview-config-by-slug"],
  {
    revalidate: 600, // 10分（600秒）
    tags: [CACHE_TAGS.INTERVIEW_CONFIGS, CACHE_TAGS.BILLS],
  }
);
