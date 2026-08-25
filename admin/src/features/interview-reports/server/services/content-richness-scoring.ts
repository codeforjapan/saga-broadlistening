import "server-only";

import { buildContentRichnessPrompt } from "@mirai-gikai/shared/content-richness/build-prompt";
import { contentRichnessResultSchema } from "@mirai-gikai/shared/content-richness/schemas";
import { generateObject } from "ai";
import { DEFAULT_CONTENT_RICHNESS_MODEL } from "@/lib/ai/models";
import {
  findInterviewMessagesBySessionId,
  findReportForModerationScoringById,
  updateContentRichness,
} from "../repositories/interview-report-repository";

/**
 * 単一レポートに対して情報充実度の再評価を実行する
 */
export async function runSingleContentRichnessScoring(
  reportId: string
): Promise<{ total: number }> {
  const report = await findReportForModerationScoringById(reportId);

  if (!report) {
    throw new Error(`Report not found: ${reportId}`);
  }

  const messages = await findInterviewMessagesBySessionId(
    report.interview_session_id
  );

  const { system, user } = buildContentRichnessPrompt({
    summary: report.summary,
    opinions: [...report.opinion_segments]
      .sort((a, b) => a.opinion_index - b.opinion_index)
      .map((segment) => ({ title: segment.title, content: segment.content })),
    roleDescription: report.role_description,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
  });

  const { object } = await generateObject({
    model: DEFAULT_CONTENT_RICHNESS_MODEL,
    schema: contentRichnessResultSchema,
    system,
    messages: [{ role: "user", content: user }],
  });

  await updateContentRichness(reportId, object);

  console.log(
    `[SingleContentRichness] report=${reportId} total=${object.total}`
  );

  return { total: object.total };
}
