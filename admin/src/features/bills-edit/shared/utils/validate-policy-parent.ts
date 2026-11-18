/**
 * 施策の親子関係（policies.parent_policy_id）の検証。
 *
 * 親子は1階層だけにする（孫を許さない）。DB は自己参照だけを禁止しているので、
 * 残りのルールはここで判定する。
 */

export type PolicyParentCandidate = {
  id: string;
  parent_policy_id: string | null;
};

export type ValidatePolicyParentInput = {
  /** 編集中の施策のID。新規作成時は null */
  policyId: string | null;
  /** 設定しようとしている親施策のID（親を外す null の場合は検証不要なので渡さない） */
  parentPolicyId: string;
  /** parentPolicyId の施策。見つからないときは null */
  parent: PolicyParentCandidate | null;
  /** 編集中の施策がすでに持っている子施策の数 */
  childCount: number;
};

/** 問題がなければ null、あればエラーメッセージを返す */
export function validatePolicyParent({
  policyId,
  parentPolicyId,
  parent,
  childCount,
}: ValidatePolicyParentInput): string | null {
  if (parentPolicyId === policyId) {
    return "自分自身を親施策にはできません";
  }
  if (parent === null) {
    return "指定した親施策が見つかりません";
  }
  if (parent.parent_policy_id !== null) {
    return "子施策は親施策にできません（親子は1階層までです）";
  }
  if (childCount > 0) {
    return "子施策を持つ施策は、他の施策の子にできません";
  }
  return null;
}
