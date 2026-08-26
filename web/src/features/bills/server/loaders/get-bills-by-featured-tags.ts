import { unstable_cache } from "next/cache";
import { getDifficultyLevel } from "@/features/bill-difficulty/server/loaders/get-difficulty-level";
import type { DifficultyLevelEnum } from "@/features/bill-difficulty/shared/types";
import { CACHE_TAGS } from "@/lib/cache-tags";
import type { BillsByTag } from "../../shared/types";
import {
  findFeaturedTags,
  findPublishedBillsByTag,
  findBillIdsWithPublicInterview,
} from "../repositories/bill-repository";

/**
 * Featured表示用の施策をタグごとにグループ化して取得
 * featured_priorityが設定されているタグを持つ施策を優先度順に取得
 */
export async function getBillsByFeaturedTags(): Promise<BillsByTag[]> {
  // キャッシュ外でcookiesにアクセス
  const difficultyLevel = await getDifficultyLevel();

  return _getCachedBillsByFeaturedTags(difficultyLevel);
}

const _getCachedBillsByFeaturedTags = unstable_cache(
  async (difficultyLevel: DifficultyLevelEnum): Promise<BillsByTag[]> => {
    const featuredTags = await findFeaturedTags();

    if (featuredTags.length === 0) {
      return [];
    }

    // 各タグの施策を並列で取得
    const results = await Promise.all(
      featuredTags.map(async (tag) => {
        const data = await findPublishedBillsByTag(tag.id, difficultyLevel);

        if (!data || data.length === 0) {
          return null;
        }

        // データを整形
        const bills = data
          .map((item) => {
            const billData = item.policies;
            if (!billData) return null;

            const { policy_contents, policies_tags, ...bill } = billData;
            const billContent = Array.isArray(policy_contents)
              ? policy_contents[0]
              : undefined;

            // 施策に紐づくすべてのタグを取得
            const tags = Array.isArray(policies_tags)
              ? policies_tags
                  .map((bt) => bt.tags)
                  .filter((t): t is NonNullable<typeof t> => t !== null)
              : [];

            return {
              ...bill,
              bill_content: billContent,
              tags,
            };
          })
          .filter((bill): bill is NonNullable<typeof bill> => bill !== null);

        if (bills.length === 0) {
          return null;
        }

        return {
          tag: {
            id: tag.id,
            label: tag.label,
            description: tag.description ?? undefined,
            priority: tag.featured_priority ?? -1,
          },
          bills,
        };
      })
    );

    // nullを除外
    const filteredResults = results.filter(
      (result): result is NonNullable<typeof result> => result !== null
    );

    // 全施策のIDを収集してインタビュー状態を一括取得
    const allBillIds = filteredResults.flatMap((r) => r.bills.map((b) => b.id));
    const interviewBillIds = await findBillIdsWithPublicInterview(allBillIds);

    // インタビュー状態を付与
    return filteredResults.map((result) => ({
      ...result,
      bills: result.bills.map((bill) => ({
        ...bill,
        hasPublicInterview: interviewBillIds.has(bill.id),
      })),
    }));
  },
  ["featured-bills-list"],
  {
    revalidate: 600, // 10分（600秒）
    tags: [CACHE_TAGS.BILLS, CACHE_TAGS.INTERVIEW_CONFIGS],
  }
);
