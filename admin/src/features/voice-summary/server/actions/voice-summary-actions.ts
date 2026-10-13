"use server";

import { countPublicOpinionsByInterviewConfigId } from "@mirai-gikai/shared/report-publication/count-public-reports";
import { validateVoiceSummaryMarkdown } from "@mirai-gikai/shared/voice-summary/markdown";
import {
  canGenerateVoiceSummary,
  MIN_OPINIONS_FOR_VOICE_SUMMARY,
} from "@mirai-gikai/shared/voice-summary/threshold";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/features/auth/server/lib/auth-server";
import { routes } from "@/lib/routes";
import {
  invalidateWebCache,
  WEB_CACHE_TAGS,
} from "@/lib/utils/cache-invalidation";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import {
  archiveVoiceSummary,
  findVoiceSummaryById,
  insertVoiceSummary,
  publishVoiceSummary,
  updateVoiceSummaryDraft,
} from "../repositories/voice-summary-repository";

export type VoiceSummaryActionResult =
  | { success: true; id?: string }
  | { success: false; error: string; validationErrors?: string[] };

async function refresh(interviewConfigId: string, publicChanged: boolean) {
  revalidatePath(routes.interviewVoiceSummary(interviewConfigId));
  // 公開中の版が変わったら、web の親ページ・きかせてページ・まとめページのキャッシュを落とす
  if (publicChanged) {
    await invalidateWebCache([WEB_CACHE_TAGS.INTERVIEW_CONFIGS]);
  }
}

/** 下書きを保存する（記法の検証に通らなければ保存しない） */
export async function saveVoiceSummaryDraftAction(input: {
  id: string;
  contentMd: string;
}): Promise<VoiceSummaryActionResult> {
  try {
    const actor = await requireAdmin();
    const validation = validateVoiceSummaryMarkdown(input.contentMd);
    if (!validation.ok) {
      return {
        success: false,
        error: "記法のルールに合っていません",
        validationErrors: validation.errors,
      };
    }
    const summary = await findVoiceSummaryById(input.id);
    if (!summary) return { success: false, error: "まとめが見つかりません" };
    const updated = await updateVoiceSummaryDraft({
      id: input.id,
      contentMd: input.contentMd,
      editedBy: actor.id,
    });
    if (!updated) {
      return {
        success: false,
        error:
          "編集できるのは下書きだけです。公開中の版は複製してから編集してください",
      };
    }
    await refresh(summary.interview_config_id, false);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "保存できませんでした"),
    };
  }
}

/** 版を公開する（同じテーマで公開中だった版は公開終了になる） */
export async function publishVoiceSummaryAction(
  id: string
): Promise<VoiceSummaryActionResult> {
  try {
    await requireAdmin();
    const summary = await findVoiceSummaryById(id);
    if (!summary) return { success: false, error: "まとめが見つかりません" };
    // 公開前にも記法を確かめる（保存後にルールが変わった場合や、手で入れた版への備え）
    const validation = validateVoiceSummaryMarkdown(summary.content_md);
    if (!validation.ok) {
      return {
        success: false,
        error: "記法のルールに合っていないため公開できません",
        validationErrors: validation.errors,
      };
    }
    // 下書きを作ったあとで意見が非公開になり、最低件数を割っていることがある
    const opinionCount = await countPublicOpinionsByInterviewConfigId(
      summary.interview_config_id
    );
    if (!canGenerateVoiceSummary(opinionCount)) {
      return {
        success: false,
        error: `公開された意見が${MIN_OPINIONS_FOR_VOICE_SUMMARY}件以上あるテーマで公開できます（現在${opinionCount}件）`,
      };
    }
    await publishVoiceSummary(id);
    await refresh(summary.interview_config_id, true);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "公開できませんでした"),
    };
  }
}

/** 公開中の版を非公開にする */
export async function unpublishVoiceSummaryAction(
  id: string
): Promise<VoiceSummaryActionResult> {
  try {
    await requireAdmin();
    const summary = await findVoiceSummaryById(id);
    if (!summary) return { success: false, error: "まとめが見つかりません" };
    const archived = await archiveVoiceSummary(id);
    if (!archived) {
      return { success: false, error: "公開中の版ではありません" };
    }
    await refresh(summary.interview_config_id, true);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "非公開にできませんでした"),
    };
  }
}

/** 版を複製して下書きを作る（公開中・公開終了の版を直すとき） */
export async function duplicateVoiceSummaryAction(
  id: string
): Promise<VoiceSummaryActionResult> {
  try {
    const actor = await requireAdmin();
    const summary = await findVoiceSummaryById(id);
    if (!summary) return { success: false, error: "まとめが見つかりません" };
    const { id: newId } = await insertVoiceSummary({
      interview_config_id: summary.interview_config_id,
      topic_analysis_version_id: summary.topic_analysis_version_id,
      content_md: summary.content_md,
      status: "draft",
      source_topic_count: summary.source_topic_count,
      source_opinion_count: summary.source_opinion_count,
      source_topic_ids: summary.source_topic_ids,
      model: summary.model,
      prompt_version: summary.prompt_version,
      generated_at: summary.generated_at,
      edited_by: actor.id,
      edited_at: new Date().toISOString(),
    });
    await refresh(summary.interview_config_id, false);
    return { success: true, id: newId };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "複製できませんでした"),
    };
  }
}
