import "server-only";

import type { InterviewParticipationView } from "../../shared/types/interview-participation-view";
import { themeInterviewTarget } from "../../shared/types/interview-target";
import {
  getInterviewStartLink,
  getThemeCardLink,
} from "../../shared/utils/interview-links";
import {
  isInterviewVisible,
  toLinkedPolicies,
} from "../../shared/utils/interview-visibility";
import type { KikaseteInterview } from "../../shared/utils/kikasete-interview";
import { toKikaseteInterview } from "../../shared/utils/kikasete-interview";
import {
  type KikaseteStart,
  resolveKikaseteStart,
} from "../../shared/utils/kikasete-start";
import { findKikaseteThemeById } from "../repositories/interview-config-repository";
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

/**
 * テーマ（意見募集）1件のきかせてボックス。トピック・レポート・まとめのページ下部で使う。
 * 募集中でない・公開されていないテーマでは参加導線を出さないので null。
 */
export async function getKikaseteBoxByConfigId(
  configId: string
): Promise<KikaseteBoxData | null> {
  const theme = await findKikaseteThemeById(configId);
  // 公開中の施策につながらないテーマはチャット・LP が公開されないので、導線も出さない
  if (
    !theme ||
    !isInterviewVisible(toLinkedPolicies(theme.policies_interview_configs))
  ) {
    return null;
  }
  const interview = toKikaseteInterview(theme);
  if (!interview.isOpen) return null;
  return (await getKikaseteBox(interview)).box;
}
