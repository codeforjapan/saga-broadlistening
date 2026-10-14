import type { LucideIcon } from "lucide-react";
import { Check, ChevronRight, Clock, Eye, Landmark, Undo2 } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { PastReportsSection } from "@/features/interview-report/client/components/past-reports-section";
import type { UserReportsResult } from "@/features/interview-report/server/loaders/get-user-reports-by-interview-config";
import type { LatestInterviewSession } from "@/features/interview-session/server/loaders/get-latest-interview-session";
import type { InterviewConfig } from "../../server/loaders/get-interview-config";
import type { InterviewParticipationView } from "../../shared/types/interview-participation-view";
import type { InterviewTarget } from "../../shared/types/interview-target";
import { formatEstimatedDuration } from "../../shared/utils/format-estimated-duration";
import { getInterviewDisclosureLink } from "../../shared/utils/interview-links";
import { stripAbout } from "../../shared/utils/kikasete-interview";
import { InterviewActionButtons } from "./interview-action-buttons";

export type KikasetePageVoices = {
  /** 「86件のご意見 · 2026.10.8 更新」 */
  meta: string;
  topicsHref: string;
};

interface KikasetePageProps {
  target: InterviewTarget;
  interviewConfig: InterviewConfig;
  /** 見出し下のサブ（親施策の本文のタイトル）。なければ出さない */
  subtitle: string | null;
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
 */
export function KikasetePage({
  target,
  interviewConfig,
  subtitle,
  sessionInfo,
  participation,
  userReports,
  voices,
  back,
}: KikasetePageProps) {
  const duration = formatEstimatedDuration(interviewConfig.estimated_duration);
  const points: { key: string; icon: LucideIcon; text: ReactNode }[] = [
    {
      key: "chat",
      icon: Clock,
      text: `AIが聞き役になるチャット形式です${duration ? `（${duration}）` : ""}`,
    },
    { key: "use", icon: Landmark, text: "回答は佐賀市の施策検討に活用します" },
    {
      key: "public",
      icon: Eye,
      text: (
        <>
          回答は<strong>公開されることがあります</strong>
          。個人がわかる情報は書かないでください
        </>
      ),
    },
  ];
  const startButtons = (
    <InterviewActionButtons
      target={target}
      sessionInfo={sessionInfo}
      participation={participation}
      tone="kikasete"
    />
  );

  return (
    <div className="bg-kikasete-50 px-4 pt-24 pb-10 md:pt-10">
      <div className="mx-auto flex max-w-[560px] flex-col items-center gap-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-xl font-bold leading-normal md:text-2xl">
            {stripAbout(interviewConfig.name)}
            について、あなたの声を聞かせてください
          </h1>
          {subtitle && (
            <p className="text-sm font-bold text-primary-accent">{subtitle}</p>
          )}
        </div>

        <ul className="flex w-full flex-col gap-3">
          {points.map(({ key, icon: Icon, text }) => (
            <li key={key} className="flex items-center gap-3 text-sm">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white text-kikasete-700">
                <Icon className="size-4" aria-hidden="true" />
              </span>
              <span>{text}</span>
            </li>
          ))}
        </ul>

        <div className="flex w-full flex-col gap-3">{startButtons}</div>

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
            <Button
              asChild
              variant="outline"
              className="self-start border-kikasete-400 text-kikasete-700"
            >
              <Link href={voices.topicsHref as Route}>
                トピック一覧を見る
                <ChevronRight aria-hidden="true" />
              </Link>
            </Button>
            <p className="text-xs text-muted-foreground">
              寄せられた意見をAIが整理したものです。佐賀市の方針や決定事項ではありません。
            </p>
          </section>
        )}

        <Link
          href={getInterviewDisclosureLink(target) as Route}
          className="self-start text-xs underline underline-offset-2"
        >
          AIインタビューに関する情報開示
        </Link>

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
              className="mt-1 size-4 shrink-0 text-kikasete-700"
              aria-hidden="true"
            />
            <span>{line}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
