import { after } from "next/server";
import {
  checkSystemDailyCostLimit,
  checkSystemMonthlyCostLimit,
} from "@/features/chat/server/services/system-cost-guard";
import { chatErrorToResponse } from "@/features/chat/server/utils/chat-error-response";
import { getChatSupabaseUser } from "@/features/chat/server/utils/supabase-server";
import {
  handleInterviewChatRequest,
  InterviewAlreadyCompletedError,
} from "@/features/interview-session/server/services/handle-interview-chat-request";
import { jsonResponse } from "@/lib/api/response";
import {
  flushTelemetry,
  registerNodeTelemetry,
} from "@/lib/telemetry/register";

export async function POST(req: Request) {
  // Vercel node環境でinstrumentationが自動で起動しない問題対応
  // 明示的にtelemetryを初期化
  await registerNodeTelemetry();
  after(flushTelemetry);

  const body = await req.json();
  const {
    messages,
    interviewConfigId,
    action,
    isRetry,
    previewPolicyId,
    previewToken,
  }: {
    messages: Array<{ role: string; content: string }>;
    interviewConfigId: string;
    action?: unknown;
    isRetry?: boolean;
    previewPolicyId?: unknown;
    previewToken?: unknown;
  } = body;

  const {
    data: { user },
    error: getUserError,
  } = await getChatSupabaseUser();

  if (getUserError || !user) {
    return jsonResponse({ error: "Anonymous session required" }, 401);
  }

  if (!interviewConfigId) {
    return jsonResponse({ error: "interviewConfigId is required" }, 400);
  }

  try {
    // システム全体の予算上限チェック（日次・月次）
    await checkSystemDailyCostLimit();
    await checkSystemMonthlyCostLimit();

    return await handleInterviewChatRequest({
      messages,
      interviewConfigId,
      action: action === "end" ? "end" : undefined,
      isRetry,
      // 文字列以外は検証対象にしない（不正な型のトークンは未指定として扱う）
      previewPolicyId:
        typeof previewPolicyId === "string" ? previewPolicyId : undefined,
      previewToken: typeof previewToken === "string" ? previewToken : undefined,
      userId: user.id,
    });
  } catch (error) {
    if (error instanceof InterviewAlreadyCompletedError) {
      return jsonResponse({ error: "Interview already completed" }, 409);
    }
    console.error("Interview chat request error:", error);
    return chatErrorToResponse(error);
  }
}
