import {
  getPublicChatSettings,
  savePublicChatSettings,
} from "@mirai-gikai/shared/ai/public-chat-settings-repository";
import {
  publicChatSettingsSchema,
  type PublicChatSettings,
} from "@mirai-gikai/shared/ai/public-chat-settings";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type { LanguageModelUsage, UIMessage } from "ai";
import { MockLanguageModelV3, convertArrayToReadableStream } from "ai/test";
import {
  adminClient,
  getAnonClient,
  cleanupTestPolicy,
  createTestPolicy,
  createTestPolicyWithConfig,
  createTestUser,
  cleanupTestUser,
  type TestUser,
} from "@test-utils/utils";
import { createStreamMock } from "@/test-utils/mock-language-model";
import { createMockPromptProvider } from "@/test-utils/mock-prompt-provider";
import {
  handleChatRequest,
  type ChatMessageMetadata,
} from "./handle-chat-request";
import { ChatError, ChatErrorCode } from "@/features/chat/shared/types/errors";
import { recordChatUsage } from "./cost-tracker";

/**
 * Response のボディストリームを全て読み込み、テキストとして返す。
 * onFinish コールバックを発火させるために必要。
 */
async function consumeResponseStream(response: Response): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) return "";
  const decoder = new TextDecoder();
  let result = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    result += decoder.decode(value, { stream: true });
  }
  return result;
}

/**
 * テスト用メッセージを作成するヘルパー
 */
function createTestMessages(
  overrides: Partial<ChatMessageMetadata> = {}
): UIMessage<ChatMessageMetadata>[] {
  return [
    {
      id: "test-msg-1",
      role: "user",
      parts: [{ type: "text", text: "テスト質問です" }],
      metadata: {
        difficultyLevel: "normal",
        sessionId: "",
        ...overrides,
      },
    },
  ];
}

describe("handleChatRequest 統合テスト", () => {
  let testUser: TestUser;
  let previousSettings: PublicChatSettings;

  beforeEach(async () => {
    testUser = await createTestUser();
    previousSettings = await getPublicChatSettings();
    await savePublicChatSettings(publicChatSettingsSchema.parse({}));
  });

  afterEach(async () => {
    await savePublicChatSettings(previousSettings);
    await adminClient
      .from("chat_usage_events")
      .delete()
      .eq("user_id", testUser.id);
    await cleanupTestUser(testUser.id);
  });

  describe("利用可能なツール", () => {
    it.each([
      "home",
      "bill",
    ] as const)("%sページでも保存済み設定を読み、許可ドメインを検索APIへ渡す", async (pageType) => {
      await savePublicChatSettings(
        publicChatSettingsSchema.parse({
          chat_model: "openai:gpt-4o",
          web_search_enabled: true,
          allowed_domains: ["city.saga.lg.jp"],
        })
      );
      expect(await getPublicChatSettings()).toEqual({
        chat_model: "openai:gpt-4o",
        web_search_enabled: true,
        allowed_domains: ["city.saga.lg.jp"],
      });
      const model = new MockLanguageModelV3({
        provider: "openai",
        modelId: "gpt-4o",
        doStream: {
          stream: convertArrayToReadableStream([
            { type: "stream-start", warnings: [] },
            {
              type: "tool-call",
              toolCallId: "search-1",
              toolName: "web_search",
              input: "{}",
              providerExecuted: true,
            },
            {
              type: "tool-result",
              toolCallId: "search-1",
              toolName: "web_search",
              result: { action: { type: "search", query: "佐賀市" } },
            },
            {
              type: "source",
              sourceType: "url",
              id: "source-1",
              url: "https://city.saga.lg.jp/",
              title: "佐賀市",
            },
            { type: "text-start", id: "text-1" },
            {
              type: "text-delta",
              id: "text-1",
              delta: "出典に基づいて説明します。",
            },
            { type: "text-end", id: "text-1" },
            {
              type: "finish",
              finishReason: { unified: "stop", raw: undefined },
              usage: {
                inputTokens: {
                  total: 0,
                  noCache: 0,
                  cacheRead: 0,
                  cacheWrite: 0,
                },
                outputTokens: { total: 0, text: 0, reasoning: 0 },
              },
            },
          ]),
        },
      });
      const response = await handleChatRequest({
        messages: createTestMessages({ pageContext: { type: pageType } }),
        userId: testUser.id,
        deps: { model, promptProvider: createMockPromptProvider() },
      });
      const content = await consumeResponseStream(response);
      expect(content).toContain('"type":"source-url"');
      expect(content).toContain("https://city.saga.lg.jp/");
      const { data: costRows } = await adminClient
        .from("chat_usage_events")
        .select("cost_usd")
        .eq("user_id", testUser.id);
      expect(costRows).toEqual([{ cost_usd: 0.01 }]);
      expect(model.doStreamCalls[0].tools).toEqual([
        expect.objectContaining({
          type: "provider",
          id: "openai.web_search",
          name: "web_search",
          args: { filters: { allowedDomains: ["city.saga.lg.jp"] } },
        }),
      ]);
      expect(model.doStreamCalls[0].prompt).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            role: "system",
            content: expect.stringContaining("出典URL"),
          }),
        ])
      );
    });

    it("検索ONの保存後に非対応モデルへ変わっても検索を送らない", async () => {
      await savePublicChatSettings(
        publicChatSettingsSchema.parse({
          web_search_enabled: true,
          allowed_domains: ["city.saga.lg.jp"],
        })
      );
      const model = new MockLanguageModelV3({
        provider: "bedrock",
        modelId: "jp.anthropic.claude-sonnet-4-6",
      });
      await expect(
        handleChatRequest({
          messages: createTestMessages(),
          userId: testUser.id,
          deps: { model, promptProvider: createMockPromptProvider() },
        })
      ).rejects.toThrow("対応していません");
      expect(model.doStreamCalls).toHaveLength(0);
    });

    it("匿名クライアントから設定の取得・変更はできない", async () => {
      const client = getAnonClient();
      const { data, error: readError } = await client
        .from("public_chat_settings")
        .select("*");
      if (readError) {
        expect(readError.code).toBe("42501");
        expect(data).toBeNull();
      } else {
        expect(data).toEqual([]);
      }
      const { error } = await client
        .from("public_chat_settings")
        .upsert({ id: true, chat_model: "openai:gpt-4o" });
      expect(error).not.toBeNull();
      expect((await getPublicChatSettings()).chat_model).toBeNull();
    });

    it("DBでも空のallowlistによる検索ONを拒否する", async () => {
      const { error } = await adminClient
        .from("public_chat_settings")
        .update({ web_search_enabled: true, allowed_domains: [] })
        .eq("id", true);
      expect(error?.code).toBe("23514");
      expect((await getPublicChatSettings()).web_search_enabled).toBe(false);
    });

    it("インタビュー提案の対象外ならOpenAIにもツールを渡さず通常応答を返す", async () => {
      const streamModel = createStreamMock(["施策について説明します。"]);
      const model = new MockLanguageModelV3({
        provider: "openai",
        modelId: "gpt-4o",
        doStream: (options) => streamModel.doStream(options),
      });
      const response = await handleChatRequest({
        messages: createTestMessages(),
        userId: testUser.id,
        deps: { model, promptProvider: createMockPromptProvider() },
      });
      const content = await consumeResponseStream(response);

      expect(response.status).toBe(200);
      expect(content).toContain("施策について説明します。");
      expect(model.doStreamCalls).toHaveLength(1);
      expect(model.doStreamCalls[0].tools).toBeUndefined();
      expect(model.doStreamCalls[0].prompt).not.toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            role: "system",
            content: expect.stringContaining("## Web検索"),
          }),
        ])
      );
    });

    it.each([
      false,
      true,
    ])("検索ON=%sでも募集中の施策ではインタビュー提案を維持する", async (searchEnabled) => {
      await savePublicChatSettings(
        publicChatSettingsSchema.parse({
          web_search_enabled: searchEnabled,
          allowed_domains: ["city.saga.lg.jp"],
        })
      );
      const fixture = await createTestPolicyWithConfig({
        policy: {
          publish_status: "published",
          published_at: new Date().toISOString(),
          enable_ai_chat: true,
        },
        config: { status: "open" },
      });
      try {
        const model = new MockLanguageModelV3({
          provider: "openai",
          modelId: "gpt-4o",
          doStream: {
            stream: convertArrayToReadableStream([
              { type: "stream-start", warnings: [] },
              { type: "text-start", id: "text-1" },
              {
                type: "text-delta",
                id: "text-1",
                delta: "ご意見をインタビューでお聞かせください。",
              },
              { type: "text-end", id: "text-1" },
              {
                type: "tool-call",
                toolCallId: "suggest-1",
                toolName: "suggest_interview",
                input: "{}",
              },
              {
                type: "finish",
                finishReason: { unified: "tool-calls", raw: undefined },
                usage: {
                  inputTokens: {
                    total: 100,
                    noCache: 100,
                    cacheRead: 0,
                    cacheWrite: 0,
                  },
                  outputTokens: { total: 20, text: 20, reasoning: 0 },
                },
              },
            ]),
          },
        });
        const response = await handleChatRequest({
          messages: createTestMessages({
            billContext: { ...fixture.policy, tags: [] },
            pageContext: { type: "bill" },
          }),
          userId: testUser.id,
          deps: { model, promptProvider: createMockPromptProvider() },
        });
        const content = await consumeResponseStream(response);

        expect(response.status).toBe(200);
        expect(model.doStreamCalls).toHaveLength(1);
        expect(
          model.doStreamCalls[0].tools?.map((entry) => entry.name)
        ).toEqual(
          searchEnabled
            ? ["web_search", "suggest_interview"]
            : ["suggest_interview"]
        );
        expect(content).toContain("ご意見をインタビューでお聞かせください。");
        expect(content).toContain('"type":"tool-output-available"');
        expect(content).toContain('"output":{"suggested":true}');
      } finally {
        await fixture.cleanup();
      }
    });
  });

  describe("ストリーミングレスポンス", () => {
    it("mock model + mock promptProvider でストリーミングレスポンスが返る", async () => {
      const mockModel = createStreamMock([
        "こんにちは",
        "！",
        "テスト応答です。",
      ]);
      const mockPromptProvider = createMockPromptProvider();
      const messages = createTestMessages();

      const response = await handleChatRequest({
        messages,
        userId: testUser.id,
        deps: { model: mockModel, promptProvider: mockPromptProvider },
      });

      expect(response.status).toBe(200);
      const content = await consumeResponseStream(response);
      // AI SDK のストリーム形式でテキストが含まれている
      expect(content.length).toBeGreaterThan(0);
    });

    it("billContext を持つメッセージで bill-chat-system プロンプトが選択される", async () => {
      const promptProvider = createMockPromptProvider(
        "請求書チャット用システムプロンプト"
      );
      const receivedPromptNames: string[] = [];

      // getPrompt が呼ばれた際にプロンプト名を記録するカスタムプロバイダー
      const trackingPromptProvider = {
        getPrompt: async (name: string, variables?: Record<string, string>) => {
          receivedPromptNames.push(name);
          return promptProvider.getPrompt(name, variables);
        },
      };

      const mockModel = createStreamMock(["テスト応答"]);
      const messages = createTestMessages({
        pageContext: { type: "bill" },
        difficultyLevel: "normal",
      });

      const response = await handleChatRequest({
        messages,
        userId: testUser.id,
        deps: { model: mockModel, promptProvider: trackingPromptProvider },
      });

      await consumeResponseStream(response);

      expect(receivedPromptNames).toHaveLength(1);
      expect(receivedPromptNames[0]).toBe("bill-chat-system-normal");
    });

    it("公開済み施策でAI質問機能ONなら knowledgeSource がサーバー側で取得されてプロンプト変数に渡る", async () => {
      const bill = await createTestPolicy({
        publish_status: "published",
        published_at: new Date().toISOString(),
      });
      await adminClient
        .from("policies")
        .update({
          knowledge_source: "補足ナレッジ本文",
          enable_ai_chat: true,
        })
        .eq("id", bill.id);

      try {
        const receivedVariables: Array<Record<string, string> | undefined> = [];
        const trackingPromptProvider = {
          getPrompt: async (
            _name: string,
            variables?: Record<string, string>
          ) => {
            receivedVariables.push(variables);
            return { content: "テスト", metadata: "{}" };
          },
        };
        const mockModel = createStreamMock(["応答"]);
        const messages = createTestMessages({
          billContext: {
            id: bill.id,
            name: bill.name,
          } as unknown as ChatMessageMetadata["billContext"],
        });

        const response = await handleChatRequest({
          messages,
          userId: testUser.id,
          deps: { model: mockModel, promptProvider: trackingPromptProvider },
        });
        await consumeResponseStream(response);

        expect(receivedVariables[0]?.knowledgeSource).toBe("補足ナレッジ本文");
      } finally {
        await cleanupTestPolicy(bill.id);
      }
    });

    it("公開済み施策でAI質問機能OFFなら knowledgeSource は空文字で渡る", async () => {
      const bill = await createTestPolicy({
        publish_status: "published",
        published_at: new Date().toISOString(),
      });
      await adminClient
        .from("policies")
        .update({
          knowledge_source: "本文があってもOFFなら無視",
          enable_ai_chat: false,
        })
        .eq("id", bill.id);

      try {
        const receivedVariables: Array<Record<string, string> | undefined> = [];
        const trackingPromptProvider = {
          getPrompt: async (
            _name: string,
            variables?: Record<string, string>
          ) => {
            receivedVariables.push(variables);
            return { content: "テスト", metadata: "{}" };
          },
        };
        const mockModel = createStreamMock(["応答"]);
        const messages = createTestMessages({
          billContext: {
            id: bill.id,
            name: bill.name,
          } as unknown as ChatMessageMetadata["billContext"],
        });

        const response = await handleChatRequest({
          messages,
          userId: testUser.id,
          deps: { model: mockModel, promptProvider: trackingPromptProvider },
        });
        await consumeResponseStream(response);

        expect(receivedVariables[0]?.knowledgeSource).toBe("");
      } finally {
        await cleanupTestPolicy(bill.id);
      }
    });

    it("クライアント側で bill 関連フィールドを偽装してもサーバー側のDB値が優先される", async () => {
      const bill = await createTestPolicy({
        publish_status: "published",
        published_at: new Date().toISOString(),
      });
      await adminClient
        .from("policies")
        .update({
          knowledge_source: null,
          enable_ai_chat: false,
        })
        .eq("id", bill.id);
      await adminClient.from("policy_contents").insert({
        policy_id: bill.id,
        difficulty_level: "normal",
        title: "サーバー側タイトル",
        summary: "サーバー側要約",
        content: "サーバー側本文",
      });

      try {
        const receivedVariables: Array<Record<string, string> | undefined> = [];
        const trackingPromptProvider = {
          getPrompt: async (
            _name: string,
            variables?: Record<string, string>
          ) => {
            receivedVariables.push(variables);
            return { content: "テスト", metadata: "{}" };
          },
        };
        const mockModel = createStreamMock(["応答"]);
        const messages = createTestMessages({
          billContext: {
            id: bill.id,
            name: "クライアント側で書き換えた名称",
            bill_content: {
              title: "クライアント側で書き換えたタイトル",
              summary: "クライアント側で書き換えた要約",
              content: "クライアント側で書き換えた本文",
            },
            knowledge_source: "クライアントから注入した秘密",
            enable_ai_chat: true,
          } as unknown as ChatMessageMetadata["billContext"],
        });

        const response = await handleChatRequest({
          messages,
          userId: testUser.id,
          deps: { model: mockModel, promptProvider: trackingPromptProvider },
        });
        await consumeResponseStream(response);

        expect(receivedVariables[0]?.knowledgeSource).toBe("");
        expect(receivedVariables[0]?.billName).toBe(bill.name);
        expect(receivedVariables[0]?.billTitle).toBe("サーバー側タイトル");
        expect(receivedVariables[0]?.billSummary).toBe("サーバー側要約");
        expect(receivedVariables[0]?.billContent).toBe("サーバー側本文");
      } finally {
        await cleanupTestPolicy(bill.id);
      }
    });

    it("pageContext.type が home の場合は top-chat-system プロンプトが選択される", async () => {
      const receivedPromptNames: string[] = [];
      const trackingPromptProvider = {
        getPrompt: async (name: string) => {
          receivedPromptNames.push(name);
          return { content: "ホームチャット用プロンプト", metadata: "{}" };
        },
      };

      const mockModel = createStreamMock(["テスト応答"]);
      const messages = createTestMessages({
        pageContext: {
          type: "home",
          bills: [{ id: "bill-1", name: "テスト施策" }],
        },
      });

      const response = await handleChatRequest({
        messages,
        userId: testUser.id,
        deps: { model: mockModel, promptProvider: trackingPromptProvider },
      });

      await consumeResponseStream(response);

      expect(receivedPromptNames[0]).toBe("top-chat-system");
    });
  });

  describe("chat_usage_events の保存", () => {
    it("ストリーム完了後に chat_usage_events が DB に保存される", async () => {
      const sessionId = `test-session-${Date.now()}`;
      const mockModel = createStreamMock(["テスト応答"]);
      const mockPromptProvider = createMockPromptProvider();
      const messages = createTestMessages({ sessionId });

      const response = await handleChatRequest({
        messages,
        userId: testUser.id,
        deps: { model: mockModel, promptProvider: mockPromptProvider },
      });

      // ストリームを全て読み込んで onFinish を発火させる
      await consumeResponseStream(response);

      // onFinish は非同期のため少し待つ
      await new Promise((resolve) => setTimeout(resolve, 200));

      const { data: usageEvents } = await adminClient
        .from("chat_usage_events")
        .select("*")
        .eq("user_id", testUser.id);

      expect(usageEvents).toHaveLength(1);
      expect(usageEvents?.[0].user_id).toBe(testUser.id);
      expect(usageEvents?.[0].session_id).toBe(sessionId);
    });

    it("sessionId が空の場合は session_id が null として保存される", async () => {
      const mockModel = createStreamMock(["応答"]);
      const mockPromptProvider = createMockPromptProvider();
      const messages = createTestMessages({ sessionId: "" });

      const response = await handleChatRequest({
        messages,
        userId: testUser.id,
        deps: { model: mockModel, promptProvider: mockPromptProvider },
      });

      await consumeResponseStream(response);
      await new Promise((resolve) => setTimeout(resolve, 200));

      const { data: usageEvents } = await adminClient
        .from("chat_usage_events")
        .select("session_id")
        .eq("user_id", testUser.id);

      expect(usageEvents).toHaveLength(1);
      expect(usageEvents?.[0].session_id).toBeNull();
    });
  });

  describe("コストリミット超過", () => {
    it("日次コストリミットを超過している場合は ChatError をスローする", async () => {
      // デイリーコストリミットを超える記録を事前にシード
      await recordChatUsage({
        userId: testUser.id,
        model: "openai/gpt-4o",
        usage: {
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: 0,
        } as LanguageModelUsage,
        costUsd: 9999.99,
      });

      const mockModel = createStreamMock(["テスト"]);
      const mockPromptProvider = createMockPromptProvider();
      const messages = createTestMessages();

      await expect(
        handleChatRequest({
          messages,
          userId: testUser.id,
          deps: { model: mockModel, promptProvider: mockPromptProvider },
        })
      ).rejects.toThrow(ChatError);

      await expect(
        handleChatRequest({
          messages,
          userId: testUser.id,
          deps: { model: mockModel, promptProvider: mockPromptProvider },
        })
      ).rejects.toMatchObject({
        code: ChatErrorCode.DAILY_COST_LIMIT_REACHED,
      });
    });
  });
});
