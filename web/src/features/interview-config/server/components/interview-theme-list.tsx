import "server-only";

import { InterviewThemeCard } from "../../client/components/interview-theme-card";
import type { InterviewParticipationView } from "../../shared/types/interview-participation-view";
import type { InterviewTheme } from "../../shared/types/interview-theme";
import type { InterviewThemeCardPurpose } from "../../shared/utils/interview-theme";
import { getInterviewParticipationView } from "../loaders/get-interview-participation-view";
import { findInterviewParticipationRulesByIds } from "../repositories/interview-config-repository";

interface InterviewThemeListProps {
  themes: InterviewTheme[];
  /** カードの見出し階層。セクション見出しの1つ下に合わせる */
  headingLevel?: "h2" | "h3";
  /** 参加導線（既定）か、募集終了テーマの結果導線か */
  purpose?: InterviewThemeCardPurpose;
}

/** AIインタビューのテーマカードの一覧。トップページと一覧ページで共有する */
export async function InterviewThemeList({
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

  const rules =
    purpose === "participate"
      ? await findInterviewParticipationRulesByIds(
          themes.map((theme) => theme.id)
        )
      : [];
  const cards = await Promise.all(
    themes.map(async (theme) => {
      const rule = rules.find((rule) => rule.id === theme.id);
      let participation: InterviewParticipationView = { kind: "allowed" };
      if (purpose === "participate") {
        participation = rule
          ? await getInterviewParticipationView(rule)
          : { kind: "guide", themeName: theme.name, providers: [] };
      }
      return { theme, participation };
    })
  );

  return (
    <div className="flex flex-col gap-4">
      {cards.map(({ theme, participation }) => (
        <InterviewThemeCard
          key={theme.id}
          theme={theme}
          headingLevel={headingLevel}
          purpose={purpose}
          participation={participation}
        />
      ))}
    </div>
  );
}
