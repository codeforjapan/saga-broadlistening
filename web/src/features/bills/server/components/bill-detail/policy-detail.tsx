import "server-only";

import type { DifficultyLevelEnum } from "@/features/bill-difficulty/shared/types";
import type { BillWithContent } from "../../../shared/types";
import { getPolicyFamily } from "../../loaders/get-policy-family";
import { validatePreviewToken } from "../../loaders/validate-preview-token";
import { BillDetailLayout } from "./bill-detail-layout";
import { ParentPolicyDetailLayout } from "./parent-policy-detail-layout";

interface PolicyDetailProps {
  bill: BillWithContent;
  currentDifficulty: DifficultyLevelEnum;
  previewToken?: string;
}

/**
 * 施策ページ（/bills/[id] と preview）。親施策ならテーマの親ページ、
 * それ以外（子施策・通常の施策）は現行の施策ページのレイアウトで出す（#156・#157）。
 */
export async function PolicyDetail({
  bill,
  currentDifficulty,
  previewToken,
}: PolicyDetailProps) {
  const [isPreview, family] = await Promise.all([
    validatePreviewToken(bill.id, previewToken),
    getPolicyFamily(bill),
  ]);

  if (family.kind === "parent") {
    return (
      <ParentPolicyDetailLayout
        bill={bill}
        currentDifficulty={currentDifficulty}
        childPolicies={family.children}
        interview={family.interview}
        isPreview={isPreview}
      />
    );
  }

  return (
    <BillDetailLayout
      bill={bill}
      currentDifficulty={currentDifficulty}
      pageKind={family.kind}
      isPreview={isPreview}
      previewToken={previewToken}
    />
  );
}
