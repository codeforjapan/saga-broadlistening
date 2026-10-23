// Epic #54 で bills_tags → policies_tags になったためカラム名は policy_id。
// 関数名（...ByBillId）の改名は Epic #8 完了後のフォローアップ。
type BillTag = {
  policy_id: string;
  tags: { id: string; label: string } | null;
};

/**
 * policy_idごとにタグをグループ化する
 */
export function groupTagsByBillId(
  billTags: BillTag[]
): Map<string, Array<{ id: string; label: string }>> {
  return billTags.reduce((acc, bt) => {
    if (bt.tags) {
      const existing = acc.get(bt.policy_id) ?? [];
      acc.set(bt.policy_id, [...existing, bt.tags]);
    }
    return acc;
  }, new Map<string, Array<{ id: string; label: string }>>());
}
