import { unstable_cache } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";
import {
  findLatestInterviewConfigByPolicyId,
  findOpenInterviewConfigByPolicyId,
} from "../repositories/interview-config-repository";
import type { InterviewConfig } from "./get-interview-config";

export type { InterviewConfig };

/**
 * 管理者用のインタビュー設定取得
 * 複数設定がある場合は、募集中の設定を優先し、なければ最新の設定を返す
 */
export async function getInterviewConfigAdmin(
  billId: string
): Promise<InterviewConfig | null> {
  return _getCachedInterviewConfigAdmin(billId);
}

const _getCachedInterviewConfigAdmin = unstable_cache(
  async (billId: string): Promise<InterviewConfig | null> => {
    // まず募集中の設定を探す
    const { data: openData, error: openError } =
      await findOpenInterviewConfigByPolicyId(billId);

    if (openError) {
      console.error("Failed to fetch interview config (admin):", openError);
      return null;
    }

    if (openData) {
      return openData;
    }

    // 募集中の設定がなければ、最新の設定を返す
    const { data: latestData, error: latestError } =
      await findLatestInterviewConfigByPolicyId(billId);

    if (latestError) {
      console.error("Failed to fetch interview config (admin):", latestError);
      return null;
    }

    return latestData;
  },
  ["interview-config-admin"],
  {
    revalidate: 60, // 非公開設定をプレビューするので短めに
    tags: [CACHE_TAGS.INTERVIEW_CONFIGS],
  }
);
