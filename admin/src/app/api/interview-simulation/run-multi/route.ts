import { toPromptRelatedPolicies } from "@mirai-gikai/shared/interview-prompts/to-prompt-related-policies";
import type {
  PromptBillInput,
  InterviewQuestion as PromptInterviewQuestion,
  PromptRelatedPolicyInput,
} from "@mirai-gikai/shared/interview-prompts/types";
import { after } from "next/server";
import type { z } from "zod";
import { requireAdmin } from "@/features/auth/server/lib/auth-server";
import {
  findInterviewConfigById,
  findPolicyContentsByIds,
  findPolicyIdsByInterviewConfigId,
} from "@/features/interview-config/server/repositories/interview-config-repository";
import { resolveSimulationScope } from "@/features/interview-simulation/server/loaders/resolve-simulation-scope";
import { runMultiSimulationPipeline } from "@/features/interview-simulation/server/services/run-multi-simulation-pipeline";
import { multiSimulationRunRequestSchema } from "@/features/interview-simulation/shared/schemas";
import type { MultiSimulationProgressEvent } from "@/features/interview-simulation/shared/types";
import { validatePersonaSlots } from "@/features/interview-simulation/shared/utils/validate-persona-slots";
import { fetchBillWithContents } from "@/features/topic-analysis/server/repositories/topic-analysis-repository";
import { verifyInternalAuth } from "@/features/topic-analysis/server/utils/trigger-next-phase";
import { flushTelemetry } from "@/lib/telemetry/register";

export const maxDuration = 300;

/**
 * 認証: Bearer トークン（内部呼び出し）または Cookie セッション（クライアント直接）。
 */
async function authenticate(request: Request): Promise<Response | null> {
  const authHeader = request.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    try {
      verifyInternalAuth(request);
      return null;
    } catch {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
  }
  try {
    await requireAdmin();
    return null;
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
}

/**
 * 本番の対話と同じく、主たる施策以外に紐づく施策の標準（normal）本文も並べる。
 * シミュレーションは職員の確認用なので、施策の公開状態は問わない。
 */
async function fetchRelatedPolicies(
  interviewConfigId: string,
  primaryPolicyId: string
): Promise<PromptRelatedPolicyInput[]> {
  const policyIds = (
    await findPolicyIdsByInterviewConfigId(interviewConfigId)
  ).filter((id) => id !== primaryPolicyId);
  const rows = await findPolicyContentsByIds(policyIds, "normal");
  return toPromptRelatedPolicies(policyIds, rows);
}

/** MultiSimulationRunRequest → pipeline params */
async function buildPipelineParams(
  params: z.output<typeof multiSimulationRunRequestSchema>
) {
  const config = await findInterviewConfigById(params.interviewConfigId);
  if (!config) {
    return {
      ok: false as const,
      error: "対象の意見募集が見つかりません",
      status: 404,
    };
  }

  // 範囲はサーバー側で意見募集から決める。クライアントが施策を指定できないため、
  // 無関係な施策の資料でペルソナを作らせたり、その施策配下のレポートを
  // 素材に使わせたりする余地がない
  const scope = await resolveSimulationScope(params.interviewConfigId);

  // 抽象テーマ型（施策なし）では施策を読まず、テーマの説明だけを材料にする
  const [billData, relatedPolicies] = scope.policyId
    ? await Promise.all([
        fetchBillWithContents(scope.policyId),
        fetchRelatedPolicies(params.interviewConfigId, scope.policyId),
      ])
    : [null, []];
  if (scope.policyId && !billData?.bill) {
    return {
      ok: false as const,
      error: "対象の施策が見つかりません",
      status: 404,
    };
  }

  const bill: PromptBillInput = billData?.bill
    ? {
        name: billData.bill.name,
        knowledge_source: billData.bill.knowledge_source,
        bill_content: {
          title: billData.billTitle,
          summary: billData.billSummary,
          content: billData.billContent,
        },
        related_policies: relatedPolicies,
      }
    : null;

  const improvedQuestions: PromptInterviewQuestion[] =
    params.improvedConfig.questions.map((q) => ({
      id: q.id,
      question: q.question,
      quick_replies: q.quick_replies ?? null,
      follow_up_guide: q.follow_up_guide ?? null,
    }));

  // 説明文は改善版を、目的・意見がほしい点などは保存済みの設定を使う
  const promptInterviewConfig = {
    name: config.name,
    description: params.improvedConfig.description,
    purpose_type: config.purpose_type,
    opinion_focus: config.opinion_focus,
    decided_matters: config.decided_matters,
  };

  return {
    ok: true as const,
    params: {
      scope,
      personaSlots: params.personaSlots,
      improvedPromptInputs: {
        bill,
        interviewConfig: promptInterviewConfig,
        questions: improvedQuestions,
        estimatedDurationMinutes:
          params.improvedConfig.estimatedDurationMinutes ?? null,
      },
      interviewerModel: params.interviewerModel,
      intervieweeModel: params.intervieweeModel,
      personaModel: params.personaModel,
    },
  };
}

export async function POST(request: Request) {
  const authError = await authenticate(request);
  if (authError) return authError;

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = multiSimulationRunRequestSchema.safeParse(rawBody);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    const path = firstIssue?.path.join(".") ?? "";
    return Response.json(
      {
        error: firstIssue
          ? `リクエストが不正です (${path}: ${firstIssue.message})`
          : "リクエストが不正です",
      },
      { status: 400 }
    );
  }

  // zod で捕捉しきれないビジネスルール（重複 reportId 等）をここで弾く
  const slotValidation = validatePersonaSlots(parsed.data.personaSlots);
  if (!slotValidation.ok) {
    return Response.json({ error: slotValidation.error }, { status: 400 });
  }

  const built = await buildPipelineParams(parsed.data);
  if (!built.ok) {
    return Response.json({ error: built.error }, { status: built.status });
  }

  // `application/x-ndjson, */*` や q パラメータ付きでも受け入れられるよう includes で判定
  const wantsStream = (request.headers.get("Accept") ?? "").includes(
    "application/x-ndjson"
  );
  if (!wantsStream) {
    // 非ストリーミングは一旦サポートしない（UI はストリーミング前提）
    return Response.json(
      { error: "Accept: application/x-ndjson が必要です" },
      { status: 406 }
    );
  }

  after(flushTelemetry);
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const emit = (event: MultiSimulationProgressEvent) => {
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      };
      try {
        await runMultiSimulationPipeline({
          ...built.params,
          onProgress: emit,
          signal: request.signal,
        });
      } catch (error) {
        if (request.signal.aborted) {
          console.log("[MultiSimulation] aborted by client");
        } else {
          console.error("[MultiSimulation] pipeline failed:", error);
          emit({
            type: "global_status",
            message:
              error instanceof Error
                ? error.message
                : "シミュレーションに失敗しました",
          });
        }
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
