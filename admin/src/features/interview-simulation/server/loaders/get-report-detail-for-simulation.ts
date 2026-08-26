import "server-only";

import type {
  PromptBillInput,
  InterviewConfig as PromptInterviewConfig,
  InterviewQuestion as PromptInterviewQuestion,
} from "@mirai-gikai/shared/interview-prompts/types";
import { parseAssistantMessageContent } from "@mirai-gikai/shared/interview-report/parse-assistant-message";
import {
  findInterviewConfigById,
  findInterviewQuestionsByConfigId,
  findPolicyIdsByInterviewConfigId,
} from "@/features/interview-config/server/repositories/interview-config-repository";
import {
  findInterviewMessagesBySessionId,
  findInterviewSessionById,
  findOpinionSegmentsByOpinionId,
} from "@/features/interview-reports/server/repositories/interview-report-repository";
import { fetchBillWithContents } from "@/features/topic-analysis/server/repositories/topic-analysis-repository";
import type { OriginalInterviewSnapshot } from "../../shared/types";
import { findInterviewReportById } from "../repositories/interview-simulation-repository";

export interface ReportDetailForSimulation {
  snapshot: OriginalInterviewSnapshot;
  bill: PromptBillInput;
  interviewConfig: PromptInterviewConfig;
  questions: PromptInterviewQuestion[];
  /** 保存済み config の estimated_duration（分）。本番のタイムマネジメント用 */
  estimatedDurationMinutes: number | null;
}

/**
 * シミュレーションに必要な「元レポート + 設定 + 質問 + 議案」を一括取得する。
 */
export async function getReportDetailForSimulation(
  reportId: string
): Promise<ReportDetailForSimulation | null> {
  const report = await findInterviewReportById(reportId);
  if (!report) return null;

  const session = await findInterviewSessionById(report.interview_session_id);
  if (!session) return null;

  const [interviewConfig, questions, messages] = await Promise.all([
    findInterviewConfigById(session.interview_config_id),
    findInterviewQuestionsByConfigId(session.interview_config_id),
    findInterviewMessagesBySessionId(session.id),
  ]);

  if (!interviewConfig) return null;

  // 施策と意見募集は多対多。既存 UI は最初の1件だけを使う
  const [policyId] = await findPolicyIdsByInterviewConfigId(interviewConfig.id);
  if (!policyId) return null;

  const billData = await fetchBillWithContents(policyId);

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
    billId: policyId,
    summary: report.summary ?? null,
    roleTitle: report.role_title ?? null,
    roleDescription: report.role_description ?? null,
    opinions,
    conversation,
    totalContentRichness: report.total_content_richness ?? null,
    rating: session.rating ?? null,
  };

  const bill: PromptBillInput = {
    name: billData.bill.name,
    knowledge_source: billData.bill.knowledge_source,
    bill_content: {
      title: billData.billTitle,
      summary: billData.billSummary,
      content: billData.billContent,
    },
  };

  const promptInterviewConfig: PromptInterviewConfig = {
    description: interviewConfig.description,
  };

  const promptQuestions: PromptInterviewQuestion[] = (questions ?? []).map(
    (q) => ({
      id: q.id,
      question: q.question,
      quick_replies: q.quick_replies ?? null,
      follow_up_guide: q.follow_up_guide ?? null,
    })
  );

  return {
    snapshot,
    bill,
    interviewConfig: promptInterviewConfig,
    questions: promptQuestions,
    estimatedDurationMinutes: interviewConfig.estimated_duration ?? null,
  };
}
