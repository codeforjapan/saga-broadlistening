import "server-only";

import { getAiModel } from "@mirai-gikai/shared/ai/registry";
import { AI_PROMPT_CATALOG } from "@mirai-gikai/shared/prompts/catalog";
import { findPromptState } from "@mirai-gikai/shared/prompts/repository";
import {
  renderPromptTemplate,
  validatePromptTemplate,
} from "@mirai-gikai/shared/prompts/template";
import { countPublicOpinionsByInterviewConfigId } from "@mirai-gikai/shared/report-publication/count-public-reports";
import {
  canGenerateVoiceSummary,
  MIN_OPINIONS_FOR_VOICE_SUMMARY,
} from "@mirai-gikai/shared/voice-summary/threshold";
import { getPublicTopicAnalysis } from "@mirai-gikai/topic-analysis-core/public-server";
import { findInterviewConfigNameById } from "@mirai-gikai/topic-analysis-core/repository";
import {
  buildVoiceSummaryTopicsText,
  type GenerateMarkdownFn,
  generateVoiceSummary,
  sortTopicsByOpinionCount,
} from "@mirai-gikai/topic-analysis-core/voice-summary";
import { generateText } from "ai";
import {
  findPublishedAnalysisVersionId,
  insertVoiceSummary,
} from "../repositories/voice-summary-repository";

const PROMPT_KEY = "voice-summary-system";

/** まとめに出す「もとになったトピック」の数（公開画面は上位3件を出す） */
const SOURCE_TOPIC_LIMIT = 10;

export type GenerateVoiceSummaryDraftResult =
  | { success: true; id: string }
  | { success: false; error: string };

/**
 * 公開中のプロンプトを取る。公開版がない（または記法が壊れている）ときはコードの既定文面を使う。
 * 保存する prompt_version は「v{版番号}」か「default」。
 */
async function resolvePromptTemplate(): Promise<{
  content: string;
  version: string;
}> {
  const fallback = {
    content: AI_PROMPT_CATALOG[PROMPT_KEY].defaultContent,
    version: "default",
  };
  try {
    const state = await findPromptState(PROMPT_KEY);
    const published = state.versions.find(
      (version) => version.id === state.prompt.published_version_id
    );
    if (
      !published ||
      validatePromptTemplate(PROMPT_KEY, published.content).length > 0
    ) {
      return fallback;
    }
    return { content: published.content, version: `v${published.version}` };
  } catch (error) {
    console.warn("Voice summary prompt fallback to source code:", error);
    return fallback;
  }
}

/**
 * 公開中のトピック分析から、みんなの声のまとめの下書きを AI で作る（#160）。
 * 公開意見が最低件数に満たないテーマ、公開中の分析がないテーマでは作らない。
 */
export async function generateVoiceSummaryDraft(
  interviewConfigId: string,
  deps: { generate?: GenerateMarkdownFn } = {}
): Promise<GenerateVoiceSummaryDraftResult> {
  // 先に公開中の分析の版を確かめ、トピックを読んだあとにもう一度確かめる（下の一致の確認）。
  // 途中で別の版が公開されると、記録する「もとの分析」と実際に使ったトピックがずれるため
  const analysisVersionId =
    await findPublishedAnalysisVersionId(interviewConfigId);
  const [themeName, publicOpinionCount, analysis, prompt] = await Promise.all([
    findInterviewConfigNameById(interviewConfigId),
    countPublicOpinionsByInterviewConfigId(interviewConfigId),
    getPublicTopicAnalysis(interviewConfigId),
    resolvePromptTemplate(),
  ]);

  if (themeName === null) {
    return { success: false, error: "テーマが見つかりません" };
  }
  if (!canGenerateVoiceSummary(publicOpinionCount)) {
    return {
      success: false,
      error: `公開された意見が${MIN_OPINIONS_FOR_VOICE_SUMMARY}件以上あるテーマで生成できます（現在${publicOpinionCount}件）`,
    };
  }
  if (
    analysisVersionId !== null &&
    (await findPublishedAnalysisVersionId(interviewConfigId)) !==
      analysisVersionId
  ) {
    return {
      success: false,
      error:
        "生成中にトピック分析の公開が切り替わりました。もう一度生成してください",
    };
  }
  if (!analysis || analysis.topics.length === 0) {
    return {
      success: false,
      error:
        "公開中のトピック分析がありません。先にトピック分析を公開してください",
    };
  }

  // テストで generate を差し替えたときは、モデルの設定（環境変数）を読まない
  const ai = deps.generate ? null : getAiModel("voiceSummary");
  const generate: GenerateMarkdownFn =
    deps.generate ??
    (async ({ system, messages }) => {
      if (!ai) throw new Error("AI model is not configured");
      const { model, providerOptions } = ai;
      const result = await generateText({
        model,
        providerOptions,
        system,
        messages,
        experimental_telemetry: {
          isEnabled: true,
          functionId: "voice-summary-generate",
          metadata: { interviewConfigId },
        },
      });
      return result.text;
    });

  const { markdown } = await generateVoiceSummary({
    systemPrompt: renderPromptTemplate(PROMPT_KEY, prompt.content, {
      themeName,
      topicsText: buildVoiceSummaryTopicsText(analysis.topics),
    }),
    generate,
  });

  const sourceTopics = sortTopicsByOpinionCount(analysis.topics);
  const { id } = await insertVoiceSummary({
    interview_config_id: interviewConfigId,
    topic_analysis_version_id: analysisVersionId,
    content_md: markdown,
    status: "draft",
    source_topic_count: analysis.topics.length,
    source_opinion_count: analysis.total_opinions,
    source_topic_ids: sourceTopics
      .slice(0, SOURCE_TOPIC_LIMIT)
      .map((topic) => topic.id),
    model: ai?.modelId ?? null,
    prompt_version: prompt.version,
    generated_at: new Date().toISOString(),
  });

  return { success: true, id };
}
