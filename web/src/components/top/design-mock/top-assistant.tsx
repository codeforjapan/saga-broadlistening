"use client";

import { useChat } from "@ai-sdk/react";
import { SITE_NAME } from "@mirai-gikai/branding/site";
import { ArrowRight, Bot } from "lucide-react";
import { type RefObject, useMemo, useRef, useState } from "react";
import {
  PromptInput,
  PromptInputBody,
  type PromptInputMessage,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { Button } from "@/components/ui/button";
import type { DifficultyLevelEnum } from "@/features/bill-difficulty/shared/types";
import { ChatWindow } from "@/features/chat/client/components/chat-window";

/** 総合アシスタントに文脈として渡す施策の情報 */
export interface TopAssistantBill {
  name: string;
  summary?: string;
  tags?: string[];
  isFeatured?: boolean;
}

interface TopAssistantProps {
  currentDifficulty: DifficultyLevelEnum;
  bills: TopAssistantBill[];
}

const ASSISTANT_LABEL = "総合アシスタント";

const SUGGESTED_QUESTIONS = [
  `${SITE_NAME}って何？`,
  "注目の施策について教えて",
];

/**
 * 総合アシスタントの会話状態と、既存チャットウィンドウへ渡す共通の props。
 * 開くボタン・入力欄の形だけが案ごとに違うので、会話まわりはここにまとめる。
 */
function useTopAssistant(
  { currentDifficulty, bills }: TopAssistantProps,
  returnFocusRef: RefObject<HTMLElement | null>
) {
  const [isOpen, setIsOpen] = useState(false);
  const chatState = useChat();
  const sessionId = useMemo(() => crypto.randomUUID(), []);
  const pageContext = useMemo(
    () => ({ type: "home" as const, bills }),
    [bills]
  );

  const isResponding =
    chatState.status === "streaming" || chatState.status === "submitted";

  /** 質問を送ってチャットを開く。送ったら true を返す */
  const ask = (text: string): boolean => {
    const question = text.trim();
    if (!question || isResponding) {
      return false;
    }

    chatState.sendMessage({
      text: question,
      metadata: { difficultyLevel: currentDifficulty, pageContext, sessionId },
    });
    setIsOpen(true);
    return true;
  };

  return {
    isOpen,
    isResponding,
    hasConversation: chatState.messages.length > 0,
    open: () => setIsOpen(true),
    ask,
    chatWindowProps: {
      difficultyLevel: currentDifficulty,
      chatState,
      isOpen,
      onClose: () => setIsOpen(false),
      pageContext,
      returnFocusRef,
      sessionId,
      title: ASSISTANT_LABEL,
      fullScreenOnMobile: true,
    },
  };
}

/**
 * 案A：PCは右ペインに常設のチャット、スマホは右下に追従する「AIに質問」ボタンから
 * 全画面のチャットを開く。
 */
export function TopAssistantPane(props: TopAssistantProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const { isOpen, open, chatWindowProps } = useTopAssistant(props, triggerRef);

  return (
    <>
      <Button
        ref={triggerRef}
        type="button"
        onClick={open}
        className="fixed bottom-6 right-4 z-30 h-12 gap-2 bg-kikasete px-5 text-white has-[>svg]:px-5 shadow-lg pc:hidden"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        <Bot className="size-5" aria-hidden="true" />
        AIに質問
      </Button>

      <ChatWindow {...chatWindowProps} />
    </>
  );
}

/**
 * 案B：タイトル直下に置く入力欄とサジェストチップ。
 * 質問を送ると、チャットをダイアログ（スマホは全画面）で開いて会話を続ける。
 * 右ペインや追従ボタンは持たない。
 */
export function TopAssistantPrompt(props: TopAssistantProps) {
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { isResponding, hasConversation, open, ask, chatWindowProps } =
    useTopAssistant(props, inputRef);

  const handleSubmit = (message: PromptInputMessage) => {
    if (ask(message.text ?? "")) {
      setInput("");
    }
  };

  return (
    <div className="flex w-full flex-col items-center gap-4">
      {/* 日本語入力の変換確定で送信されないよう、既存チャットと同じ入力部品を使う */}
      <PromptInput
        onSubmit={handleSubmit}
        className="flex w-full items-center gap-2 divide-y-0 rounded-full bg-white py-2 pl-6 pr-2 shadow-raised ring-1 ring-border"
      >
        <PromptInputBody className="flex-1">
          <PromptInputTextarea
            ref={inputRef}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="例：「奨学金の返還支援は誰が使える？」"
            aria-label={`${ASSISTANT_LABEL}に質問する`}
            rows={1}
            submitOnEnter
            className="!min-h-0 min-w-0 resize-none border-none bg-transparent !px-0 !py-2 text-base shadow-none placeholder:text-muted-foreground focus:ring-0"
          />
        </PromptInputBody>
        <Button
          type="submit"
          size="icon"
          disabled={!input.trim() || isResponding}
          className="size-11 bg-kikasete text-white disabled:opacity-100"
          aria-label="送信"
        >
          <ArrowRight className="size-5" aria-hidden="true" />
        </Button>
      </PromptInput>

      <div className="flex flex-wrap justify-center gap-2">
        {SUGGESTED_QUESTIONS.map((question) => (
          <Button
            key={question}
            type="button"
            variant="outline"
            size="sm"
            disabled={isResponding}
            className="border-kikasete text-xs text-kikasete-accent shadow-none"
            onClick={() => ask(question)}
          >
            {question}
          </Button>
        ))}
      </div>

      {/* 閉じたあとも、質問し直さずに会話へ戻れるようにする */}
      {hasConversation && (
        <Button type="button" variant="link" onClick={open}>
          会話のつづきを見る
        </Button>
      )}

      <ChatWindow
        {...chatWindowProps}
        presentation="dialog"
        // 開いた直後は回答を読むので、入力欄にフォーカスしてキーボードを出さない
        disableAutoFocus
      />
    </div>
  );
}
