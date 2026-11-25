// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// vi.hoisted で mock factory より先に初期化
const { mockSubmit, mockState } = vi.hoisted(() => {
  const mockSubmit = vi.fn();
  const mockState = {
    onFinish: undefined as
      | ((result: { object?: unknown; error?: Error }) => void)
      | undefined,
    isLoading: false,
    returnedObject: undefined as unknown,
  };
  return { mockSubmit, mockState };
});

vi.mock("@ai-sdk/react", () => ({
  experimental_useObject: vi.fn(
    (options: {
      api: string;
      schema: unknown;
      onFinish?: (result: { object?: unknown; error?: Error }) => void;
    }) => {
      mockState.onFinish = options.onFinish;
      return {
        object: mockState.returnedObject,
        submit: mockSubmit,
        isLoading: mockState.isLoading,
        error: undefined,
      };
    }
  ),
}));

import { useInterviewChat } from "./use-interview-chat";

const DEFAULT_CONFIG_ID = "config-123";

describe("useInterviewChat", () => {
  beforeEach(() => {
    mockSubmit.mockClear();
    mockState.onFinish = undefined;
    mockState.isLoading = false;
    mockState.returnedObject = undefined;
  });

  describe("初期状態", () => {
    it("初期メッセージなし: stageがchat・messagesが空・isLoadingがfalse・canRetryがfalse", () => {
      const { result } = renderHook(() =>
        useInterviewChat({
          interviewConfigId: DEFAULT_CONFIG_ID,
          initialMessages: [],
        })
      );

      expect(result.current.stage).toBe("chat");
      expect(result.current.messages).toHaveLength(0);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.input).toBe("");
      expect(result.current.canRetry).toBe(false);
    });

    it("テキストのみの初期メッセージ: messagesに反映されstageがchat", () => {
      const initialMessages = [
        {
          id: "msg-1",
          role: "assistant" as const,
          content: JSON.stringify({ text: "こんにちは" }),
          created_at: "2024-01-01T00:00:00Z",
        },
      ];

      const { result } = renderHook(() =>
        useInterviewChat({
          interviewConfigId: DEFAULT_CONFIG_ID,
          initialMessages,
        })
      );

      expect(result.current.messages).toHaveLength(1);
      expect(result.current.messages[0].content).toBe("こんにちは");
      expect(result.current.stage).toBe("chat");
    });

    it("レポート付き初期メッセージ: stageがsummaryになる", () => {
      const initialMessages = [
        {
          id: "msg-1",
          role: "assistant" as const,
          content: JSON.stringify({
            text: "まとめました",
            report: {
              summary: "テスト要約",
              final_text: "テスト意見本文",
              role_description: "市民",
              role_title: "市民",
              opinions: [{ title: "意見1", content: "内容1" }],
            },
          }),
          created_at: "2024-01-01T00:00:00Z",
        },
      ];

      const { result } = renderHook(() =>
        useInterviewChat({
          interviewConfigId: DEFAULT_CONFIG_ID,
          initialMessages,
        })
      );

      expect(result.current.stage).toBe("summary");
    });

    it("ユーザーメッセージの初期メッセージ: contentがそのまま反映される", () => {
      const initialMessages = [
        {
          id: "msg-1",
          role: "user" as const,
          content: "ユーザーの入力",
          created_at: "2024-01-01T00:00:00Z",
        },
      ];

      const { result } = renderHook(() =>
        useInterviewChat({
          interviewConfigId: DEFAULT_CONFIG_ID,
          initialMessages,
        })
      );

      expect(result.current.messages).toHaveLength(1);
      expect(result.current.messages[0].role).toBe("user");
      expect(result.current.messages[0].content).toBe("ユーザーの入力");
    });
  });

  describe("handleSubmit", () => {
    it("テキストが空: submitを呼ばずmessagesも変化しない", () => {
      const { result } = renderHook(() =>
        useInterviewChat({
          interviewConfigId: DEFAULT_CONFIG_ID,
          initialMessages: [],
        })
      );

      act(() => {
        result.current.handleSubmit({ text: "" });
      });

      expect(mockSubmit).not.toHaveBeenCalled();
      expect(result.current.messages).toHaveLength(0);
    });

    it("テキストがundefined: submitを呼ばない", () => {
      const { result } = renderHook(() =>
        useInterviewChat({
          interviewConfigId: DEFAULT_CONFIG_ID,
          initialMessages: [],
        })
      );

      act(() => {
        result.current.handleSubmit({ text: undefined });
      });

      expect(mockSubmit).not.toHaveBeenCalled();
    });

    it("ローディング中: submitを呼ばない", () => {
      mockState.isLoading = true;

      const { result } = renderHook(() =>
        useInterviewChat({
          interviewConfigId: DEFAULT_CONFIG_ID,
          initialMessages: [],
        })
      );

      act(() => {
        result.current.handleSubmit({ text: "テスト入力" });
      });

      expect(mockSubmit).not.toHaveBeenCalled();
    });

    it("有効なテキスト: ユーザーメッセージを追加しinputをクリアしsubmitを呼ぶ", () => {
      const { result } = renderHook(() =>
        useInterviewChat({
          interviewConfigId: DEFAULT_CONFIG_ID,
          initialMessages: [],
        })
      );

      act(() => {
        result.current.handleSubmit({ text: "テスト入力" });
      });

      expect(result.current.messages).toHaveLength(1);
      expect(result.current.messages[0].role).toBe("user");
      expect(result.current.messages[0].content).toBe("テスト入力");
      expect(result.current.input).toBe("");
      expect(mockSubmit).toHaveBeenCalledOnce();
    });

    it("有効なテキスト: submitにinterviewConfigIdが渡され、ステージは送らない（サーバーが決める）", () => {
      const { result } = renderHook(() =>
        useInterviewChat({
          interviewConfigId: DEFAULT_CONFIG_ID,
          initialMessages: [],
        })
      );

      act(() => {
        result.current.handleSubmit({ text: "テスト入力" });
      });

      expect(mockSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ interviewConfigId: DEFAULT_CONFIG_ID })
      );
      expect(mockSubmit.mock.calls[0][0]).not.toHaveProperty("currentStage");
    });

    it("previewToken指定時: submitにpreviewTokenが渡される", () => {
      const { result } = renderHook(() =>
        useInterviewChat({
          interviewConfigId: DEFAULT_CONFIG_ID,
          initialMessages: [],
          previewToken: "preview-token-123",
        })
      );

      act(() => {
        result.current.handleSubmit({ text: "テスト入力" });
      });

      expect(mockSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ previewToken: "preview-token-123" })
      );
    });

    it("previewToken未指定時: submitのpreviewTokenはundefined", () => {
      const { result } = renderHook(() =>
        useInterviewChat({
          interviewConfigId: DEFAULT_CONFIG_ID,
          initialMessages: [],
        })
      );

      act(() => {
        result.current.handleSubmit({ text: "テスト入力" });
      });

      const calledWith = mockSubmit.mock.calls[0][0] as {
        previewToken?: string;
      };
      expect(calledWith.previewToken).toBeUndefined();
    });

    it("有効なテキスト: submitのmessagesにユーザーメッセージが含まれる", () => {
      const { result } = renderHook(() =>
        useInterviewChat({
          interviewConfigId: DEFAULT_CONFIG_ID,
          initialMessages: [],
        })
      );

      act(() => {
        result.current.handleSubmit({ text: "テスト入力" });
      });

      const calledWith = mockSubmit.mock.calls[0][0] as {
        messages: Array<{ role: string; content: string }>;
      };
      const userMsg = calledWith.messages.find((m) => m.role === "user");
      expect(userMsg?.content).toBe("テスト入力");
    });
  });

  describe("handleQuickReply", () => {
    it("クイックリプライ選択: handleSubmitが呼ばれユーザーメッセージが追加される", () => {
      const { result } = renderHook(() =>
        useInterviewChat({
          interviewConfigId: DEFAULT_CONFIG_ID,
          initialMessages: [],
        })
      );

      act(() => {
        result.current.handleQuickReply("賛成");
      });

      expect(result.current.messages).toHaveLength(1);
      expect(result.current.messages[0].role).toBe("user");
      expect(result.current.messages[0].content).toBe("賛成");
      expect(mockSubmit).toHaveBeenCalledOnce();
    });

    it("ローディング中のクイックリプライ: submitを呼ばない", () => {
      mockState.isLoading = true;

      const { result } = renderHook(() =>
        useInterviewChat({
          interviewConfigId: DEFAULT_CONFIG_ID,
          initialMessages: [],
        })
      );

      act(() => {
        result.current.handleQuickReply("賛成");
      });

      expect(mockSubmit).not.toHaveBeenCalled();
    });
  });

  describe("onFinish コールバック", () => {
    it("成功レスポンス: assistantメッセージをmessagesに追加する", () => {
      const { result } = renderHook(() =>
        useInterviewChat({
          interviewConfigId: DEFAULT_CONFIG_ID,
          initialMessages: [],
        })
      );

      act(() => {
        result.current.handleSubmit({ text: "テスト" });
      });

      expect(result.current.messages).toHaveLength(1);

      act(() => {
        mockState.onFinish?.({
          object: { text: "AIの回答です", next_stage: "chat" },
          error: undefined,
        });
      });

      expect(result.current.messages).toHaveLength(2);
      expect(result.current.messages[1].role).toBe("assistant");
      expect(result.current.messages[1].content).toBe("AIの回答です");
    });

    it("next_stageがsummary: stageがsummaryに更新される", () => {
      const { result } = renderHook(() =>
        useInterviewChat({
          interviewConfigId: DEFAULT_CONFIG_ID,
          initialMessages: [],
        })
      );

      act(() => {
        result.current.handleSubmit({ text: "テスト" });
      });

      act(() => {
        mockState.onFinish?.({
          object: { text: "まとめます", next_stage: "summary" },
          error: undefined,
        });
      });

      expect(result.current.stage).toBe("summary");
    });

    it("next_stageがsummary_complete: stageがsummary_completeに更新される", () => {
      const { result } = renderHook(() =>
        useInterviewChat({
          interviewConfigId: DEFAULT_CONFIG_ID,
          initialMessages: [],
        })
      );

      act(() => {
        result.current.handleSubmit({ text: "テスト" });
      });

      act(() => {
        mockState.onFinish?.({
          object: { text: "完了しました", next_stage: "summary_complete" },
          error: undefined,
        });
      });

      expect(result.current.stage).toBe("summary_complete");
    });

    it("summary_complete後: handleSubmitがno-opになる", () => {
      const { result } = renderHook(() =>
        useInterviewChat({
          interviewConfigId: DEFAULT_CONFIG_ID,
          initialMessages: [],
        })
      );

      act(() => {
        result.current.handleSubmit({ text: "テスト" });
      });

      act(() => {
        mockState.onFinish?.({
          object: { text: "完了", next_stage: "summary_complete" },
          error: undefined,
        });
      });

      const callCountBefore = mockSubmit.mock.calls.length;

      act(() => {
        result.current.handleSubmit({ text: "もう一度送信" });
      });

      expect(mockSubmit.mock.calls.length).toBe(callCountBefore);
    });

    it("エラーレスポンス（1回目）: 自動リトライが実行される", () => {
      const { result } = renderHook(() =>
        useInterviewChat({
          interviewConfigId: DEFAULT_CONFIG_ID,
          initialMessages: [],
        })
      );

      act(() => {
        result.current.handleSubmit({ text: "テスト" });
      });

      const callCountBefore = mockSubmit.mock.calls.length;

      act(() => {
        mockState.onFinish?.({
          object: undefined,
          error: new Error("ネットワークエラー"),
        });
      });

      // 自動リトライでsubmitが再度呼ばれる
      expect(mockSubmit.mock.calls.length).toBeGreaterThan(callCountBefore);
    });

    it("エラーレスポンス（2回目）: displayErrorが設定されcanRetryがtrueになる", () => {
      const { result } = renderHook(() =>
        useInterviewChat({
          interviewConfigId: DEFAULT_CONFIG_ID,
          initialMessages: [],
        })
      );

      act(() => {
        result.current.handleSubmit({ text: "テスト" });
      });

      // 1回目のエラー（自動リトライ）
      act(() => {
        mockState.onFinish?.({
          object: undefined,
          error: new Error("エラー1"),
        });
      });

      // 2回目のエラー（手動リトライ待ち）
      act(() => {
        mockState.onFinish?.({
          object: undefined,
          error: new Error("エラー2"),
        });
      });

      expect(result.current.error).toBeTruthy();
      expect(result.current.canRetry).toBe(true);
    });
  });

  describe("handleResumeInterview（レポート未生成時の続行）", () => {
    it("要約の段階で再開を依頼し、戻れるかはサーバーの next_stage に従う", () => {
      const { result } = renderHook(() =>
        useInterviewChat({
          interviewConfigId: DEFAULT_CONFIG_ID,
          initialMessages: [],
          initialStage: "summary",
        })
      );

      act(() => {
        result.current.handleResumeInterview();
      });
      expect(mockSubmit).toHaveBeenCalledOnce();
      expect(result.current.messages.at(-1)?.content).toBe(
        "もう少しインタビューを続けたいです。"
      );

      act(() => {
        mockState.onFinish?.({
          object: { text: "続けてどうぞ。", next_stage: "chat" },
          error: undefined,
        });
      });
      expect(result.current.stage).toBe("chat");
    });

    it("ローディング中はsubmitを呼ばない", () => {
      mockState.isLoading = true;
      const { result } = renderHook(() =>
        useInterviewChat({
          interviewConfigId: DEFAULT_CONFIG_ID,
          initialMessages: [],
        })
      );

      act(() => {
        result.current.handleResumeInterview();
      });

      expect(mockSubmit).not.toHaveBeenCalled();
    });
  });

  describe("handleEnd（「終える」ボタン）", () => {
    it("発言を足さずに action=end で送る", () => {
      const { result } = renderHook(() =>
        useInterviewChat({
          interviewConfigId: DEFAULT_CONFIG_ID,
          initialMessages: [],
        })
      );

      act(() => {
        result.current.handleEnd();
      });

      expect(mockSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ action: "end", messages: [] })
      );
      expect(result.current.messages).toHaveLength(0);
    });

    it("summary_complete の後は送らない", () => {
      const { result } = renderHook(() =>
        useInterviewChat({
          interviewConfigId: DEFAULT_CONFIG_ID,
          initialMessages: [],
          initialStage: "summary_complete",
        })
      );

      act(() => {
        result.current.handleEnd();
      });

      expect(mockSubmit).not.toHaveBeenCalled();
    });
  });

  describe("サーバーが注入する値", () => {
    it("chain_summary なら続けて要約を取りにいく", () => {
      const { result } = renderHook(() =>
        useInterviewChat({
          interviewConfigId: DEFAULT_CONFIG_ID,
          initialMessages: [],
        })
      );

      act(() => {
        result.current.handleSubmit({ text: "もうやめたい" });
      });
      mockSubmit.mockClear();
      act(() => {
        mockState.onFinish?.({
          object: {
            text: "わかりました。ここまでのお話をまとめますね。",
            next_stage: "summary",
            chain_summary: true,
          },
          error: undefined,
        });
      });

      expect(result.current.stage).toBe("summary");
      expect(mockSubmit).toHaveBeenCalledOnce();
      expect(mockSubmit.mock.calls[0][0].messages.at(-1)).toEqual({
        role: "assistant",
        content: "わかりました。ここまでのお話をまとめますね。",
      });
    });

    it("要約に入ったが chain_summary でないときは続けて送らない", () => {
      const { result } = renderHook(() =>
        useInterviewChat({
          interviewConfigId: DEFAULT_CONFIG_ID,
          initialMessages: [],
        })
      );

      act(() => {
        result.current.handleSubmit({ text: "特にないです" });
      });
      mockSubmit.mockClear();
      act(() => {
        mockState.onFinish?.({
          object: { text: "まとめです", next_stage: "summary" },
          error: undefined,
        });
      });

      expect(mockSubmit).not.toHaveBeenCalled();
    });

    it("サーバーが決めた question_id・話題名・選択肢を使う", () => {
      const { result } = renderHook(() =>
        useInterviewChat({
          interviewConfigId: DEFAULT_CONFIG_ID,
          initialMessages: [],
        })
      );

      act(() => {
        result.current.handleSubmit({ text: "はい" });
      });
      act(() => {
        mockState.onFinish?.({
          object: {
            text: "ふだんの場面を教えてください。",
            question_id: "Q2",
            topic_title: "LLMの名前",
            resolved_question_id: "uuid-2",
            resolved_topic_title: "ふだんの場面",
            quick_replies: ["思い出せない", "この質問はとばす"],
            next_stage: "chat",
          },
          error: undefined,
        });
      });

      const last = result.current.messages.at(-1);
      expect(last?.questionId).toBe("uuid-2");
      expect(last?.topicTitle).toBe("ふだんの場面");
      expect(result.current.currentQuickReplies).toEqual([
        "思い出せない",
        "この質問はとばす",
      ]);
    });
  });

  describe("handleRetry", () => {
    it("canRetryがfalse: submitを呼ばない", () => {
      const { result } = renderHook(() =>
        useInterviewChat({
          interviewConfigId: DEFAULT_CONFIG_ID,
          initialMessages: [],
        })
      );

      expect(result.current.canRetry).toBe(false);

      act(() => {
        result.current.handleRetry();
      });

      expect(mockSubmit).not.toHaveBeenCalled();
    });

    it("canRetryがtrue: submitが呼ばれる", () => {
      const { result } = renderHook(() =>
        useInterviewChat({
          interviewConfigId: DEFAULT_CONFIG_ID,
          initialMessages: [],
        })
      );

      // エラーを2回発生させてcanRetry = trueにする
      act(() => {
        result.current.handleSubmit({ text: "テスト" });
      });

      act(() => {
        mockState.onFinish?.({
          object: undefined,
          error: new Error("エラー1"),
        });
      });

      act(() => {
        mockState.onFinish?.({
          object: undefined,
          error: new Error("エラー2"),
        });
      });

      expect(result.current.canRetry).toBe(true);

      mockSubmit.mockClear();

      act(() => {
        result.current.handleRetry();
      });

      expect(mockSubmit).toHaveBeenCalledOnce();
    });
  });

  describe("currentQuickReplies", () => {
    it("ローディング中: currentQuickRepliesが空配列", () => {
      mockState.isLoading = true;

      const { result } = renderHook(() =>
        useInterviewChat({
          interviewConfigId: DEFAULT_CONFIG_ID,
          initialMessages: [],
        })
      );

      expect(result.current.currentQuickReplies).toEqual([]);
    });

    it("最後がユーザーメッセージ: currentQuickRepliesが空配列", () => {
      const { result } = renderHook(() =>
        useInterviewChat({
          interviewConfigId: DEFAULT_CONFIG_ID,
          initialMessages: [],
        })
      );

      act(() => {
        result.current.handleSubmit({ text: "テスト" });
      });

      // ユーザーメッセージが最後の状態
      expect(result.current.currentQuickReplies).toEqual([]);
    });
  });
});
