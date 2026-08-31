import "server-only";

import { InterviewThemeCard } from "../../client/components/interview-theme-card";
import type { InterviewTheme } from "../../shared/types/interview-theme";

interface InterviewThemeListProps {
  themes: InterviewTheme[];
  /** カードの見出し階層。セクション見出しの1つ下に合わせる */
  headingLevel?: "h2" | "h3";
}

/** AIインタビューのテーマカードの一覧。トップページと一覧ページで共有する */
export function InterviewThemeList({
  themes,
  headingLevel,
}: InterviewThemeListProps) {
  if (themes.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        現在募集中のテーマはありません。
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {themes.map((theme) => (
        <InterviewThemeCard
          key={theme.id}
          theme={theme}
          headingLevel={headingLevel}
        />
      ))}
    </div>
  );
}
