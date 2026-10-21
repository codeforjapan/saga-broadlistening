"use client";

import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MultiSimulationView } from "@/features/interview-simulation/client/components/multi-simulation-view";
import type { CompletedReportListItem } from "@/features/interview-simulation/shared/types";
import { saveInterviewQuestions } from "../../server/actions/save-interview-questions";
import { revertInterviewConfigToDraft } from "../../server/actions/upsert-interview-config";
import {
  type InterviewConfig,
  type InterviewQuestion,
  type InterviewQuestionInput,
  textToArray,
} from "../../shared/types";
import type { ChatModelGroup } from "../../shared/utils/chat-model-options";
import { buildPurposeTemplateQuestions } from "../../shared/utils/purpose-template-questions";
import { toQuestionInput } from "../../shared/utils/question-input";
import type { ConfigFormContext } from "../hooks/use-config-generation-chat";
import { ConfigGenerationChat } from "./config-generation-chat";
import {
  InterviewConfigForm,
  type InterviewConfigFormValues,
  type PolicyOption,
} from "./interview-config-form";
import { InterviewQuestionList } from "./interview-question-list";

interface InterviewConfigEditClientProps {
  modelGroups: ChatModelGroup[];
  config: InterviewConfig | null;
  questions: InterviewQuestion[];
  completedReports: CompletedReportListItem[];
  /** レポート一覧が上限で切り詰められたか（シミュレーション UI の警告表示用） */
  completedReportsTruncated?: boolean;
  /** 切り詰め上限値 */
  completedReportsLimit?: number;
  initialName?: string | null;
  /** 新規作成時の Slug 初期値 */
  initialSlug?: string;
  /** 紐づけ先として選べる施策 */
  policyOptions: PolicyOption[];
  /** 現在紐づいている施策のID一覧。新規作成では、施策のページから来たときにその施策が入る */
  linkedPolicyIds: string[];
  /**
   * ペルソナ素材を施策全体から選べるか。抽象テーマ型では false になり、
   * この意見募集自身の完了インタビューだけが候補になる。
   */
  hasPolicyScope?: boolean;
}

export function InterviewConfigEditClient({
  modelGroups,
  config: initialConfig,
  questions,
  completedReports,
  completedReportsTruncated = false,
  completedReportsLimit,
  initialName,
  initialSlug,
  policyOptions,
  linkedPolicyIds,
  hasPolicyScope = false,
}: InterviewConfigEditClientProps) {
  // 保存済みの設定のID。新規作成画面では保存後に編集ページへ移るまで未定
  const configId = initialConfig?.id;
  const [aiGeneratedThemes, setAiGeneratedThemes] = useState<string[] | null>(
    null
  );
  const [aiGeneratedQuestions, setAiGeneratedQuestions] = useState<
    InterviewQuestionInput[] | null
  >(null);

  // テンプレートは保存済みの目的と、保存済みの施策の紐づけ（あれば施策型）で決める
  const purposeTemplate = initialConfig?.purpose_type
    ? buildPurposeTemplateQuestions(
        initialConfig.purpose_type,
        linkedPolicyIds.length > 0 ? "bill" : "theme"
      )
    : null;
  // フォームの値を取得するためのref
  const getFormValuesRef = useRef<(() => InterviewConfigFormValues) | null>(
    null
  );
  // 質問一覧の現在値を取得するための ref（シミュレーション機能で使用）
  const getQuestionsRef = useRef<(() => InterviewQuestionInput[]) | null>(null);

  // AIに渡すフォームの値。生成のたびにフォームの最新値を読み直す。
  // フォームで空欄にした値は保存済みの値に戻さない（initialConfig はフォームが未接続のときだけ使う）
  const getFormContext = useCallback((): ConfigFormContext => {
    const formValues = getFormValuesRef.current?.();
    return {
      themeName: formValues ? formValues.name : (initialConfig?.name ?? null),
      themeDescription: formValues
        ? formValues.description
        : (initialConfig?.description ?? null),
      policyIds: formValues ? (formValues.policy_ids ?? []) : linkedPolicyIds,
    };
  }, [initialConfig, linkedPolicyIds]);

  // 確定した質問・テーマは左ペインに反映するだけで、DBへの保存は保存ボタンに任せる。
  // 確定のたびに裏で設定を作るとフォームが保存済みの値で作り直され、
  // 入力途中の説明などが消えてしまうため。
  // 保存済みの設定では質問一覧が反映と保存を受け持つ（一覧の編集は即時保存の作り）。
  // 新規作成時は、設定の保存直後にプレビュー中の質問を登録する。
  const handleConfigCreated = useCallback(
    async (newConfigId: string) => {
      if (!aiGeneratedQuestions || aiGeneratedQuestions.length === 0) return;
      // 設定は作成済みで編集ページへ移るため、ここで失敗するとプレビュー中の質問は失われる。
      // 例外も握って知らせ、遷移は止めない（止めると再保存で設定が二重に作られる）
      const result = await saveInterviewQuestions(
        newConfigId,
        aiGeneratedQuestions
      ).catch(() => null);
      if (!result?.success) {
        // 質問が0件のまま募集中にしないよう、下書きに戻す
        const wasOpen = getFormValuesRef.current?.().status === "open";
        if (wasOpen) {
          await revertInterviewConfigToDraft(newConfigId).catch(() => null);
        }
        toast.error(result?.error || "質問の保存に失敗しました", {
          description: wasOpen
            ? "質問は保存されていないので、編集画面のAI生成から作り直してください（設定は下書きで保存しました）"
            : "質問は保存されていないので、編集画面のAI生成から作り直してください",
        });
      }
    },
    [aiGeneratedQuestions]
  );

  return (
    // ページ全体をタブ切替に: 「設定編集」(フォーム+AI チャット) と「シミュレーション」
    // forceMount で state 保持 → シミュレーションタブに切り替えても未保存編集値が維持される
    <Tabs defaultValue="edit" className="w-full">
      <TabsList>
        <TabsTrigger value="edit">設定編集</TabsTrigger>
        <TabsTrigger value="simulation" disabled={!configId}>
          シミュレーション
          {!configId && "（保存後に有効）"}
        </TabsTrigger>
      </TabsList>

      <TabsContent
        value="edit"
        forceMount
        className="mt-4 data-[state=inactive]:hidden"
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 左カラム: フォーム */}
          <div className="space-y-6">
            <InterviewConfigForm
              modelGroups={modelGroups}
              config={initialConfig}
              aiGeneratedThemes={aiGeneratedThemes}
              onAiThemesApplied={() => setAiGeneratedThemes(null)}
              getFormValuesRef={getFormValuesRef}
              onConfigCreated={handleConfigCreated}
              pendingQuestionCount={aiGeneratedQuestions?.length ?? 0}
              initialName={initialName}
              initialSlug={initialSlug}
              policyOptions={policyOptions}
              linkedPolicyIds={linkedPolicyIds}
            />
            {configId ? (
              <InterviewQuestionList
                interviewConfigId={configId}
                purposeTemplate={purposeTemplate}
                questions={questions}
                aiGeneratedQuestions={aiGeneratedQuestions}
                onAiQuestionsApplied={() => setAiGeneratedQuestions(null)}
                getQuestionsRef={getQuestionsRef}
              />
            ) : (
              aiGeneratedQuestions &&
              aiGeneratedQuestions.length > 0 && (
                <AiQuestionsPreview questions={aiGeneratedQuestions} />
              )
            )}
          </div>

          {/* 右カラム: AI 設定生成チャット */}
          <div>
            <ConfigGenerationChat
              hasLinkedPolicy={linkedPolicyIds.length > 0}
              getFormContext={getFormContext}
              existingThemes={
                initialConfig?.description
                  ? textToArray(initialConfig.description)
                  : undefined
              }
              existingQuestions={questions.map(toQuestionInput)}
              onQuestionsConfirmed={setAiGeneratedQuestions}
              onThemesConfirmed={setAiGeneratedThemes}
            />
          </div>
        </div>
      </TabsContent>

      {configId ? (
        <TabsContent
          value="simulation"
          forceMount
          className="mt-4 data-[state=inactive]:hidden"
        >
          <MultiSimulationView
            modelGroups={modelGroups}
            configId={configId}
            hasPolicyScope={hasPolicyScope}
            getFormValues={() => getFormValuesRef.current?.() ?? null}
            getCurrentQuestions={() => getQuestionsRef.current?.() ?? []}
            completedReports={completedReports}
            completedReportsTruncated={completedReportsTruncated}
            completedReportsLimit={completedReportsLimit}
          />
        </TabsContent>
      ) : null}
    </Tabs>
  );
}

/** 新規作成時のAI生成質問プレビュー */
function AiQuestionsPreview({
  questions,
}: {
  questions: InterviewQuestionInput[];
}) {
  return (
    <Card>
      <CardContent className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold">
              AI生成質問プレビュー ({questions.length}件)
            </h3>
          </div>
          <p className="text-sm text-amber-700 bg-amber-50 p-3 rounded mb-4">
            設定を保存すると、以下の質問が登録されます。
          </p>
          <div className="space-y-3">
            {questions.map((question, index) => (
              <Card
                key={`preview-${index}-${question.question?.slice(0, 10) ?? ""}`}
              >
                <CardContent className="py-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-500">
                        Q{index + 1}
                      </span>
                      <div className="font-semibold text-gray-900">
                        {question.question}
                      </div>
                    </div>
                    {question.follow_up_guide && (
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">観点:</span>{" "}
                        {question.follow_up_guide}
                      </div>
                    )}
                    {question.quick_replies &&
                      question.quick_replies.length > 0 && (
                        <div className="text-sm text-gray-600">
                          <span className="font-medium">クイックリプライ:</span>{" "}
                          {question.quick_replies.join(", ")}
                        </div>
                      )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
