import "server-only";

import type { InterviewParticipationView } from "../../shared/types/interview-participation-view";
import { themeInterviewTarget } from "../../shared/types/interview-target";
import {
  getInterviewStartLink,
  getThemeCardLink,
} from "../../shared/utils/interview-links";
import type { KikaseteInterview } from "../../shared/utils/kikasete-interview";
import {
  type KikaseteStart,
  resolveKikaseteStart,
} from "../../shared/utils/kikasete-start";
import { getInterviewParticipationView } from "./get-interview-participation-view";

/** KikaseteBox にそのまま渡せる形 */
export type KikaseteBoxData = Omit<
  KikaseteInterview,
  "participationRule" | "isOpen" | "slug"
> & {
  aboutHref: string;
  start: KikaseteStart;
};

/**
 * きかせてボックスのリンクと「はじめる」の出し方を、利用者ごとの参加判定を含めて決める。
 * 参加判定（スーパーアプリ連携 #145）はリクエストごとに行うので、共有キャッシュの外で呼ぶ。
 */
export async function getKikaseteBox(
  interview: KikaseteInterview,
  isPreview = false
): Promise<{
  box: KikaseteBoxData;
  participation: InterviewParticipationView;
}> {
  const { slug, isOpen, participationRule, ...display } = interview;
  const participation = await getInterviewParticipationView(
    participationRule,
    isPreview
  );
  return {
    box: {
      ...display,
      // 募集が終わったテーマは LP が公開されないので、結果（トピック一覧）へ送る
      aboutHref: getThemeCardLink({ slug, isOpen }),
      start: resolveKikaseteStart({
        isOpen,
        startHref: getInterviewStartLink(themeInterviewTarget(slug)),
        participation,
      }),
    },
    // チャットの提案バナーなど、ボックスの外で参加判定を使う呼び出し元のために返す
    participation,
  };
}
