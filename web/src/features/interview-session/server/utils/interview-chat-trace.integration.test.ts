import type { LangfuseSpan } from "@langfuse/tracing";
import { describe, expect, it } from "vitest";
import { createInterviewChatTrace } from "./interview-chat-trace";

/** 渡された metadata を記録するだけの Langfuse span */
function createFakeRoot() {
  const updates: Array<{ metadata?: Record<string, unknown> }> = [];
  let ended = false;
  const span = { end: () => {} };
  const root = {
    startObservation: () => span,
    update: (attributes: { metadata?: Record<string, unknown> }) => {
      updates.push(attributes);
    },
    end: () => {
      ended = true;
    },
  } as unknown as LangfuseSpan;
  return { root, updates, isEnded: () => ended };
}

async function pipeBody(
  trace: ReturnType<typeof createInterviewChatTrace>,
  chunks: string[]
) {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
  return new Response(trace.observeResponseBody(body)).text();
}

describe("createInterviewChatTrace", () => {
  it("ストリームの各区間を metadata に載せて span を閉じる", async () => {
    const { root, updates, isEnded } = createFakeRoot();
    const trace = createInterviewChatTrace(performance.now(), root);

    await trace.measure("auth", async () => {});
    trace.markLlmStart();
    trace.observeRawChunk({ contentBlockStart: {} });
    trace.observeRawChunk({
      contentBlockDelta: { delta: { toolUse: { input: "{" } } },
    });
    trace.setPromptChars({ total: 10 });
    const chunks = ['{"question_id":"q1",', '"text":"こんにちは"}'];
    expect(await pipeBody(trace, chunks)).toBe(chunks.join(""));
    trace.end();

    expect(isEnded()).toBe(true);
    const metadata = updates[0].metadata;
    expect(metadata).toMatchObject({ promptChars: { total: 10 } });
    for (const key of [
      "preprocessMs",
      "ttftMs",
      "firstTextMs",
      "generationMs",
      "trailingWaitMs",
      "totalMs",
    ]) {
      expect(metadata?.[key]).toEqual(expect.any(Number));
    }
    expect(metadata?.stages).toHaveProperty("auth");
  });

  it("本文に text の文字が出なければ firstTextMs は null のまま", async () => {
    const { root, updates } = createFakeRoot();
    const trace = createInterviewChatTrace(performance.now(), root);

    trace.markLlmStart();
    await pipeBody(trace, ['{"text":"","wrap_up":false}']);
    trace.end();

    expect(updates[0].metadata?.firstTextMs).toBeNull();
  });

  it("cold-start はプロセスの最初のトレースにだけ付く", () => {
    createInterviewChatTrace();
    const trace = createInterviewChatTrace();
    trace.markLlmStart();

    expect(trace.serverTiming()).not.toContain("cold-start");
    expect(trace.serverTiming()).toMatch(/preprocess;dur=\d+\.\d/);
  });
});
