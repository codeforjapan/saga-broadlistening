"use server";

import { randomBytes } from "node:crypto";
import { requireAdmin } from "@/features/auth/server/lib/auth-server";
import { DEFAULT_INTERVIEW_CHAT_MODEL } from "@/lib/ai/models";
import {
  invalidateWebCache,
  WEB_CACHE_TAGS,
} from "@/lib/utils/cache-invalidation";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import {
  type InterviewConfigInput,
  interviewConfigSchema,
} from "../../shared/types";
import { prepareQuestionsForDuplication } from "../../shared/utils/prepare-questions-for-duplication";
import {
  closeInterviewConfigRecord,
  closeOtherOpenConfigs,
  createInterviewConfigRecord,
  createInterviewQuestions,
  deleteInterviewConfigRecord,
  findInterviewConfigById,
  findInterviewQuestionsByConfigId,
  findPolicyIdsByInterviewConfigId,
  linkPolicyToInterviewConfig,
  unpublishReportsByConfigId,
  updateInterviewConfigRecord,
} from "../repositories/interview-config-repository";

export type InterviewConfigResult =
  | { success: true; data: { id: string } }
  | { success: false; error: string };

export type DuplicateInterviewConfigResult =
  | { success: true; data: { id: string; billId: string } }
  | { success: false; error: string };

/** interview_configs.slug は NOT NULL かつ一意なため、複製時に採番する */
function buildDuplicatedSlug(originalSlug: string): string {
  return `${originalSlug}-copy-${randomBytes(4).toString("hex")}`;
}

/**
 * 新しいインタビュー設定を作成し、施策に紐づける
 */
export async function createInterviewConfig(
  billId: string,
  input: InterviewConfigInput
): Promise<InterviewConfigResult> {
  try {
    await requireAdmin();

    // バリデーション
    const validatedData = interviewConfigSchema.parse(input);

    // 募集中にする場合、同じ施策の他の募集中設定を終了する
    if (validatedData.status === "open") {
      await closeOtherOpenConfigs([billId]);
    }

    // 新規作成
    const data = await createInterviewConfigRecord({
      name: validatedData.name,
      slug: validatedData.slug,
      status: validatedData.status,
      description: validatedData.description || null,
      chat_model: validatedData.chat_model || DEFAULT_INTERVIEW_CHAT_MODEL,
      estimated_duration: validatedData.estimated_duration ?? null,
    });

    // 施策との紐づけ（policies_interview_configs）
    await linkPolicyToInterviewConfig(billId, data.id);

    // web側のキャッシュを無効化
    await invalidateWebCache([WEB_CACHE_TAGS.INTERVIEW_CONFIGS]);

    return { success: true, data: { id: data.id } };
  } catch (error) {
    console.error("Create interview config error:", error);
    return {
      success: false,
      error: getErrorMessage(
        error,
        "インタビュー設定の作成中にエラーが発生しました"
      ),
    };
  }
}

/**
 * 既存のインタビュー設定を更新する
 */
export async function updateInterviewConfig(
  configId: string,
  input: InterviewConfigInput
): Promise<InterviewConfigResult> {
  try {
    await requireAdmin();

    // バリデーション
    const validatedData = interviewConfigSchema.parse(input);

    // 募集中にする場合、同じ施策の他の募集中設定を終了する
    if (validatedData.status === "open") {
      const policyIds = await findPolicyIdsByInterviewConfigId(configId);
      await closeOtherOpenConfigs(policyIds, configId);
    }

    // 更新
    const data = await updateInterviewConfigRecord(configId, {
      name: validatedData.name,
      slug: validatedData.slug,
      status: validatedData.status,
      description: validatedData.description || null,
      chat_model: validatedData.chat_model || DEFAULT_INTERVIEW_CHAT_MODEL,
      estimated_duration: validatedData.estimated_duration ?? null,
      updated_at: new Date().toISOString(),
    });

    // web側のキャッシュを無効化
    await invalidateWebCache([WEB_CACHE_TAGS.INTERVIEW_CONFIGS]);

    return { success: true, data: { id: data.id } };
  } catch (error) {
    console.error("Update interview config error:", error);
    return {
      success: false,
      error: getErrorMessage(
        error,
        "インタビュー設定の更新中にエラーが発生しました"
      ),
    };
  }
}

/**
 * インタビュー設定を複製する（質問も含めてコピー）
 *
 * `options.targetBillId` を渡すと別の施策にコピーする。
 * 省略時は複製元と同じ施策に紐づける（従来動作）。
 * いずれの場合も新しい設定は status="closed" で作成する。
 */
export async function duplicateInterviewConfig(
  configId: string,
  options?: { targetBillId?: string }
): Promise<DuplicateInterviewConfigResult> {
  try {
    await requireAdmin();

    // 元の設定を取得
    const originalConfig = await findInterviewConfigById(configId);

    if (!originalConfig) {
      return {
        success: false,
        error: "複製元のインタビュー設定が見つかりません",
      };
    }

    // 元の質問を取得
    const originalQuestions = await findInterviewQuestionsByConfigId(configId);

    const linkedPolicyIds = await findPolicyIdsByInterviewConfigId(configId);
    const targetBillId = options?.targetBillId ?? linkedPolicyIds[0];

    if (!targetBillId) {
      return {
        success: false,
        error: "複製元のインタビュー設定に施策が紐づいていません",
      };
    }

    // 新しい設定を作成（ステータスは終了状態で複製）
    let newConfig: { id: string };
    try {
      newConfig = await createInterviewConfigRecord({
        name: `${originalConfig.name}（コピー）`,
        slug: buildDuplicatedSlug(originalConfig.slug),
        status: "closed" as const,
        description: originalConfig.description,
        chat_model: originalConfig.chat_model,
        estimated_duration: originalConfig.estimated_duration,
      });
      await linkPolicyToInterviewConfig(targetBillId, newConfig.id);
    } catch (error) {
      return {
        success: false,
        error: `インタビュー設定の複製に失敗しました: ${getErrorMessage(error, "unknown error")}`,
      };
    }

    // 質問を複製
    if (originalQuestions.length > 0) {
      const newQuestions = prepareQuestionsForDuplication(
        originalQuestions,
        newConfig.id
      );

      try {
        await createInterviewQuestions(newQuestions);
      } catch (error) {
        // 質問の複製に失敗した場合、作成した設定も削除
        await deleteInterviewConfigRecord(newConfig.id);
        return {
          success: false,
          error: `質問の複製に失敗しました: ${getErrorMessage(error, "unknown error")}`,
        };
      }
    }

    // web側のキャッシュを無効化
    await invalidateWebCache([WEB_CACHE_TAGS.INTERVIEW_CONFIGS]);

    return { success: true, data: { id: newConfig.id, billId: targetBillId } };
  } catch (error) {
    console.error("Duplicate interview config error:", error);
    return {
      success: false,
      error: getErrorMessage(
        error,
        "インタビュー設定の複製中にエラーが発生しました"
      ),
    };
  }
}

/**
 * インタビュー設定を削除する（status を closed にして一覧・公開から外す）
 */
export async function deleteInterviewConfig(
  configId: string
): Promise<InterviewConfigResult> {
  try {
    await requireAdmin();

    // 先に配下の意見を公開停止してから設定を終了状態にする。
    // この順序なら、途中で失敗しても「設定は募集中のまま／意見も公開のまま」
    // の整合した状態になり、再実行で安全にやり直せる（いずれも冪等）。
    await unpublishReportsByConfigId(configId);
    await closeInterviewConfigRecord(configId);

    // web側のキャッシュを無効化
    // - INTERVIEW_CONFIGS: 公開設定の取得
    // - BILLS: 施策一覧の「AIインタビュー受付中」バッジ・施策ページの公開意見件数
    await invalidateWebCache([
      WEB_CACHE_TAGS.BILLS,
      WEB_CACHE_TAGS.INTERVIEW_CONFIGS,
    ]);

    return { success: true, data: { id: configId } };
  } catch (error) {
    console.error("Delete interview config error:", error);
    return {
      success: false,
      error: getErrorMessage(
        error,
        "インタビュー設定の削除中にエラーが発生しました"
      ),
    };
  }
}
