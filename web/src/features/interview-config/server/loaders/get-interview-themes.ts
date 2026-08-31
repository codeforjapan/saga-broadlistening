import "server-only";

import { unstable_cache } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";
import type { InterviewTheme } from "../../shared/types/interview-theme";
import {
  buildInterviewThemes,
  type InterviewThemeRow,
} from "../../shared/utils/interview-theme";
import { isPublishedPolicy } from "../../shared/utils/interview-visibility";
import { findOpenInterviewConfigs } from "../repositories/interview-config-repository";

/**
 * 募集中のAIインタビューのテーマ一覧を取得する。
 * トップページのテーマセクションとテーマ一覧ページで使う。
 */
export const getInterviewThemes = unstable_cache(
  async (): Promise<InterviewTheme[]> => {
    const configs = await findOpenInterviewConfigs();

    const rows: InterviewThemeRow[] = configs.map((config) => ({
      id: config.id,
      slug: config.slug,
      name: config.name,
      description: config.description,
      estimatedDuration: config.estimated_duration,
      thumbnailUrl: config.thumbnail_url,
      createdAt: config.created_at,
      participantCount: config.interview_sessions[0]?.count ?? 0,
      // 公開済みかどうかの判定は他の導線と同じ規則に揃える
      policies: config.policies_interview_configs.flatMap((link) =>
        link.policies
          ? [
              {
                isPublished: isPublishedPolicy(link.policies.publish_status),
                thumbnailUrl: link.policies.thumbnail_url,
                tagLabel: link.policies.policies_tags[0]?.tags?.label ?? null,
              },
            ]
          : []
      ),
    }));

    return buildInterviewThemes(rows);
  },
  ["interview-themes"],
  {
    revalidate: 600, // 10分（600秒）
    tags: [CACHE_TAGS.INTERVIEW_CONFIGS, CACHE_TAGS.BILLS],
  }
);
