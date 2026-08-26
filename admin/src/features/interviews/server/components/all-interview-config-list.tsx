import { BarChart3, Sparkles } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { InterviewConfigWithBill } from "@/features/interview-config/server/repositories/interview-config-repository";
import { getStatusLabel } from "@/features/interview-config/shared/utils/get-status-label";
import { routes } from "@/lib/routes";

interface AllInterviewConfigListProps {
  configs: InterviewConfigWithBill[];
  sessionCounts: Record<string, number> | null;
}

export function AllInterviewConfigList({
  configs,
  sessionCounts,
}: AllInterviewConfigListProps) {
  return (
    <div>
      <div className="mb-4 text-sm text-gray-600">
        {configs.length}件のインタビュー設定
      </div>

      {configs.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          インタビュー設定がありません。
        </div>
      ) : (
        <div className="rounded-md border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>設定名</TableHead>
                <TableHead>施策</TableHead>
                <TableHead>ステータス</TableHead>
                <TableHead>セッション数</TableHead>
                <TableHead>作成日</TableHead>
                <TableHead>リンク</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {configs.map((config) => (
                <ConfigRow
                  key={config.id}
                  config={config}
                  sessionCount={
                    sessionCounts ? (sessionCounts[config.id] ?? 0) : null
                  }
                />
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function ConfigRow({
  config,
  sessionCount,
}: {
  config: InterviewConfigWithBill;
  sessionCount: number | null;
}) {
  // 施策が紐づいていない意見募集（抽象テーマ型）は施策配下のリンクを出せない
  const bill = config.bill;

  return (
    <TableRow>
      <TableCell>
        {bill ? (
          <Link
            href={routes.billInterviewEdit(bill.id, config.id) as Route}
            className="font-medium hover:underline"
          >
            {config.name}
          </Link>
        ) : (
          <span className="font-medium">{config.name}</span>
        )}
      </TableCell>
      <TableCell>
        {bill ? (
          <Link
            href={routes.billInterview(bill.id) as Route}
            className="text-gray-700 hover:underline"
          >
            {bill.name}
          </Link>
        ) : (
          <span className="text-gray-500">-</span>
        )}
      </TableCell>
      <TableCell>
        <Badge
          variant={config.status === "open" ? "default" : "secondary"}
          className="w-16 justify-center"
        >
          {getStatusLabel(config.status)}
        </Badge>
      </TableCell>
      <TableCell className="text-gray-600">{sessionCount ?? "-"}</TableCell>
      <TableCell className="text-gray-600">
        {new Date(config.created_at).toLocaleDateString("ja-JP")}
      </TableCell>
      <TableCell>
        {bill ? (
          <div className="flex items-center gap-1">
            <Button asChild variant="ghost" size="sm" className="gap-1">
              <Link href={routes.billReports(bill.id, config.id) as Route}>
                <BarChart3 className="h-4 w-4" />
                レポート
              </Link>
            </Button>
            <Button asChild variant="ghost" size="sm" className="gap-1">
              <Link
                href={routes.billTopicAnalysis(bill.id, config.id) as Route}
              >
                <Sparkles className="h-4 w-4" />
                トピック解析
              </Link>
            </Button>
          </div>
        ) : (
          <span className="text-gray-500">-</span>
        )}
      </TableCell>
    </TableRow>
  );
}
