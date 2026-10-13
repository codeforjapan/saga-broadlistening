"use client";

import { experimental_useObject as useObject } from "@ai-sdk/react";
import { useCallback, useState } from "react";
import {
  type ConfigGenerationStage,
  configGenerationResponseSchema,
} from "../../shared/schemas";
import {
  type InterviewDesignInput,
  type InterviewQuestionInput,
  textToArray,
} from "../../shared/types";
import { buildQuestionsFromTemplate } from "../../shared/utils/default-questions-template";
import { toProposedQuestions } from "../../shared/utils/to-proposed-questions";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  themes?: string[];
  questions?: InterviewQuestionInput[];
}

interface UseConfigGenerationChatProps {
  /**
   * AIへ渡すフォームの値を、送信時点で読み取る。
   * 職員がフォームを書き換えた直後でも最新の内容で生成するため、
   * 値ではなく取得関数を受け取る（呼び出し側で useCallback すること）。
   */
  getFormContext?: () => ConfigFormContext;
  existingThemes?: string[];
  existingQuestions?: InterviewQuestionInput[];
  onThemesConfirmed: (themes: string[]) => void;
  onQuestionsConfirmed: (questions: InterviewQuestionInput[]) => void;
}

/**
 * AIに渡す、左のフォームの送信時点の値。
 * 未保存の入力も含めて生成の前提にする（フォームとAIの提案を食い違わせないため）。
 */
export type ConfigFormContext = InterviewDesignInput & {
  themeName: string | null;
  themeDescription: string | null;
  /** フォームで紐づけ中の施策。先頭の施策を題材にする */
  policyIds: string[];
};

const EMPTY_FORM_CONTEXT: ConfigFormContext = {
  themeName: null,
  themeDescription: null,
  purposeType: null,
  opinionFocus: null,
  decidedMatters: null,
  policyIds: [],
};

/** サーバー側に送る stage（クライアント内部の確定状態は送らない） */
type ServerStage = "default_questions" | "question_proposal" | "theme_proposal";

export function useConfigGenerationChat({
  getFormContext,
  existingThemes,
  existingQuestions,
  onThemesConfirmed,
  onQuestionsConfirmed,
}: UseConfigGenerationChatProps) {
  /** 送信時点のフォームの値 */
  const getFormContextOrEmpty = useCallback(
    () => getFormContext?.() ?? EMPTY_FORM_CONTEXT,
    [getFormContext]
  );

  /**
   * 送信時点の説明欄からテーマを読む。
   * 確定したテーマは保存前でもフォームに入っているので、保存済みの値より優先する。
   */
  const getCurrentThemes = useCallback((): string[] | undefined => {
    const description = getFormContextOrEmpty().themeDescription;
    const themes = description ? textToArray(description) : [];
    return themes.length > 0 ? themes : undefined;
  }, [getFormContextOrEmpty]);

  const hasExistingThemes = (existingThemes?.length ?? 0) > 0;
  const hasExistingQuestions = (existingQuestions?.length ?? 0) > 0;
  const [input, setInput] = useState("");
  // 初期 stage は「ブラッシュアップ」か「新規」かで異なる
  const [stage, setStage] = useState<ConfigGenerationStage>(
    hasExistingQuestions ? "question_proposal" : "default_questions"
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [confirmedQuestions, setConfirmedQuestions] = useState<
    InterviewQuestionInput[]
  >([]);
  const [proposedThemes, setProposedThemes] = useState<string[]>([]);
  const [proposedQuestions, setProposedQuestions] = useState<
    InterviewQuestionInput[]
  >([]);

  const { object, submit, isLoading, error, stop } = useObject({
    api: "/api/interview-config/generate",
    schema: configGenerationResponseSchema,
    onFinish: ({ object: finishedObject, error: finishedError }) => {
      if (finishedError || !finishedObject) {
        // スキーマに合わない応答は useObject の error に出ないため、ここで知らせる
        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            role: "assistant",
            content: "AIの応答を読み取れませんでした。もう一度お試しください。",
          },
        ]);
        return;
      }

      const { text, themes, topics, stance } = finishedObject;
      const questions = finishedObject.questions
        ? toProposedQuestions(finishedObject.questions)
        : undefined;

      // default_questions ステージ: テンプレと合成して proposedQuestions に
      if (topics || stance) {
        const merged = buildQuestionsFromTemplate({
          topics: topics as string[] | undefined,
          stance: stance as string[] | undefined,
        });
        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            role: "assistant",
            content: text ?? "",
            questions: merged,
          },
        ]);
        setProposedQuestions(merged);
        return;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: text ?? "",
          themes: themes ?? undefined,
          questions,
        },
      ]);

      if (themes && themes.length > 0) {
        setProposedThemes(themes);
      }
      if (questions && questions.length > 0) {
        setProposedQuestions(questions);
      }
    },
  });

  /** 現在のクライアント stage からサーバー送信用 stage を決める */
  const resolveServerStage = useCallback(
    (current: ConfigGenerationStage): ServerStage => {
      if (current === "default_questions") return "default_questions";
      if (current === "theme_proposal" || current === "theme_confirmed") {
        return "theme_proposal";
      }
      return "question_proposal";
    },
    []
  );

  const handleSubmit = useCallback(
    (text: string) => {
      if (!text.trim() || isLoading) return;

      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: text,
      };

      setMessages((prev) => [...prev, userMessage]);
      setInput("");

      const apiMessages = [
        ...messages.map((m) => ({ role: m.role, content: m.content })),
        { role: "user" as const, content: text },
      ];

      // default_questions で自由入力が来たら質問ブラッシュアップへ移行
      // theme_confirmed で自由入力が来たらテーマ提案に戻す
      const serverStage: ServerStage =
        stage === "default_questions"
          ? "question_proposal"
          : resolveServerStage(stage);

      if (stage === "default_questions") {
        setStage("question_proposal");
      } else if (stage === "theme_confirmed") {
        setStage("theme_proposal");
      }

      // 質問ブラッシュアップ時は、現在画面に表示中の質問を優先してコンテキストに渡す
      const questionContext =
        proposedQuestions.length > 0
          ? proposedQuestions
          : hasExistingQuestions
            ? existingQuestions
            : undefined;

      // 修正要望後は proposed をリセット（コンテキストは上で確保済み）
      setProposedThemes([]);
      setProposedQuestions([]);

      submit({
        messages: apiMessages,
        ...getFormContextOrEmpty(),
        stage: serverStage,
        existingThemes:
          serverStage === "theme_proposal" ? getCurrentThemes() : undefined,
        existingQuestions:
          serverStage === "question_proposal" ? questionContext : undefined,
        confirmedQuestions:
          serverStage === "theme_proposal" && confirmedQuestions.length > 0
            ? confirmedQuestions
            : undefined,
      });
    },
    [
      messages,
      getFormContextOrEmpty,
      stage,
      isLoading,
      submit,
      resolveServerStage,
      hasExistingQuestions,
      existingQuestions,
      confirmedQuestions,
      proposedQuestions,
      getCurrentThemes,
    ]
  );

  const startGeneration = useCallback(() => {
    // ブラッシュアップかどうかは保存済みの設定で決める。説明欄の現在値で決めると、
    // 新規作成で説明を書いただけでもテーマ設定済みとみなし、初期の質問生成を飛ばしてしまう
    if (hasExistingQuestions || hasExistingThemes) {
      // 既存設定あり: ブラッシュアップモード
      const parts: string[] = [
        "インタビュー設定アシスタントです。現在の設定を確認しました。",
      ];
      if (hasExistingQuestions) {
        parts.push(
          `\n\n**現在の質問（${existingQuestions?.length}件）:**\n${existingQuestions?.map((q, i) => `${i + 1}. ${q.question}`).join("\n")}`
        );
      }
      if (hasExistingThemes) {
        parts.push(
          `\n\n**現在のテーマ（${existingThemes?.length}件）:**\n${existingThemes?.map((t) => `- ${t}`).join("\n")}`
        );
      }
      parts.push(
        "\n\nどのようにブラッシュアップしますか？修正の要望をテキストで入力するか、バッジをクリックしてテーマ側に切り替えられます。"
      );
      setMessages([
        {
          id: "greeting",
          role: "assistant",
          content: parts.join(""),
        },
      ]);
      return;
    }

    // 新規: テンプレ + LLMでQ1/Q2を生成
    const formContext = getFormContextOrEmpty();
    setMessages([
      {
        id: "greeting",
        role: "assistant",
        content:
          formContext.policyIds.length > 0
            ? "インタビュー設定アシスタントです。施策内容を分析して、デフォルトの質問セットを準備します。"
            : "インタビュー設定アシスタントです。テーマの内容を分析して、デフォルトの質問セットを準備します。",
      },
    ]);
    submit({
      messages: [],
      ...formContext,
      stage: "default_questions",
    });
  }, [
    getFormContextOrEmpty,
    submit,
    hasExistingThemes,
    hasExistingQuestions,
    existingThemes,
    existingQuestions,
  ]);

  const confirmQuestions = useCallback(
    (questions: InterviewQuestionInput[]) => {
      if (isLoading) stop();
      setConfirmedQuestions(questions);
      setStage("theme_proposal");
      setProposedQuestions([]);
      setProposedThemes([]);

      const systemMessage: ChatMessage = {
        id: `system-${Date.now()}`,
        role: "assistant",
        content:
          "質問を確定しました。次に、この質問内容に沿ったテーマを提案します。",
      };
      setMessages((prev) => [...prev, systemMessage]);

      onQuestionsConfirmed(questions);

      submit({
        messages: [],
        ...getFormContextOrEmpty(),
        stage: "theme_proposal",
        confirmedQuestions: questions,
        existingThemes: getCurrentThemes(),
      });
    },
    [
      getFormContextOrEmpty,
      isLoading,
      stop,
      submit,
      onQuestionsConfirmed,
      getCurrentThemes,
    ]
  );

  const confirmThemes = useCallback(
    (themes: string[]) => {
      setStage("theme_confirmed");
      onThemesConfirmed(themes);
    },
    [onThemesConfirmed]
  );

  /** 質問生成に戻る（テーマステージから） */
  const switchToQuestions = useCallback(() => {
    if (isLoading) stop();
    setStage("question_proposal");
    setProposedThemes([]);
    setProposedQuestions([]);

    const switchMessage: ChatMessage = {
      id: `system-${Date.now()}`,
      role: "assistant",
      content: "質問のブラッシュアップに戻ります。修正要望を入力してください。",
    };
    setMessages((prev) => [...prev, switchMessage]);
  }, [isLoading, stop]);

  /** テーマ提案をスキップ（質問ステージから直接移動） */
  const skipToThemes = useCallback(() => {
    if (isLoading) stop();

    // 現在提示中の質問があればそれを確定扱いに
    const questionsToUse =
      proposedQuestions.length > 0
        ? proposedQuestions
        : confirmedQuestions.length > 0
          ? confirmedQuestions
          : (existingQuestions ?? []);

    if (questionsToUse.length > 0) {
      setConfirmedQuestions(questionsToUse);
    }

    setStage("theme_proposal");
    setProposedThemes([]);

    const skipMessage: ChatMessage = {
      id: `system-${Date.now()}`,
      role: "assistant",
      content: "テーマ提案に移ります。",
    };
    setMessages((prev) => [...prev, skipMessage]);

    submit({
      messages: [],
      ...getFormContextOrEmpty(),
      stage: "theme_proposal",
      confirmedQuestions:
        questionsToUse.length > 0 ? questionsToUse : undefined,
      existingThemes: getCurrentThemes(),
    });
  }, [
    getFormContextOrEmpty,
    isLoading,
    stop,
    submit,
    proposedQuestions,
    confirmedQuestions,
    existingQuestions,
    getCurrentThemes,
  ]);

  /** 生成中のストリームを停止する */
  const stopGeneration = useCallback(() => {
    if (isLoading) stop();
  }, [isLoading, stop]);

  return {
    input,
    setInput,
    stage,
    messages,
    isLoading,
    error,
    object,
    proposedThemes,
    proposedQuestions,
    startGeneration,
    stopGeneration,
    handleSubmit,
    confirmQuestions,
    confirmThemes,
    switchToQuestions,
    skipToThemes,
  };
}
