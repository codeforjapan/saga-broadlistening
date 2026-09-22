import { createServer } from "node:http";
import { gunzipSync } from "node:zlib";
import { Output, streamText } from "ai";
import { MockLanguageModelV3, convertArrayToReadableStream } from "ai/test";
import { z } from "zod";
import { trace } from "@opentelemetry/api";
import { afterAll, describe, expect, it, vi } from "vitest";
import {
  flushTelemetry,
  getLangfuseSpanProcessor,
  registerNodeTelemetry,
} from "./register";

describe("Langfuse telemetry", () => {
  afterAll(async () => {
    await getLangfuseSpanProcessor()?.shutdown();
    trace.disable();
  });

  it("認証情報がなければ初期化とflushを安全にスキップする", async () => {
    await registerNodeTelemetry({});
    expect(getLangfuseSpanProcessor()).toBeUndefined();
    await expect(flushTelemetry()).resolves.toBeUndefined();
  });

  it("初期化を重複せず、完了したAIスパンをv4ヘッダー付きでflushする", async () => {
    const requests: {
      url: string | undefined;
      version: string | string[] | undefined;
      body: string;
    }[] = [];
    const server = createServer(async (request, response) => {
      const chunks: Buffer[] = [];
      for await (const chunk of request) chunks.push(Buffer.from(chunk));
      const body = Buffer.concat(chunks);
      requests.push({
        url: request.url,
        version: request.headers["x-langfuse-ingestion-version"],
        body: (request.headers["content-encoding"] === "gzip"
          ? gunzipSync(body)
          : body
        ).toString(),
      });
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end("{}");
    });
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve)
    );
    try {
      const address = server.address();
      if (!address || typeof address === "string")
        throw new Error("Missing test server address");
      const config = {
        publicKey: "pk-lf-test",
        secretKey: "sk-lf-test",
        baseUrl: `http://127.0.0.1:${address.port}`,
        environment: "preview",
      };
      await registerNodeTelemetry(config);
      const processor = getLangfuseSpanProcessor();
      await Promise.all([
        registerNodeTelemetry(config),
        registerNodeTelemetry(config),
      ]);
      expect(getLangfuseSpanProcessor()).toBe(processor);
      vi.resetModules();
      const routeTelemetry = await import("./register");
      await routeTelemetry.registerNodeTelemetry(config);
      expect(routeTelemetry.getLangfuseSpanProcessor()).toBe(processor);
      const span = trace.getTracer("ai").startSpan("ai.streamText", {
        attributes: {
          "ai.telemetry.metadata.sessionId": "session-41",
          "ai.telemetry.metadata.userId": "user-41",
          "ai.telemetry.metadata.billId": "policy-41",
          "ai.telemetry.metadata.stage": "summary",
          "ai.telemetry.metadata.langfusePrompt":
            '{"name":"greeting","version":3,"isFallback":false}',
        },
      });
      await flushTelemetry();
      expect(requests).toHaveLength(0);
      span.setAttribute("ai.response.text", "stream complete");
      span.end();
      await routeTelemetry.flushTelemetry();
      expect(requests).toHaveLength(1);
      expect(requests[0]).toMatchObject({
        url: "/api/public/otel/v1/traces",
        version: "4",
      });
      for (const value of [
        "preview",
        "session-41",
        "user-41",
        "policy-41",
        "summary",
        "greeting",
        "stream complete",
      ]) {
        expect(requests[0].body).toContain(value);
      }

      for (const structured of [false, true]) {
        const output = structured
          ? '{"text":"interview complete"}'
          : "chat complete";
        let finishedText: string | undefined;
        const result = streamText({
          model: new MockLanguageModelV3({
            doStream: {
              stream: convertArrayToReadableStream([
                { type: "stream-start", warnings: [] },
                { type: "text-start", id: "text-1" },
                { type: "text-delta", id: "text-1", delta: output },
                { type: "text-end", id: "text-1" },
                {
                  type: "finish",
                  finishReason: { unified: "stop", raw: "stop" },
                  usage: {
                    inputTokens: {
                      total: 1,
                      noCache: 1,
                      cacheRead: 0,
                      cacheWrite: 0,
                    },
                    outputTokens: { total: 2, text: 2, reasoning: 0 },
                  },
                },
              ]),
            },
          }),
          prompt: "Hello",
          output: structured
            ? Output.object({ schema: z.object({ text: z.string() }) })
            : undefined,
          experimental_telemetry: {
            isEnabled: true,
            functionId: structured ? "interview-chat" : "chat",
            metadata: {
              sessionId: "session-41",
              userId: "user-41",
              billId: "policy-41",
              stage: "chat",
            },
          },
          onFinish: async ({ text }) => {
            finishedText = text;
          },
        });
        const response = structured
          ? new Response(result.textStream.pipeThrough(new TextEncoderStream()))
          : result.toUIMessageStreamResponse();
        await response.text();
        expect(finishedText).toBe(output);
        await flushTelemetry();
        const exported = requests
          .slice(1)
          .map((request) => request.body)
          .join("\n");
        expect(exported).toContain(
          structured ? "interview complete" : "chat complete"
        );
        expect(exported).toContain("ai.streamText.doStream");
        expect(exported).toContain("session-41");
      }
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve()))
      );
    }
  });
});
