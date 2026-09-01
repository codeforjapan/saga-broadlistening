import "server-only";

import { parseAssistantMessageContent } from "@mirai-gikai/shared/interview-report/parse-assistant-message";
import {
  findInterviewConfigById,
  findPolicyIdsByInterviewConfigId,
} from "@/features/interview-config/server/repositories/interview-config-repository";
import {
  findInterviewMessagesBySessionId,
  findInterviewSessionById,
  findOpinionSegmentsByOpinionId,
} from "@/features/interview-reports/server/repositories/interview-report-repository";
import type { OriginalInterviewSnapshot } from "../../shared/types";
import { findInterviewReportById } from "../repositories/interview-simulation-repository";

/**
 * ペルソナ抽出に使う元インタビューのスナップショットを取得する。
 *
 * 対話に使う設定・質問・施策は「編集中の設定値」を渡すため（改善版で再演する）、
 * ここでは元レポートの会話と属性だけを返す。
 */
export async function getReportSnapshotForSimulation(
  reportId: string
): Promise<OriginalInterviewSnapshot | null> {
  const report = await findInterviewReportById(reportId);
  if (!report) return null;

  const session = await findInterviewSessionById(report.interview_session_id);
  if (!session) return null;

  const [interviewConfig, messages] = await Promise.all([
    findInterviewConfigById(session.interview_config_id),
    findInterviewMessagesBySessionId(session.id),
  ]);

  if (!interviewConfig) return null;

  // 施策と意見募集は多対多。範囲判定では紐づく施策をすべて見る
  const policyIds = await findPolicyIdsByInterviewConfigId(interviewConfig.id);

  // 元会話を interviewer / interviewee の text のみに正規化。
  // Summary フェーズ（report 生成・確認ターン）は除外する。
  // 方針: 最初に report フィールドを含む assistant メッセージ or
  //       next_stage === "summary_complete" が出た時点で、以降は除外。
  // next_stage === "summary" のターン自体は「これから要約します」という
  // 移行宣言の発話なので chat 末尾として残す（本番 UI でもそう見える）。
  const rawMessages = messages ?? [];
  let summaryCutoffIndex = rawMessages.length;
  for (let i = 0; i < rawMessages.length; i++) {
    const m = rawMessages[i];
    if (m.role !== "assistant") continue;
    const parsed = parseAssistantMessageContent(m.content);
    if (parsed.hasReport || parsed.nextStage === "summary_complete") {
      summaryCutoffIndex = i;
      break;
    }
  }
  const conversation = rawMessages.slice(0, summaryCutoffIndex).map((m) => {
    const role: "interviewer" | "interviewee" =
      m.role === "assistant" ? "interviewer" : "interviewee";
    if (m.role === "assistant") {
      const parsed = parseAssistantMessageContent(m.content);
      return {
        role,
        content: parsed.text,
        quick_replies: parsed.quickReplies,
      };
    }
    return { role, content: m.content, quick_replies: null };
  });

  // 論点単位の意見は opinion_segments（旧 interview_report.opinions の JSONB）
  const segments = await findOpinionSegmentsByOpinionId(report.id);
  const opinions = segments.map((segment) => ({
    title: segment.title,
    content: segment.content,
    source_message_id: segment.source_message_id,
  }));

  const snapshot: OriginalInterviewSnapshot = {
    reportId: report.id,
    sessionId: session.id,
    configId: interviewConfig.id,
    policyIds,
    summary: report.summary ?? null,
    roleTitle: report.role_title ?? null,
    roleDescription: report.role_description ?? null,
    opinions,
    conversation,
    totalContentRichness: report.total_content_richness ?? null,
    rating: session.rating ?? null,
  };

  return snapshot;
}
