import "server-only";

import {
  CheckCircle2,
  Clock,
  Eye,
  Hourglass,
  MessageSquare,
  Star,
  Target,
  Users,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import type { InterviewStatistics as InterviewStatisticsType } from "../../shared/types";
import {
  formatDurationSeconds,
  formatTotalDurationSeconds,
} from "../../shared/utils/format-average-duration";

interface InterviewStatisticsProps {
  statistics: InterviewStatisticsType;
}

function StatCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <Card className="py-4">
      <CardContent className="flex items-start gap-3">
        <div className="rounded-lg bg-muted p-2 text-muted-foreground">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold tracking-tight">{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function FeedbackDistribution({
  irrelevantQuestions,
  notAligned,
  misunderstood,
  tooManyQuestions,
  other,
}: {
  irrelevantQuestions: number;
  notAligned: number;
  misunderstood: number;
  tooManyQuestions: number;
  other: number;
}) {
  const items = [
    { label: "質問が的外れ", count: irrelevantQuestions },
    { label: "話が噛み合わない", count: notAligned },
    { label: "言いたいことと違う", count: misunderstood },
    { label: "質問が多い", count: tooManyQuestions },
    { label: "その他", count: other },
  ];

  const maxCount = Math.max(...items.map((i) => i.count), 1);
  const total = items.reduce((sum, i) => sum + i.count, 0);

  if (total === 0) {
    return <p className="text-sm text-muted-foreground">データなし</p>;
  }

  return (
    <div className="space-y-1.5">
      {items.map((item) => {
        const pct = Math.round((item.count / maxCount) * 100);
        return (
          <div key={item.label} className="flex items-center gap-2 text-sm">
            <span className="w-28 text-muted-foreground shrink-0">
              {item.label}
            </span>
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-feedback-bar rounded-full"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="w-12 text-right text-muted-foreground">
              {item.count}件
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function InterviewStatistics({
  statistics: stats,
}: InterviewStatisticsProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard
          icon={<Users className="h-5 w-5" />}
          label="総セッション数"
          value={stats.totalSessions}
        />
        <StatCard
          icon={<CheckCircle2 className="h-5 w-5" />}
          label="完了済み"
          value={stats.completedSessions}
          sub={`完了率 ${stats.completionRate.toFixed(0)}%`}
        />
        <StatCard
          icon={<Star className="h-5 w-5" />}
          label="平均満足度"
          value={stats.avgRating != null ? stats.avgRating.toFixed(2) : "-"}
          sub={stats.avgRating != null ? "5段階評価" : undefined}
        />
        <StatCard
          icon={<Target className="h-5 w-5" />}
          label="平均充実度"
          value={
            stats.avgTotalContentRichness != null
              ? stats.avgTotalContentRichness.toFixed(1)
              : "-"
          }
          sub={stats.avgTotalContentRichness != null ? "100点満点" : undefined}
        />
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <StatCard
          icon={<MessageSquare className="h-5 w-5" />}
          label="平均メッセージ数"
          value={
            stats.avgMessageCount != null
              ? stats.avgMessageCount.toFixed(1)
              : "-"
          }
          sub="セッションあたり"
        />
        <StatCard
          icon={<Clock className="h-5 w-5" />}
          label="所要時間（中央値）"
          value={formatDurationSeconds(stats.medianDurationSeconds)}
        />
        <StatCard
          icon={<Hourglass className="h-5 w-5" />}
          label="総所要時間"
          value={formatTotalDurationSeconds(stats.totalDurationSeconds)}
          sub="途中離脱を含む"
        />
        <StatCard
          icon={<Eye className="h-5 w-5" />}
          label="公開許可"
          value={stats.publicByUserCount}
          sub={`公開率 ${stats.publicRate.toFixed(0)}%`}
        />
        <StatCard
          icon={<CheckCircle2 className="h-5 w-5" />}
          label="公開済み"
          value={stats.publishedCount}
          sub="レビュー済みで公開中"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card className="py-4">
          <CardContent>
            <p className="text-sm font-semibold">AIコスト</p>
            <p className="text-sm text-muted-foreground mt-1">
              AIの利用コストは Langfuse で集計しています。
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card className="py-4">
          <CardContent className="space-y-3">
            <p className="text-sm font-semibold">低評価フィードバック分布</p>
            <FeedbackDistribution
              irrelevantQuestions={stats.feedbackIrrelevantQuestions}
              notAligned={stats.feedbackNotAligned}
              misunderstood={stats.feedbackMisunderstood}
              tooManyQuestions={stats.feedbackTooManyQuestions}
              other={stats.feedbackOther}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
