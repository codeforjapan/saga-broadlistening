import "server-only";

import type { PublicTopicAnalysis } from "@mirai-gikai/topic-analysis-core/public-server";
import { cache } from "react";
import { getBillById } from "@/features/bills/server/loaders/get-bill-by-id";
import { getResultsInterviewConfigBySlug } from "@/features/interview-config/server/loaders/get-interview-config-by-slug";
import { getPrimaryInterviewConfig } from "@/features/interview-config/server/loaders/get-linked-interview-config-id";
import type { InterviewTarget } from "@/features/interview-config/shared/types/interview-target";
import { isOpenInterview } from "@/features/interview-config/shared/utils/interview-visibility";
import { countPublicOpinionsByInterviewConfigId } from "@/features/interview-report/server/repositories/interview-report-repository";
import {
  buildPolicyTopicSubject,
  buildThemeTopicSubject,
  type TopicAnalysisSubject,
} from "../../shared/utils/topic-analysis-subject";
import { getPublicTopicAnalysisByInterviewConfigId } from "./get-public-topic-analysis";

/**
 * トピック分析ページを描くのに必要な一式。
 *
 * 分析は意見募集（interview_config）単位だが、入口は施策配下（/bills/[id]/topics）と
 * テーマ配下（/interviews/[slug]/topics）の2つある。どちらから来ても同じ画面を描けるよう、
 * 起点ごとに違う「分析対象・見出し・戻り導線」の解決をここに集約する。
 */
export type TopicAnalysisContext = {
  /** 公開中のトピック分析。公開版が無ければ null（呼び出し側で「準備中」扱い） */
  analysis: PublicTopicAnalysis | null;
  /** 見出し・戻り導線に使う対象（施策 or テーマ） */
  subject: TopicAnalysisSubject;
  /** 公開意見の件数。回答件数ピルと引用リンクの k-匿名性ゲート判定に使う */
  publicOpinionCount: number;
  /** 募集中なら AIインタビュー参加CTA を出す */
  isInterviewOpen: boolean;
};

/**
 * 分析と公開意見件数は互いに独立なので並列で引く。
 * 意見募集が未解決なら分析も出ないため、どちらも引かない。
 */
async function fetchAnalysisAndCount(interviewConfigId: string | null) {
  if (!interviewConfigId) {
    return { analysis: null, publicOpinionCount: 0 };
  }

  const [analysis, publicOpinionCount] = await Promise.all([
    getPublicTopicAnalysisByInterviewConfigId(interviewConfigId),
    countPublicOpinionsByInterviewConfigId(interviewConfigId),
  ]);

  return { analysis, publicOpinionCount };
}

const getPolicyContext = cache(
  async (policyId: string): Promise<TopicAnalysisContext | null> => {
    const [bill, primaryConfig] = await Promise.all([
      getBillById(policyId),
      getPrimaryInterviewConfig(policyId),
    ]);

    if (!bill) return null;

    return {
      ...(await fetchAnalysisAndCount(primaryConfig?.id ?? null)),
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

const getThemeContext = cache(
  async (slug: string): Promise<TopicAnalysisContext | null> => {
    const result = await getResultsInterviewConfigBySlug(slug);
    if (!result) return null;

    const { config } = result;
    const isOpen = isOpenInterview(config.status);

    return {
      ...(await fetchAnalysisAndCount(config.id)),
      subject: buildThemeTopicSubject({ slug, name: config.name, isOpen }),
      isInterviewOpen: isOpen,
    };
  }
);

/**
 * 起点（施策 / テーマ）からトピック分析ページの一式を解決する。
 *
 * 対象が存在しない・公開されていない場合は null（呼び出し側で notFound() にする）。
 * 起点ごとに文字列キーで cache() しているため、generateMetadata とページ本体で
 * 呼んでもリクエスト内では1回しか解決されない。
 */
export async function getTopicAnalysisContext(
  target: InterviewTarget
): Promise<TopicAnalysisContext | null> {
  return target.kind === "theme"
    ? getThemeContext(target.slug)
    : getPolicyContext(target.policyId);
}
