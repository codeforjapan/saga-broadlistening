import { ChevronRight, Clock, Users } from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { RubySafeLineClamp } from "@/components/ruby-safe-line-clamp";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { InterviewTheme } from "../../shared/types/interview-theme";
import { formatEstimatedDuration } from "../../shared/utils/format-estimated-duration";
import {
  buildInterviewThemeCardAction,
  formatParticipantCount,
  type InterviewThemeCardPurpose,
} from "../../shared/utils/interview-theme";

interface InterviewThemeCardProps {
  theme: InterviewTheme;
  /** 置かれるセクションの見出し階層に合わせる */
  headingLevel?: "h2" | "h3";
  /** 参加導線（既定）か、募集終了テーマの結果導線か */
  purpose?: InterviewThemeCardPurpose;
}

/**
 * AIインタビューのテーマ1件を表すカード。
 * 募集中は参加導線（テーマのLP）へ、募集終了なら結果（トピック一覧）へ遷移する。
 */
export function InterviewThemeCard({
  theme,
  headingLevel: Heading = "h3",
  purpose = "participate",
}: InterviewThemeCardProps) {
  // 所要時間は参加する人向けの情報なので、結果を読ませるカードでは出さない。
  const estimatedDuration =
    purpose === "participate"
      ? formatEstimatedDuration(theme.estimatedDuration)
      : null;
  const participantCount = formatParticipantCount(theme.participantCount);
  const { href, ctaLabel } = buildInterviewThemeCardAction(theme.slug, purpose);

  return (
    <Link href={href as Route} className="block">
      {/* モバイルでは画像を上に縦積みし、sm以上で画像左の横並びに切り替える */}
      <Card className="flex flex-col overflow-hidden transition-colors hover:bg-muted/50 sm:flex-row">
        {/* テーマ画像。装飾なので alt は空にし、テーマ名は見出しで読ませる */}
        <div className="relative h-36 w-full sm:h-auto sm:min-h-28 sm:w-36 sm:shrink-0 sm:self-stretch">
          <Image
            src={theme.thumbnailUrl}
            alt=""
            fill
            className="object-cover"
            sizes="(min-width: 640px) 144px, 100vw"
          />
        </div>

        <div className="flex flex-1 flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <div className="flex flex-1 flex-col gap-1.5">
            {theme.categoryLabel && (
              <Badge variant="secondary" className="rounded-full px-3">
                {theme.categoryLabel}
              </Badge>
            )}
            <Heading className="text-2xl/8 font-bold">{theme.name}</Heading>
            <RubySafeLineClamp
              text={theme.description}
              maxLength={60}
              lineClamp={2}
              className="text-sm leading-relaxed text-muted-foreground"
            />
            {(estimatedDuration || participantCount) && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {estimatedDuration && (
                  <span className="flex items-center gap-1">
                    <Clock className="size-3.5" aria-hidden="true" />
                    {estimatedDuration}
                  </span>
                )}
                {participantCount && (
                  <span className="flex items-center gap-1">
                    <Users className="size-3.5" aria-hidden="true" />
                    {participantCount}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-1 self-end text-xs font-bold text-primary-accent sm:self-auto sm:text-sm">
            <span>{ctaLabel}</span>
            <span className="flex size-8 items-center justify-center rounded-full bg-secondary">
              <ChevronRight className="size-4" aria-hidden="true" />
            </span>
          </div>
        </div>
      </Card>
    </Link>
  );
}
