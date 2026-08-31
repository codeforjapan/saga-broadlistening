import { ChevronRight, Clock, Users } from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { RubySafeLineClamp } from "@/components/ruby-safe-line-clamp";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { themeInterviewTarget } from "../../shared/types/interview-target";
import type { InterviewTheme } from "../../shared/types/interview-theme";
import { formatEstimatedDuration } from "../../shared/utils/format-estimated-duration";
import { getInterviewLPLink } from "../../shared/utils/interview-links";
import { formatParticipantCount } from "../../shared/utils/interview-theme";

interface InterviewThemeCardProps {
  theme: InterviewTheme;
  /** 置かれるセクションの見出し階層に合わせる */
  headingLevel?: "h2" | "h3";
}

/** AIインタビューのテーマ1件を表すカード。押すとそのテーマのLPへ遷移する */
export function InterviewThemeCard({
  theme,
  headingLevel: Heading = "h3",
}: InterviewThemeCardProps) {
  const estimatedDuration = formatEstimatedDuration(theme.estimatedDuration);
  const participantCount = formatParticipantCount(theme.participantCount);

  return (
    <Link
      href={getInterviewLPLink(themeInterviewTarget(theme.slug)) as Route}
      className="block"
    >
      <Card className="flex overflow-hidden transition-colors hover:bg-muted/50">
        {/* テーマ画像。装飾なので alt は空にし、テーマ名は見出しで読ませる */}
        <div className="relative w-28 shrink-0 self-stretch min-h-28 sm:w-36">
          <Image
            src={theme.thumbnailUrl}
            alt=""
            fill
            className="object-cover"
            sizes="(min-width: 500px) 144px, 112px"
          />
        </div>

        <div className="flex flex-1 items-center gap-3 p-4">
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

          <div className="flex shrink-0 items-center gap-1 text-xs font-bold text-primary-accent sm:text-sm">
            <span>はじめる</span>
            <span className="flex size-8 items-center justify-center rounded-full bg-secondary">
              <ChevronRight className="size-4" aria-hidden="true" />
            </span>
          </div>
        </div>
      </Card>
    </Link>
  );
}
