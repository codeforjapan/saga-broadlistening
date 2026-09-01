import { ArrowRight, Undo2 } from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { BillWithContent } from "@/features/bills/shared/types";
import { formatEstimatedDuration } from "@/features/interview-config/shared/utils/format-estimated-duration";
import {
  getBillDetailLink,
  getInterviewDisclosureLink,
  getInterviewExitLink,
} from "@/features/interview-config/shared/utils/interview-links";
import { PastReportsSection } from "@/features/interview-report/client/components/past-reports-section";
import type { UserReportsResult } from "@/features/interview-report/server/loaders/get-user-reports-by-interview-config";
import { InterviewStatusBadge } from "@/features/interview-session/client/components/interview-status-badge";
import { NewInterviewButton } from "@/features/interview-session/client/components/new-interview-button";
import type { LatestInterviewSession } from "@/features/interview-session/server/loaders/get-latest-interview-session";
import type { InterviewConfig } from "../../server/loaders/get-interview-config";
import type { InterviewTarget } from "../../shared/types/interview-target";
import { resolveInterviewThumbnail } from "../../shared/utils/interview-theme";
import { InterviewActionButtons } from "./interview-action-buttons";

interface InterviewLPPageProps {
  /** 参加導線の起点。施策経由かテーマ単独かでリンクの組み立てが変わる */
  target: InterviewTarget;
  /** 紐づく施策。抽象テーマ型では null */
  bill: BillWithContent | null;
  interviewConfig: InterviewConfig;
  sessionInfo: LatestInterviewSession | null;
  userReports?: UserReportsResult | null;
}

const FEATURES: {
  iconSrc: string;
  iconSize: { w: number; h: number };
  text: string;
}[] = [
  {
    iconSrc: "/icons/interview-ear.svg",
    iconSize: { w: 21, h: 29 },
    text: "あなたの経験や考えをAIがチャットで深掘りします",
  },
  {
    iconSrc: "/icons/interview-messages.svg",
    iconSize: { w: 33, h: 26 },
    text: "寄せられた回答は佐賀市の施策検討に活用します",
  },
  {
    iconSrc: "/icons/interview-landmark.svg",
    iconSize: { w: 30, h: 29 },
    text: "ご意見は佐賀市の施策検討に届けられる可能性があります",
  },
];

/** 施策名。難易度別コンテンツの見出しがあればそちらを優先する */
function getBillName(bill: BillWithContent): string {
  return bill.bill_content?.title ?? bill.name;
}

/** 施策詳細へのリンク。プレビュー中はトークンを引き継ぐ */
function getBillLink(target: InterviewTarget, bill: BillWithContent): string {
  return getBillDetailLink(
    bill.id,
    target.kind === "policy" ? target.previewToken : undefined
  );
}

function _InterviewLPHeader({
  bill,
  interviewConfig,
}: {
  bill: BillWithContent | null;
  interviewConfig: InterviewConfig;
}) {
  // 一覧のカードと同じ優先順位（テーマ→施策→既定）で決める
  const imageUrl = resolveInterviewThumbnail(
    interviewConfig.thumbnail_url,
    bill?.thumbnail_url
  );

  return (
    <div className="relative w-full h-50 md:h-80">
      <Image
        src={imageUrl}
        alt={bill ? getBillName(bill) : interviewConfig.name}
        fill
        className="object-cover"
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        priority
      />
    </div>
  );
}

function _InterviewLPHero({
  target,
  bill,
  interviewConfig,
  sessionInfo,
}: {
  target: InterviewTarget;
  bill: BillWithContent | null;
  interviewConfig: InterviewConfig;
  sessionInfo: LatestInterviewSession | null;
}) {
  return (
    <div className="flex flex-col items-center gap-6 px-4">
      <div className="flex flex-col items-center gap-3">
        <div className="inline-flex items-center justify-center gap-2 px-6 py-1 mb-3 bg-primary rounded-2xl">
          <span className="text-[13px] font-medium text-primary-foreground leading-tight">
            当事者・有識者の方へ
          </span>
        </div>
        <h1 className="text-2xl font-bold text-center leading-[1.5]">
          {bill ? "施策についてのAIインタビュー" : interviewConfig.name}
        </h1>
        {/* 施策があるときだけ、どの施策についての対話かをチップで示す */}
        {bill && (
          <Link href={getBillLink(target, bill) as Route}>
            <div className="inline-flex items-center justify-center gap-2.5 px-4 py-2 bg-white rounded-xl hover:bg-muted transition-opacity cursor-pointer">
              <span className="text-[13px] font-medium text-black leading-[1.87]">
                {getBillName(bill)}
              </span>
            </div>
          </Link>
        )}
        {sessionInfo && <InterviewStatusBadge status={sessionInfo.status} />}
      </div>

      <div className="flex flex-col gap-4 w-full max-w-[334px] pl-4">
        {FEATURES.map((feature) => (
          <div key={feature.text} className="flex items-center gap-4">
            <div className="flex-shrink-0 w-[54px] h-[54px] bg-white rounded-[30px] flex items-center justify-center">
              <Image
                src={feature.iconSrc}
                alt=""
                width={feature.iconSize.w}
                height={feature.iconSize.h}
              />
            </div>
            <span className="text-[15px] font-medium text-black leading-[1.73] whitespace-pre-line">
              {feature.text}
            </span>
          </div>
        ))}
      </div>

      {sessionInfo?.status !== "completed" && (
        <div className="w-full max-w-[560px] mt-2 flex flex-col gap-3">
          <InterviewActionButtons target={target} sessionInfo={sessionInfo} />
        </div>
      )}
    </div>
  );
}

function _InterviewOverviewSection({
  target,
  bill,
  interviewConfig,
}: {
  target: InterviewTarget;
  bill: BillWithContent | null;
  interviewConfig: InterviewConfig;
}) {
  // 抽象テーマ型には戻り先になる施策ページがないため、
  // 施策名のリンクと「施策詳細はこちら」ボタンをテーマ名の表示に置き換える
  const billLink = bill ? getBillLink(target, bill) : null;

  return (
    <div className="w-full max-w-[560px] mx-auto bg-white rounded-2xl p-6 space-y-4">
      <h2 className="text-[22px] font-bold text-black leading-[1.64]">
        インタビュー概要
      </h2>
      <div className="space-y-4 text-[15px] font-normal text-black leading-[1.87]">
        <p>
          {bill && billLink ? (
            <>
              佐賀市で検討されている
              <Link
                href={billLink as Route}
                className="text-primary-accent underline underline-offset-2 hover:opacity-70 transition-opacity"
              >
                {getBillName(bill)}
              </Link>
              について、AIがあなたの考えを深掘りするチャット型インタビューです
            </>
          ) : (
            <>
              「{interviewConfig.name}
              」について、AIがあなたの考えを深掘りするチャット型インタビューです
            </>
          )}
        </p>
        <p>
          いただいたご意見は、施策研究や施策の検討に活用し、本サービス上に公開される可能性があります。
        </p>
      </div>
      {billLink && (
        <div>
          <Link href={billLink as Route}>
            <Button
              variant="outline"
              className="w-full border border-black rounded-[100px] h-[48px] px-6 font-bold text-[15px] hover:opacity-90 transition-opacity flex items-center justify-center gap-4"
            >
              <span>施策詳細はこちら</span>
              <ArrowRight className="size-4" />
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}

function _InterviewDurationSection({
  estimatedDuration,
}: {
  estimatedDuration: number | null;
}) {
  const durationText = formatEstimatedDuration(estimatedDuration);

  if (!durationText) {
    return null;
  }

  return (
    <div className="w-full max-w-[560px] mx-auto bg-white rounded-2xl p-6 space-y-2">
      <h2 className="text-[22px] font-bold text-black leading-[1.64]">
        予定時間
      </h2>
      <p className="text-[22px] font-bold text-primary-accent leading-[1.64]">
        {durationText}
      </p>
    </div>
  );
}

// Epic #54 で interview_configs.themes（配列）は description（自由記述）に置き換わった。
// 改行区切りの各行をチェックリスト項目として表示する。
function _InterviewThemesSection({
  description,
}: {
  description: string | null | undefined;
}) {
  const themes =
    description
      ?.split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0) ?? [];

  if (themes.length === 0) {
    return null;
  }

  return (
    <div className="w-full max-w-[560px] mx-auto bg-white rounded-2xl p-6 space-y-4">
      <h2 className="text-[22px] font-bold text-black leading-[1.64]">
        質問テーマ
      </h2>
      <div className="flex flex-col gap-3">
        {themes.map((theme) => (
          <div key={theme} className="flex gap-2">
            <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center">
              <Image
                src="/icons/check-icon.svg"
                alt=""
                width={24}
                height={24}
                className="object-contain mt-2"
              />
            </div>
            <span className="text-[15px] font-normal text-black leading-[1.87]">
              {theme}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function _InterviewNoticeSection() {
  return (
    <div className="w-full max-w-[560px] mx-auto bg-white rounded-2xl p-6 space-y-4">
      <h2 className="text-[22px] font-bold text-black leading-[1.64]">
        注意事項
      </h2>
      <div className="space-y-3 text-[13px] font-normal text-black leading-[1.69]">
        <p>
          このインタビューはAIが対話形式で実施します。
          リラックスして、ご自身の考えや経験をお聞かせください。
        </p>
        <p>
          インタビューログは公開される可能性があるため、個人情報や機密情報などセンシティブな内容については記載しないようにしてください。
        </p>
      </div>
    </div>
  );
}

function _InterviewDisclosureLink({ target }: { target: InterviewTarget }) {
  const disclosureLink = getInterviewDisclosureLink(target);

  return (
    <div className="w-full max-w-[560px] mx-auto">
      <Link
        href={disclosureLink as Route}
        className="text-xs text-black leading-[1.83] underline underline-offset-2 hover:opacity-70 transition-opacity"
      >
        AIインタビューに関する情報開示
      </Link>
    </div>
  );
}

function _InterviewFooterActions({
  target,
  sessionInfo,
}: {
  target: InterviewTarget;
  sessionInfo: LatestInterviewSession | null;
}) {
  // ラベルは戻り先（getInterviewExitLink）と揃える。施策の有無ではなく
  // どの導線から入ったかで決まる
  const label =
    target.kind === "policy" ? "施策詳細に戻る" : "テーマ一覧に戻る";

  return (
    <div className="flex flex-col w-full max-w-[370px] mx-auto space-y-4">
      <InterviewActionButtons target={target} sessionInfo={sessionInfo} />
      <Link href={getInterviewExitLink(target) as Route}>
        <Button variant="outline" className="w-full">
          <Undo2 className="size-5" />
          <span>{label}</span>
        </Button>
      </Link>
    </div>
  );
}

export function InterviewLPPage({
  target,
  bill,
  interviewConfig,
  sessionInfo,
  userReports,
}: InterviewLPPageProps) {
  return (
    <div className="flex flex-col gap-8 pb-8 bg-secondary">
      <_InterviewLPHeader bill={bill} interviewConfig={interviewConfig} />
      <div className="flex flex-col items-center gap-8 px-4">
        <_InterviewLPHero
          target={target}
          bill={bill}
          interviewConfig={interviewConfig}
          sessionInfo={sessionInfo}
        />
        {userReports && userReports.reports.length > 0 && (
          <PastReportsSection reports={userReports.reports} />
        )}
        {sessionInfo?.status === "completed" && sessionInfo?.reportId && (
          <div className="w-full max-w-[560px]">
            <NewInterviewButton target={target} />
          </div>
        )}
        <_InterviewOverviewSection
          target={target}
          bill={bill}
          interviewConfig={interviewConfig}
        />
        <_InterviewDurationSection
          estimatedDuration={interviewConfig.estimated_duration}
        />
        <_InterviewThemesSection description={interviewConfig.description} />
        <_InterviewNoticeSection />
        <_InterviewDisclosureLink target={target} />
        <_InterviewFooterActions target={target} sessionInfo={sessionInfo} />
      </div>
    </div>
  );
}
