import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { buildLoopModeSystemPrompt } from "../../packages/shared/src/interview-prompts/loop-mode";
import { buildSummarySystemPrompt } from "../../packages/shared/src/interview-prompts/summary";
import { INTERVIEW_PROMPT_CATALOG } from "../../packages/shared/src/prompts/catalog";
import { PromptProvider } from "../../packages/shared/src/prompts/provider";
import {
  createPromptVersion,
  findPromptState,
  findPublishedPrompt,
  publishPromptVersion,
} from "../../packages/shared/src/prompts/repository";
import { adminClient, createTestAdminUser } from "./utils";

const input = {
  bill: null,
  interviewConfig: { name: "交通", description: "交通の改善" },
  questions: [{ id: "q1", question: "困りごとは？" }],
  currentStage: "chat" as const,
  askedQuestionIds: new Set<string>(),
};

describe("AIインタビューの共通プロンプト版管理", () => {
  let actorId: string;
  beforeAll(async () => {
    actorId = (
      await createTestAdminUser(`interview-prompt-${randomUUID()}@example.com`)
    ).id;
  });

  it("migrationで対話用と要約用の管理対象を登録する", async () => {
    const { data, error } = await adminClient
      .from("ai_prompts")
      .select("key")
      .in("key", Object.keys(INTERVIEW_PROMPT_CATALOG));
    if (error) throw error;
    expect(data?.map((p) => p.key).sort()).toEqual([
      "interview-chat-system",
      "interview-summary-system",
    ]);
  });

  it.each([
    "interview-chat-system",
    "interview-summary-system",
  ] as const)("%s の下書きは適用せず、公開・復旧した文面を使用する", async (promptKey) => {
    const key = `test-interview-${randomUUID()}`;
    const { error } = await adminClient
      .from("ai_prompts")
      .insert({ key, name: key });
    if (error) throw error;
    const provider = new PromptProvider({
      findPublishedPrompt: () => findPublishedPrompt(key),
    });
    const render = async () => {
      const template = await provider.getTemplate(promptKey);
      return promptKey === "interview-chat-system"
        ? buildLoopModeSystemPrompt(input, template.content)
        : buildSummarySystemPrompt(
            {
              ...input,
              messages: [
                { role: "user", id: "message-1", content: "増便を希望" },
              ],
            },
            template.content
          );
    };
    const content = INTERVIEW_PROMPT_CATALOG[promptKey].defaultContent;
    const first = await createPromptVersion({
      key,
      content: `初版の方針\n${content}`,
      changeNote: "初版",
      actorId,
      expectedRevision: 0,
    });
    expect(await render()).not.toContain("初版の方針");
    await publishPromptVersion({
      key,
      versionId: first,
      changeNote: "公開",
      actorId,
      expectedRevision: 1,
    });
    expect(await render()).toContain("初版の方針");
    const second = await createPromptVersion({
      key,
      content: `新版の方針\n${content}`,
      changeNote: "改訂",
      actorId,
      expectedRevision: 2,
    });
    expect(await render()).not.toContain("新版の方針");
    await publishPromptVersion({
      key,
      versionId: second,
      changeNote: "更新",
      actorId,
      expectedRevision: 3,
    });
    expect(await render()).toContain("新版の方針");
    await publishPromptVersion({
      key,
      versionId: first,
      changeNote: "復旧",
      actorId,
      expectedRevision: 4,
    });
    const restored = await render();
    expect(restored).toContain("初版の方針");
    expect(restored).not.toContain("新版の方針");
    expect(restored).toContain("next_stage");
    expect(restored).toContain(
      promptKey === "interview-chat-system"
        ? "[ID: q1]"
        : "user [msg_id:message-1]"
    );
    expect((await findPromptState(key)).versions).toHaveLength(2);
  });
});
