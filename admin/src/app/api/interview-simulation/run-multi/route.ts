import { resolveSubjectTitle } from "@mirai-gikai/shared/interview-prompts/subject-section";
import type {
  PromptBillInput,
  InterviewQuestion as PromptInterviewQuestion,
} from "@mirai-gikai/shared/interview-prompts/types";
import { requireAdmin } from "@/features/auth/server/lib/auth-server";
import { findInterviewConfigById } from "@/features/interview-config/server/repositories/interview-config-repository";
import { resolveSimulationScope } from "@/features/interview-simulation/server/loaders/resolve-simulation-scope";
import { runMultiSimulationPipeline } from "@/features/interview-simulation/server/services/run-multi-simulation-pipeline";
import { multiSimulationRunRequestSchema } from "@/features/interview-simulation/shared/schemas";
import type {
  MultiSimulationProgressEvent,
  MultiSimulationRunRequest,
} from "@/features/interview-simulation/shared/types";
import { validatePersonaSlots } from "@/features/interview-simulation/shared/utils/validate-persona-slots";
import { fetchBillWithContents } from "@/features/topic-analysis/server/repositories/topic-analysis-repository";
import { verifyInternalAuth } from "@/features/topic-analysis/server/utils/trigger-next-phase";

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

/** MultiSimulationRunRequest → pipeline params */
async function buildPipelineParams(params: MultiSimulationRunRequest) {
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
  const billData = scope.policyId
    ? await fetchBillWithContents(scope.policyId)
    : null;
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
      }
    : null;

  const improvedQuestions: PromptInterviewQuestion[] =
    params.improvedConfig.questions.map((q) => ({
      id: q.id,
      question: q.question,
      quick_replies: q.quick_replies ?? null,
      follow_up_guide: q.follow_up_guide ?? null,
    }));

  const promptInterviewConfig = {
    name: config.name,
    description: params.improvedConfig.description,
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
      // 名乗る対象名。本番の初回質問生成と同じ解決規則を使う
      subjectTitle: resolveSubjectTitle(bill, promptInterviewConfig),
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
