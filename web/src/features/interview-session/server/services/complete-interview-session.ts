import "server-only";

import { buildInterviewOpinionRows } from "@mirai-gikai/shared/interview-report/build-opinion-rows";
import { syncOpinionSegments } from "@mirai-gikai/shared/interview-report/sync-opinions";
import { createAdminClient } from "@mirai-gikai/supabase";
import type { InterviewReportData } from "../../shared/schemas";
import type { InterviewReport } from "../../shared/types";
import {
  buildCompletedInterviewReportInsert,
  buildCompletedOpinionSources,
} from "../../shared/utils/complete-interview-report";
import { extractReportFromMessage } from "../../shared/utils/report-extraction";
import {
  findInterviewMessagesBySessionIdDesc,
  updateInterviewSessionCompleted,
  upsertInterviewReport,
} from "../repositories/interview-session-repository";
import { evaluateModerationScore } from "./evaluate-moderation-score";

type CompleteInterviewSessionParams = {
  sessionId: string;
  isPublicByUser?: boolean;
  isDataReuseConsented?: boolean;
};

/**
 * インタビューを完了し、会話中に生成されたレポートを保存する
 */
export async function completeInterviewSession({
  sessionId,
  isPublicByUser,
  isDataReuseConsented,
}: CompleteInterviewSessionParams): Promise<InterviewReport> {
  // メッセージ履歴を取得（新しい順）
  const messages = await findInterviewMessagesBySessionIdDesc(sessionId);

  // 最新のアシスタントメッセージからレポートを抽出
  let reportData: InterviewReportData | null = null;
  for (const message of messages) {
    if (message.role === "assistant") {
      reportData = extractReportFromMessage(message.content);
      if (reportData) {
        break;
      }
    }
  }

  if (!reportData) {
    throw new Error("No report found in conversation messages");
  }

  // モデレーションスコアを評価（タイムアウト30秒）
  const MODERATION_TIMEOUT_MS = 30_000;
  let moderationScore: number | null = null;
  let moderationReasoning: string | null = null;
  try {
    const moderation = await Promise.race([
      evaluateModerationScore({
        summary: reportData.summary,
        opinions: reportData.opinions,
        roleDescription: reportData.role_description,
        messages: [...messages].reverse().map((m) => ({
          role: m.role,
          content: m.content,
        })),
      }),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("Moderation evaluation timed out")),
          MODERATION_TIMEOUT_MS
        )
      ),
    ]);
    moderationScore = moderation.score;
    moderationReasoning = moderation.reasoning;
  } catch (error) {
    // モデレーション失敗はレポート保存をブロックしない
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(
      `Moderation evaluation failed for session ${sessionId}: ${message}`
    );
  }

  // レポートを保存（UPSERT）
  // content_richnessはZodスキーマでバリデーション済み（totalは0-100の整数）
  // moderation_statusはgenerated columnのためscoreのみ保存
  const report = await upsertInterviewReport(
    buildCompletedInterviewReportInsert({
      sessionId,
      reportData,
      moderationScore,
      moderationReasoning,
      isPublicByUser,
      isDataReuseConsented,
    })
  );

  // 論点単位の意見を opinion_segments へ同期する（トピック分析用の意見ストア）。
  // 失敗してもインタビュー完了はブロックしない。未同期分は意見再抽出バックフィルが取り込む。
  try {
    const opinionSources = buildCompletedOpinionSources({
      reportData,
      messages,
    });
    // レポート生成と同時にタグ（concern/proposal/reasoning_types）も得ているため、
    // タグ付け済みとしてウォーターマークを立てる（バックフィルの対象から外す）。
    await syncOpinionSegments(
      createAdminClient(),
      report.id,
      buildInterviewOpinionRows(report.id, opinionSources, {
        tagsExtractedAtIso: new Date().toISOString(),
      })
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(
      `Failed to sync opinion_segments for session ${sessionId}: ${message}`
    );
  }

  // セッションを完了
  await updateInterviewSessionCompleted(sessionId);

  return report;
}
