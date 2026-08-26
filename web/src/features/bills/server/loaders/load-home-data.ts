import { getBillsByFeaturedTags } from "@/features/bills/server/loaders/get-bills-by-featured-tags";
import { getFeaturedBills } from "./get-featured-bills";

/**
 * トップページ用のデータを並列取得する
 * BFF (Backend For Frontend) パターン
 */
export async function loadHomeData() {
  const [featuredBills, billsByTag] = await Promise.all([
    getFeaturedBills(),
    getBillsByFeaturedTags(),
  ]);

  return {
    billsByTag,
    featuredBills,
  };
}
