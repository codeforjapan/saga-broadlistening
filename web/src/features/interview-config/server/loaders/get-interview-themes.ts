import "server-only";

import { unstable_cache } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";
import type { InterviewTheme } from "../../shared/types/interview-theme";
import {
  buildInterviewThemes,
  type InterviewThemeLinkRow,
} from "../../shared/utils/interview-theme";
import { findOpenInterviewConfigLinks } from "../repositories/interview-config-repository";

/**
 * 募集中のAIインタビューのテーマ一覧を取得する。
 * トップページのテーマセクションとテーマ一覧ページで使う。
 */
export const getInterviewThemes = unstable_cache(
  async (): Promise<InterviewTheme[]> => {
    const links = await findOpenInterviewConfigLinks();

    const rows: InterviewThemeLinkRow[] = links.map((link) => ({
      policyId: link.policy_id,
      linkedAt: link.created_at,
      policyThumbnailUrl: link.policies.thumbnail_url,
      policyTagLabel: link.policies.policies_tags[0]?.tags?.label ?? null,
      config: {
        id: link.interview_configs.id,
        name: link.interview_configs.name,
        description: link.interview_configs.description,
        estimatedDuration: link.interview_configs.estimated_duration,
        thumbnailUrl: link.interview_configs.thumbnail_url,
        createdAt: link.interview_configs.created_at,
        participantCount:
          link.interview_configs.interview_sessions[0]?.count ?? 0,
      },
    }));

    const themes = buildInterviewThemes(rows);
    warnHiddenThemes(rows, themes);

    return themes;
  },
  ["interview-themes"],
  {
    revalidate: 600, // 10分（600秒）
    tags: [CACHE_TAGS.INTERVIEW_CONFIGS, CACHE_TAGS.BILLS],
  }
);

/**
 * 一覧に出せなかった募集中テーマを警告として残す。
 *
 * 「1施策につき参加できるテーマは1件」というルーティングの制約で落ちるため、
 * 職員が2つ目のテーマを募集中にしても画面には現れない。原因が追えるように
 * ログだけは残す（テーマ単独の参加URLができれば不要になる）。
 */
function warnHiddenThemes(
  rows: InterviewThemeLinkRow[],
  themes: InterviewTheme[]
) {
  const shownIds = new Set(themes.map((theme) => theme.id));
  const hiddenIds = [
    ...new Set(
      rows
        .map((row) => row.config.id)
        .filter((configId) => !shownIds.has(configId))
    ),
  ];

  if (hiddenIds.length > 0) {
    console.warn(
      `一覧に出せない募集中テーマがあります（同じ施策に複数の募集中テーマがある）: ${hiddenIds.join(", ")}`
    );
  }
}
