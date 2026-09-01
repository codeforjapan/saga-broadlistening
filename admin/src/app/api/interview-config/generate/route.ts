import { requireAdmin } from "@/features/auth/server/lib/auth-server";
import { handleConfigGeneration } from "@/features/interview-config/server/services/handle-config-generation";
import type { ConfigGenerationStage } from "@/features/interview-config/shared/schemas";

export async function POST(req: Request) {
  try {
    await requireAdmin();
  } catch {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = await req.json();
  const {
    messages,
    billId,
    themeName,
    themeDescription,
    stage,
    existingThemes,
    existingQuestions,
    confirmedQuestions,
  }: {
    messages: Array<{ role: string; content: string }>;
    billId: string | null;
    themeName?: string | null;
    themeDescription?: string | null;
    stage: Extract<
      ConfigGenerationStage,
      "default_questions" | "question_proposal" | "theme_proposal"
    >;
    existingThemes?: string[];
    existingQuestions?: Array<{
      question: string;
      follow_up_guide?: string | null;
      quick_replies?: string[] | null;
    }>;
    confirmedQuestions?: Array<{
      question: string;
      follow_up_guide?: string | null;
      quick_replies?: string[] | null;
    }>;
  } = body;

  // 抽象テーマ型には施策がないため、代わりにテーマ名を手がかりにする
  if (!billId && !themeName?.trim()) {
    return new Response(
      JSON.stringify({ error: "billId or themeName is required" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  try {
    return await handleConfigGeneration({
      messages,
      billId,
      themeName,
      themeDescription,
      stage,
      existingThemes,
      existingQuestions,
      confirmedQuestions,
    });
  } catch (error) {
    console.error("Config generation error:", error);
    return new Response(
      error instanceof Error ? error.message : "エラーが発生しました。",
      { status: 500, headers: { "Content-Type": "text/plain; charset=utf-8" } }
    );
  }
}
