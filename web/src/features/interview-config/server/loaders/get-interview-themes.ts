import "server-only";

import { unstable_cache } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";
import type { InterviewTheme } from "../../shared/types/interview-theme";
import {
  buildInterviewThemes,
  type InterviewConfigListRow,
  toInterviewThemeRows,
} from "../../shared/utils/interview-theme";
import {
  findClosedInterviewConfigsWithPublishedAnalysis,
  findOpenInterviewConfigs,
} from "../repositories/interview-config-repository";

/** 取得結果をカード表示用に整える（募集中・募集終了で共通）。 */
function buildThemes(configs: InterviewConfigListRow[]): InterviewTheme[] {
  return buildInterviewThemes(toInterviewThemeRows(configs));
}

/**
 * 募集中のAIインタビューのテーマ一覧を取得する。
 * トップページのテーマセクションとテーマ一覧ページで使う。
 */
export const getInterviewThemes = unstable_cache(
  async (): Promise<InterviewTheme[]> =>
    buildThemes(await findOpenInterviewConfigs()),
  ["interview-themes"],
  {
    revalidate: 600, // 10分（600秒）
    tags: [CACHE_TAGS.INTERVIEW_CONFIGS, CACHE_TAGS.BILLS],
  }
);

/**
 * 募集が終わったテーマのうち、公開中のトピック分析があるものを取得する。
 * テーマ一覧ページの「募集終了したテーマ」セクションで使う（結果だけ読める導線）。
 */
export const getClosedInterviewThemes = unstable_cache(
  async (): Promise<InterviewTheme[]> =>
    buildThemes(await findClosedInterviewConfigsWithPublishedAnalysis()),
  ["closed-interview-themes"],
  {
    revalidate: 600, // 10分（600秒）
    tags: [CACHE_TAGS.INTERVIEW_CONFIGS, CACHE_TAGS.BILLS],
  }
);
