import "server-only";

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { findInterviewMetricsByConfig } from "@/features/interview-reports/server/repositories/interview-report-repository";
import { jsonResult } from "../utils/json-result";

/**
 * 意見募集（テーマ）ごとのAIインタビュー実施状況
 * （実施数・完了数・完了率・総回答時間）を取得する内部向け読み取りツール。
 */
export function registerInterviewMetricsTools(server: McpServer): void {
  server.registerTool(
    "get_interview_metrics_by_config",
    {
      title: "意見募集ごとのAIインタビュー実施状況を取得",
      description:
        "意見募集（テーマ）ごとにAIインタビューの実施数（開始されたセッション総数）・完了数（completed_atが設定されたセッション数）・完了率（完了数/実施数、0〜1）・総回答時間（total_duration_seconds、秒。完了セッションは completed_at−started_at、途中離脱セッションは最終発言までの時間で集計し、発言の無い未完了セッションは集計から除外）を返す。interviewConfigId未指定なら全テーマを実施数の多い順で返す。",
      inputSchema: {
        interviewConfigId: z
          .string()
          .uuid()
          .optional()
          .describe("対象の意見募集ID（未指定なら全テーマ）"),
      },
    },
    async ({ interviewConfigId }) => {
      const metrics = await findInterviewMetricsByConfig(interviewConfigId);
      return jsonResult(metrics);
    }
  );
}
