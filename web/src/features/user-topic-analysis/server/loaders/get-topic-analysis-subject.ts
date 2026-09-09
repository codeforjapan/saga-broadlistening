import "server-only";

import { cache } from "react";
import { getBillById } from "@/features/bills/server/loaders/get-bill-by-id";
import { getResultsInterviewConfigBySlug } from "@/features/interview-config/server/loaders/get-interview-config-by-slug";
import { getPrimaryInterviewConfig } from "@/features/interview-config/server/loaders/get-linked-interview-config-id";
import type { InterviewTarget } from "@/features/interview-config/shared/types/interview-target";
import { isOpenInterview } from "@/features/interview-config/shared/utils/interview-visibility";
import {
  buildPolicyTopicSubject,
  buildThemeTopicSubject,
  type TopicAnalysisSubject,
} from "../../shared/utils/topic-analysis-subject";

/**
 * 公開ページの「何についての意見か」を解決した結果。
 *
 * 分析は意見募集（interview_config）単位だが、入口は施策配下（/bills/[id]/...）と
 * テーマ配下（/interviews/[slug]/...）の2つある。どちらから来ても同じ画面を描けるよう、
 * 起点ごとに違う「対象の意見募集・見出し・戻り導線」の解決をここに集約する。
 */
export type TopicAnalysisSubjectContext = {
  /** 分析・回答一覧の対象になる意見募集。解決できなければ null */
  interviewConfigId: string | null;
  /** 見出し・戻り導線に使う対象（施策 or テーマ） */
  subject: TopicAnalysisSubject;
  /** 募集中なら AIインタビュー参加CTA を出す */
  isInterviewOpen: boolean;
};

const getPolicySubject = cache(
  async (policyId: string): Promise<TopicAnalysisSubjectContext | null> => {
    const [bill, primaryConfig] = await Promise.all([
      getBillById(policyId),
      getPrimaryInterviewConfig(policyId),
    ]);

    if (!bill) return null;

    return {
      interviewConfigId: primaryConfig?.id ?? null,
      subject: buildPolicyTopicSubject({
        id: policyId,
        name: bill.bill_content?.title || bill.name,
      }),
      // 募集中の意見募集があるときだけ参加導線を出す（募集終了後は結果だけ見せる）。
      isInterviewOpen:
        primaryConfig != null && isOpenInterview(primaryConfig.status),
    };
  }
);

const getThemeSubject = cache(
  async (slug: string): Promise<TopicAnalysisSubjectContext | null> => {
    const result = await getResultsInterviewConfigBySlug(slug);
    if (!result) return null;

    const { config } = result;
    const isOpen = isOpenInterview(config.status);

    return {
      interviewConfigId: config.id,
      subject: buildThemeTopicSubject({ slug, name: config.name, isOpen }),
      isInterviewOpen: isOpen,
    };
  }
);

/**
 * 起点（施策 / テーマ）から対象の意見募集・見出し・戻り導線を解決する。
 *
 * 対象が存在しない・公開されていない場合は null（呼び出し側で notFound() にする）。
 * 起点ごとに文字列キーで cache() しているため、generateMetadata とページ本体で
 * 呼んでもリクエスト内では1回しか解決されない。
 */
export async function getTopicAnalysisSubject(
  target: InterviewTarget
): Promise<TopicAnalysisSubjectContext | null> {
  return target.kind === "theme"
    ? getThemeSubject(target.slug)
    : getPolicySubject(target.policyId);
}
