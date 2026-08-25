import { buildSummarySystemPrompt } from "@mirai-gikai/shared/interview-prompts/summary";
import type { PromptBillInput } from "@mirai-gikai/shared/interview-prompts/types";
import { buildInterviewOpinionRows } from "@mirai-gikai/shared/interview-report/build-opinion-rows";
import { enrichOpinionsWithSourceContent } from "@mirai-gikai/shared/interview-report/enrich-opinions";
import {
  type InterviewReportData,
  interviewReportSchema,
} from "@mirai-gikai/shared/interview-report/schema";
import { syncOpinionSegments } from "@mirai-gikai/shared/interview-report/sync-opinions";
import { createAdminClient } from "@mirai-gikai/supabase";
import { generateObject } from "ai";
import { fetchInterviewConfigContext } from "../repositories/analysis-repository";
import { markReextractionAttempted } from "../repositories/backfill-repository";
import {
  findInterviewMessagesBySessionId,
  findInterviewSessionById,
} from "../repositories/interview-repository";
import { OPINION_BACKFILL_MODEL } from "../shared/constants";
import type {
  BackfillTargetOpinion,
  InterviewConfigContext,
  ReextractResult,
} from "../shared/types";
import { prepareReextractionMessages } from "../utils/prepare-reextraction-messages";

/** 再抽出の生成ステップ（テストで Fake に差し替えられるよう DI 可能にする）。 */
export type GenerateReportFn = (params: {
  systemPrompt: string;
}) => Promise<InterviewReportData>;

/**
 * テーマ文脈の取得。同じ意見募集なら全意見で同じ内容になるため、
 * バックフィルの run 側でキャッシュ済みの取得関数を差し込めるようにしている。
 */
export type LoadConfigContextFn = (
  interviewConfigId: string
) => Promise<InterviewConfigContext>;

/** 指定モデルで再抽出する既定の生成関数を作る。 */
function createDefaultGenerateReport(model: string): GenerateReportFn {
  return async ({ systemPrompt }) => {
    const { object } = await generateObject({
      model,
      schema: interviewReportSchema,
      prompt: systemPrompt,
      experimental_telemetry: {
        isEnabled: true,
        functionId: "interview-opinion-backfill-reextract",
      },
    });
    return object;
  };
}

/**
 * 1意見の論点を新プロンプトで再抽出し、**opinion_segments テーブルのみ**更新する。
 * opinions 側の本文（final_text / summary / role_title 等）は「市民が確認して提出した
 * 当時の意見」の記録として書き換えない（再抽出はトピック分析用の論点だけを更新する）。
 * 成功時はテーブル同期に加えてウォーターマーク（opinions_reextracted_at）を進める。
 * 恒久的にスキップ（セッション/設定/メッセージ無し）の場合も進める。
 * ただし生成・同期の失敗時は進めない（次回再実行で再試行される）。
 */
export async function reextractReportOpinions(
  target: BackfillTargetOpinion,
  deps: {
    generateReport?: GenerateReportFn;
    model?: string;
    loadConfigContext?: LoadConfigContextFn;
  } = {}
): Promise<ReextractResult> {
  const { opinionId, sessionId } = target;
  const generateReport =
    deps.generateReport ??
    createDefaultGenerateReport(deps.model ?? OPINION_BACKFILL_MODEL);
  const loadConfigContext =
    deps.loadConfigContext ?? fetchInterviewConfigContext;
  const nowIso = new Date().toISOString();

  try {
    const session = await findInterviewSessionById(sessionId);
    if (!session) {
      await markReextractionAttempted(opinionId, nowIso);
      return { opinionId, status: "skipped", reason: "session not found" };
    }

    const [context, messages] = await Promise.all([
      loadConfigContext(session.interview_config_id),
      findInterviewMessagesBySessionId(sessionId),
    ]);

    const chatMessages = prepareReextractionMessages(messages ?? []);
    if (chatMessages.length === 0) {
      await markReextractionAttempted(opinionId, nowIso);
      return { opinionId, status: "skipped", reason: "no chat messages" };
    }

    // 意見募集に複数の施策が紐づく場合は先頭1件をプロンプトに接地させる
    // （複数施策の提示は Epic #8 側の UI 設計と合わせて対応する）。
    // 施策0件の抽象テーマ型では null を渡し、テーマの説明だけで接地する。
    const primaryPolicy = context.policies[0];
    const policy: PromptBillInput = primaryPolicy
      ? {
          name: primaryPolicy.name,
          bill_content: {
            title: primaryPolicy.name,
            summary: primaryPolicy.summary,
            content: primaryPolicy.body,
          },
        }
      : null;

    const systemPrompt = buildSummarySystemPrompt({
      bill: policy,
      interviewConfig: { description: context.description },
      messages: chatMessages,
    });

    const report = await generateReport({ systemPrompt });

    // source_message_id を元発言に解決して opinion_segments 行を作る。
    const enrichedOpinions = enrichOpinionsWithSourceContent(
      report.opinions,
      messages ?? []
    );

    // 再抽出は opinion_segments テーブルのみ更新する（opinions 本体は書き換えない）。
    // テーブル同期に成功した場合だけウォーターマークを進める。こうすることで
    // 「同期は失敗したのに完了扱い」になるのを防ぐ（次回再実行で再試行される）。
    // 再抽出は新プロンプトで生成するためタグも同時に得られる。タグ付け済みとして
    // ウォーターマークを立て、タグ付けバックフィルとの二重処理を避ける。
    await syncOpinionSegments(
      createAdminClient(),
      opinionId,
      buildInterviewOpinionRows(opinionId, enrichedOpinions, {
        tagsExtractedAtIso: nowIso,
      })
    );
    await markReextractionAttempted(opinionId, nowIso);

    return { opinionId, status: "updated" };
  } catch (error) {
    // 生成・更新・同期の失敗はウォーターマークを進めない（= 次回再実行で再試行される）。
    // 恒久的に処理不能なケース（セッション/メッセージ無し）のみ上の分岐で
    // markReextractionAttempted 済み。永続失敗による空回りは run 側の「前進ゼロで停止」で防ぐ。
    const reason = error instanceof Error ? error.message : "Unknown error";
    console.error(
      `[OpinionBackfill] Failed to reextract opinion ${opinionId}: ${reason}`
    );
    return { opinionId, status: "failed", reason };
  }
}
