import { unstable_cache } from "next/cache";
import { getDifficultyLevel } from "@/features/bill-difficulty/server/loaders/get-difficulty-level";
import type { DifficultyLevelEnum } from "@/features/bill-difficulty/shared/types";
import { CACHE_TAGS } from "@/lib/cache-tags";
import type { BillWithContent } from "../../shared/types";
import {
  findFeaturedBillsWithContents,
  findTagsByBillIds,
  findBillIdsWithPublicInterview,
} from "../repositories/bill-repository";

/**
 * 注目の施策を取得する
 * is_featured = true の公開済み施策を公開日の新しい順に取得
 */
export async function getFeaturedBills(): Promise<BillWithContent[]> {
  // キャッシュ外でcookiesにアクセス
  const difficultyLevel = await getDifficultyLevel();

  return _getCachedFeaturedBills(difficultyLevel);
}

const _getCachedFeaturedBills = unstable_cache(
  async (difficultyLevel: DifficultyLevelEnum): Promise<BillWithContent[]> => {
    const data = await findFeaturedBillsWithContents(difficultyLevel);

    if (data.length === 0) {
      return [];
    }

    // タグ情報とインタビュー状態を一括取得
    const billIds = data.map((item: { id: string }) => item.id);
    const [tagsByBillId, interviewBillIds] = await Promise.all([
      findTagsByBillIds(billIds),
      findBillIdsWithPublicInterview(billIds),
    ]);

    // データ構造を整形
    return data.map((item) => {
      const { policy_contents, ...bill } = item;
      return {
        ...bill,
        bill_content: Array.isArray(policy_contents)
          ? policy_contents[0]
          : undefined,
        tags: tagsByBillId.get(item.id) || [],
        hasPublicInterview: interviewBillIds.has(item.id),
      };
    }) as BillWithContent[];
  },
  ["featured-bills-list"],
  {
    revalidate: 600, // 10分（600秒）
    tags: [CACHE_TAGS.BILLS, CACHE_TAGS.INTERVIEW_CONFIGS],
  }
);
