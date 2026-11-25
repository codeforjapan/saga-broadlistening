import { Check, ChevronRight, Undo2 } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { ChikatServiceLogo } from "@/components/chikat-logo";
import { Button } from "@/components/ui/button";
import { PastReportsSection } from "@/features/interview-report/client/components/past-reports-section";
import type { UserReportsResult } from "@/features/interview-report/server/loaders/get-user-reports-by-interview-config";
import type { LatestInterviewSession } from "@/features/interview-session/server/loaders/get-latest-interview-session";
import type { InterviewConfig } from "../../server/loaders/get-interview-config";
import type { InterviewParticipationView } from "../../shared/types/interview-participation-view";
import type { InterviewTarget } from "../../shared/types/interview-target";
import { getInterviewDisclosureLink } from "../../shared/utils/interview-links";
import { stripAbout } from "../../shared/utils/kikasete-interview";
import { InterviewActionButtons } from "./interview-action-buttons";

export type KikasetePageVoices = {
  /** 「86件のご意見 · 2026.10.8 更新」 */
  meta: string;
  /** 公開中のまとめ（問いと冒頭の段落）。なければ null */
  summary: {
    question: string | null;
    lead: string | null;
    href: string;
  } | null;
  /** トピック一覧。公開中のトピック分析がなければ null */
  topicsHref: string | null;
};

interface KikasetePageProps {
  target: InterviewTarget;
  interviewConfig: InterviewConfig;
  sessionInfo: LatestInterviewSession | null;
  participation: InterviewParticipationView;
  userReports?: UserReportsResult | null;
  /** これまでの声。公開中のトピック分析がなければ null（セクションごと出さない） */
  voices: KikasetePageVoices | null;
  /** 戻り先（テーマにつながる親施策ページ。なければテーマ一覧） */
  back: { href: string; label: string };
}

const CARD_CLASS = "w-full rounded-2xl bg-white p-6";

/**
 * きかせてページ（/interviews/[slug]、#158・デザイン「4. きかせて」）。
 * 「はじめる」はチャットに直行するので、ここはインタビューの説明と結果（これまでの声）を
 * 見たい人向けのサブ導線。同意はチャット冒頭の案内で取る。
 * 所要時間や公開の注意は開始画面と重なるので、ここには出さない（#272）。
 */
export function KikasetePage({
  target,
  interviewConfig,
  sessionInfo,
  participation,
  userReports,
  voices,
  back,
}: KikasetePageProps) {
  const startButtons = (
    <InterviewActionButtons
      target={target}
      sessionInfo={sessionInfo}
      participation={participation}
    />
  );

  return (
    <div className="theme-interview bg-secondary px-4 pt-24 pb-10 md:pt-10">
      <div className="mx-auto flex max-w-[560px] flex-col items-center gap-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <ChikatServiceLogo variant="kikasete" className="h-7 md:h-8" />
          <h1 className="text-xl font-bold leading-normal md:text-2xl">
            {stripAbout(interviewConfig.name)}
            について、あなたの声を聞かせてください
          </h1>
        </div>

        <div className="flex w-full flex-col gap-3">
          <div className="mx-auto flex w-full max-w-[370px] flex-col gap-3">
            {startButtons}
          </div>
          <Link
            href={getInterviewDisclosureLink(target) as Route}
            className="self-start text-xs underline underline-offset-2"
          >
            AIインタビューに関する情報開示
          </Link>
        </div>

        {userReports && userReports.reports.length > 0 && (
          <PastReportsSection reports={userReports.reports} />
        )}

        <AskedTopics description={interviewConfig.description} />

        {voices && (
          <section className={`${CARD_CLASS} flex flex-col gap-4`}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-lg font-bold">これまでの声</h2>
              <span className="text-xs text-muted-foreground">
                {voices.meta}
              </span>
            </div>
            {voices.summary?.question && (
              <h3 className="font-bold leading-normal">
                {voices.summary.question}
              </h3>
            )}
            {voices.summary?.lead && (
              <p className="text-sm leading-relaxed">{voices.summary.lead}</p>
            )}
            <div className="flex flex-wrap gap-2">
              {voices.summary && (
                <Button asChild size="sm" className="px-4">
                  <Link href={voices.summary.href as Route}>
                    まとめを見る
                    <ChevronRight aria-hidden="true" />
                  </Link>
                </Button>
              )}
              {voices.topicsHref && (
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="border-decor px-4 text-primary-accent"
                >
                  <Link href={voices.topicsHref as Route}>
                    トピック一覧を見る
                    <ChevronRight aria-hidden="true" />
                  </Link>
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              寄せられた意見をAIが整理したものです。佐賀市の方針や決定事項ではありません。
            </p>
          </section>
        )}

        <div className="flex w-full max-w-[370px] flex-col gap-3">
          {startButtons}
          <Button asChild variant="outline" className="w-full">
            <Link href={back.href as Route}>
              <Undo2 className="size-5" aria-hidden="true" />
              {back.label}
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

/** 聞きたいこと（テーマの説明。改行区切りの各行を項目として出す） */
function AskedTopics({ description }: { description: string | null }) {
  const lines =
    description
      ?.split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0) ?? [];

  if (lines.length === 0) {
    return null;
  }

  return (
    <section className={`${CARD_CLASS} flex flex-col gap-4`}>
      <h2 className="text-lg font-bold">聞きたいこと</h2>
      <ul className="flex flex-col gap-3">
        {lines.map((line) => (
          <li key={line} className="flex gap-2 text-sm leading-relaxed">
            <Check
              className="mt-1 size-4 shrink-0 text-primary-accent"
              aria-hidden="true"
            />
            <span>{line}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
