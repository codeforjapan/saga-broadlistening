import "server-only";

import { InterviewThemeCard } from "../../client/components/interview-theme-card";
import type { InterviewTheme } from "../../shared/types/interview-theme";
import type { InterviewThemeCardPurpose } from "../../shared/utils/interview-theme";

interface InterviewThemeListProps {
  themes: InterviewTheme[];
  /** カードの見出し階層。セクション見出しの1つ下に合わせる */
  headingLevel?: "h2" | "h3";
  /** 参加導線（既定）か、募集終了テーマの結果導線か */
  purpose?: InterviewThemeCardPurpose;
}

/** AIインタビューのテーマカードの一覧。トップページと一覧ページで共有する */
export function InterviewThemeList({
  themes,
  headingLevel,
  purpose = "participate",
}: InterviewThemeListProps) {
  if (themes.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {purpose === "results"
          ? "読める結果のあるテーマはありません。"
          : "現在募集中のテーマはありません。"}
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
          purpose={purpose}
        />
      ))}
    </div>
  );
}
