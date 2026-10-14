import "server-only";

import { unstable_cache } from "next/cache";
import type { DifficultyLevelEnum } from "@/features/bill-difficulty/shared/types";
import { getInterviewParticipationView } from "@/features/interview-config/server/loaders/get-interview-participation-view";
import { themeInterviewTarget } from "@/features/interview-config/shared/types/interview-target";
import {
  getInterviewStartLink,
  getThemeCardLink,
} from "@/features/interview-config/shared/utils/interview-links";
import {
  type KikaseteStart,
  resolveKikaseteStart,
} from "@/features/interview-config/shared/utils/kikasete-start";
import { CACHE_TAGS } from "@/lib/cache-tags";
import {
  type ThemeCardInterview,
  type ThemeCardView,
  toThemeCardView,
} from "../../shared/utils/theme-card-view";
import { findTopLevelPublishedPoliciesWithThemes } from "../repositories/top-theme-repository";

export type TopTheme = Omit<ThemeCardView, "interview"> & {
  interview:
    | (ThemeCardInterview & { aboutHref: string; start: KikaseteStart })
    | null;
};

/** 取得結果は難易度によらないので、キャッシュは1件にまとめ、変換はキャッシュの外で行う */
const getCachedTopLevelPolicies = unstable_cache(
  findTopLevelPublishedPoliciesWithThemes,
  ["top-level-policies"],
  {
    revalidate: 600, // 10分（600秒）
    tags: [CACHE_TAGS.BILLS, CACHE_TAGS.INTERVIEW_CONFIGS],
  }
);

/**
 * TOP のテーマカード一覧。公開中の親施策ごとに1枚。
 * 参加条件（スーパーアプリ連携 #145）の判定は利用者ごとに行い、共有キャッシュには入れない。
 */
export async function getTopThemes(
  difficulty: DifficultyLevelEnum
): Promise<TopTheme[]> {
  const policies = await getCachedTopLevelPolicies();
  const views = policies.flatMap((policy) => {
    const view = toThemeCardView(policy, difficulty);
    return view ? [view] : [];
  });

  return Promise.all(
    views.map(async ({ interview, ...view }) => {
      if (!interview) {
        return { ...view, interview: null };
      }
      const target = themeInterviewTarget(interview.slug);
      const participation = await getInterviewParticipationView(
        interview.participationRule
      );
      return {
        ...view,
        interview: {
          ...interview,
          // 募集が終わったテーマは LP が公開されないので、結果（トピック一覧）へ送る
          aboutHref: getThemeCardLink({
            slug: interview.slug,
            isOpen: interview.isOpen,
          }),
          start: resolveKikaseteStart({
            isOpen: interview.isOpen,
            startHref: getInterviewStartLink(target),
            participation,
          }),
        },
      };
    })
  );
}
