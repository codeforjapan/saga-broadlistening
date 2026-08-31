import "server-only";

import { MessagesSquare } from "lucide-react";
import type { Route } from "next";
import { SectionHeading } from "@/components/section-heading";
import { routes } from "@/lib/routes";
import { INTERVIEW_THEME_LIST_DESCRIPTION } from "../../shared/constants";
import type { InterviewTheme } from "../../shared/types/interview-theme";
import { InterviewThemeList } from "./interview-theme-list";

interface InterviewThemeSectionProps {
  themes: InterviewTheme[];
  /** 同一ページ内リンクの飛び先にするセクションID */
  sectionId: string;
}

/** トップページのAIインタビューセクション。募集中テーマを数件だけ出す */
export function InterviewThemeSection({
  themes,
  sectionId,
}: InterviewThemeSectionProps) {
  if (themes.length === 0) {
    return null;
  }

  return (
    <section id={sectionId} className="flex scroll-mt-24 flex-col gap-6">
      <SectionHeading
        icon={<MessagesSquare className="size-6" />}
        title="AIインタビュー"
        description={INTERVIEW_THEME_LIST_DESCRIPTION}
        moreHref={routes.interviews() as Route}
      />

      <InterviewThemeList themes={themes} />
    </section>
  );
}
