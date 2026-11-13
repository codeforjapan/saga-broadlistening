import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/features/auth/server/lib/auth-server";
import { generateVoiceSummaryDraft } from "@/features/voice-summary/server/services/generate-voice-summary-draft";
import { routes } from "@/lib/routes";
import { flushTelemetry } from "@/lib/telemetry/register";

const bodySchema = z.object({ interviewConfigId: z.uuid() });

// 生成は LLM の呼び出し（記法の検証に落ちたら1回だけ再生成）を含むので長めに取る
export const maxDuration = 300;

/** 公開中のトピック分析から、みんなの声のまとめの下書きを AI で作る（#160） */
export async function POST(req: Request) {
  try {
    await requireAdmin();
  } catch {
    return new Response("Unauthorized", { status: 401 });
  }
  after(flushTelemetry);

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json(
      { success: false, error: "interviewConfigId が正しくありません" },
      { status: 400 }
    );
  }
  const { interviewConfigId } = parsed.data;

  try {
    const result = await generateVoiceSummaryDraft(interviewConfigId);
    if (result.success) {
      revalidatePath(routes.interviewVoiceSummary(interviewConfigId));
    }
    return Response.json(result, { status: result.success ? 200 : 422 });
  } catch (error) {
    console.error("Voice summary generation failed:", error);
    return Response.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "まとめを生成できませんでした",
      },
      { status: 500 }
    );
  }
}
