import "server-only";

import { type LangfuseSpan, startActiveObservation } from "@langfuse/tracing";
import {
  createTextFieldDetector,
  formatServerTiming,
  isBedrockOutputEvent,
  type StageTiming,
  type StreamMarks,
  summarizeStages,
  summarizeStreamTiming,
} from "../../shared/utils/interview-chat-timing";

export type InterviewChatTrace = ReturnType<typeof createInterviewChatTrace>;

// サーバーレス関数のインスタンスごとに最初の1回だけ true になる
let isColdStart = true;

/**
 * /api/interview/chat の時間の内訳（#240）を記録する。
 *
 * 前処理の各段階は、レスポンスヘッダーを送る前に終わるので Server-Timing に載せる。
 * ストリーム内の指標はヘッダーの送信後に決まるので、Langfuse のメタデータにだけ残す。
 */
export function createInterviewChatTrace(
  requestStart = performance.now(),
  root?: LangfuseSpan
) {
  const coldStart = isColdStart;
  isColdStart = false;

  const stages: StageTiming[] = [];
  const marks: StreamMarks = { requestStart };
  const detectText = createTextFieldDetector();
  let promptChars: Record<string, number> | undefined;

  return {
    addStage(name: string, durationMs: number) {
      stages.push({ name, durationMs });
    },

    /**
     * 1つの段階を Langfuse の span にして、かかった時間を記録する。
     * 並列の処理をまとめた段階は子の段階と時間が重なるので、足し合わせない
     */
    async measure<T>(name: string, fn: () => Promise<T>): Promise<T> {
      const span = root?.startObservation(name);
      const start = performance.now();
      try {
        return await fn();
      } finally {
        stages.push({ name, durationMs: performance.now() - start });
        span?.end();
      }
    },

    setPromptChars(chars: Record<string, number>) {
      promptChars = chars;
    },

    markLlmStart() {
      marks.llmStart = performance.now();
    },

    /** streamText の onChunk に渡す。生のイベントからモデルの出力の時刻を取る */
    observeRawChunk(rawValue: unknown) {
      if (!isBedrockOutputEvent(rawValue)) return;
      const now = performance.now();
      marks.firstToken ??= now;
      marks.lastToken = now;
    },

    /** レスポンスの本文から、`text` の最初の文字と本文の終わりを送った時刻を取る */
    observeResponseBody(body: ReadableStream<Uint8Array>) {
      const decoder = new TextDecoder();
      return body.pipeThrough(
        new TransformStream<Uint8Array, Uint8Array>({
          transform(chunk, controller) {
            if (
              marks.firstText === undefined &&
              detectText(decoder.decode(chunk, { stream: true }))
            ) {
              marks.firstText = performance.now();
            }
            controller.enqueue(chunk);
          },
          flush() {
            marks.responseEnd = performance.now();
          },
        })
      );
    },

    /** markLlmStart の後、レスポンスヘッダーを作るときに呼ぶ */
    serverTiming() {
      return formatServerTiming([
        ...stages,
        {
          name: "preprocess",
          durationMs: summarizeStreamTiming(marks).preprocessMs ?? 0,
        },
        ...(coldStart ? [{ name: "cold-start", durationMs: 0 }] : []),
      ]);
    },

    /** レスポンスの完了後に呼ぶ。中断やエラーでも、経路によらず span を閉じる */
    end() {
      root?.update({
        metadata: {
          promptChars,
          ...summarizeStreamTiming(marks),
          coldStart,
          stages: summarizeStages(stages),
        },
      });
      root?.end();
    },
  };
}

/**
 * 親の span を作って fn を実行する。streamText の span も同じトレースの子になる。
 * ストリームはこの関数を抜けた後も続くので、span は trace.end() で閉じる。
 */
export function runInterviewChatTrace<T>(
  requestStart: number,
  fn: (trace: InterviewChatTrace) => Promise<T>
): Promise<T> {
  return startActiveObservation(
    "interview-chat-request",
    (root) => fn(createInterviewChatTrace(requestStart, root)),
    { endOnExit: false }
  );
}
