import { buildInterviewDesign } from "@mirai-gikai/shared/interview-prompts/subject-section";

export type StageTiming = { name: string; durationMs: number };

function roundMs(ms: number) {
  return Math.round(ms * 10) / 10;
}

/** Server-Timing ヘッダーの値を作る。ブラウザの DevTools（Network → Timing）に出る */
export function formatServerTiming(stages: StageTiming[]): string {
  return stages
    .map(({ name, durationMs }) => `${name};dur=${durationMs.toFixed(1)}`)
    .join(", ");
}

/** Langfuse のメタデータに載せる形（段階名 → ms）にする */
export function summarizeStages(stages: StageTiming[]) {
  return Object.fromEntries(
    stages.map(({ name, durationMs }) => [name, roundMs(durationMs)])
  );
}

const TEXT_FIELD_WITH_VALUE = /"text"\s*:\s*"[^"]/;

/**
 * LLM が出力する JSON の `text` の最初の文字が届いたかを判定する関数を作る。
 * キーと値がチャンクをまたいでもよいように、受け取った分を溜めて調べる。
 */
export function createTextFieldDetector(): (chunk: string) => boolean {
  let buffer = "";
  return (chunk) => {
    buffer += chunk;
    return TEXT_FIELD_WITH_VALUE.test(buffer);
  };
}

/**
 * Bedrock の生のストリームイベントが、モデルの出力を含むかを判定する。
 * JSON ツール方式では AI SDK が出力をまとめて返すので、真の TTFT はこのイベントでしか測れない。
 * Bedrock 以外のモデルでは常に false になり、TTFT と生成時間は null のままになる。
 */
export function isBedrockOutputEvent(rawValue: unknown): boolean {
  const delta = (
    rawValue as {
      contentBlockDelta?: {
        delta?: { text?: unknown; toolUse?: { input?: unknown } };
      };
    } | null
  )?.contentBlockDelta?.delta;
  const output = delta?.text ?? delta?.toolUse?.input;
  return typeof output === "string" && output.length > 0;
}

/** performance.now() の値。起きなかったものは undefined */
export type StreamMarks = {
  requestStart: number;
  llmStart?: number;
  firstToken?: number;
  lastToken?: number;
  firstText?: number;
  responseEnd?: number;
};

function elapsed(from: number | undefined, to: number | undefined) {
  return from === undefined || to === undefined ? null : roundMs(to - from);
}

export function summarizeStreamTiming(marks: StreamMarks) {
  return {
    /** リクエスト受信 → streamText の呼び出し */
    preprocessMs: elapsed(marks.requestStart, marks.llmStart),
    /** streamText の呼び出し → モデルの最初の出力 */
    ttftMs: elapsed(marks.llmStart, marks.firstToken),
    /** streamText の呼び出し → `text` の最初の文字をクライアントへ流した時刻 */
    firstTextMs: elapsed(marks.llmStart, marks.firstText),
    /** モデルの最初の出力 → 最後の出力 */
    generationMs: elapsed(marks.firstToken, marks.lastToken),
    /** モデルの最後の出力 → レスポンスの終了（onFinish の DB 書き込みを含む） */
    trailingWaitMs: elapsed(marks.lastToken, marks.responseEnd),
    /** リクエスト受信 → レスポンスの終了 */
    totalMs: elapsed(marks.requestStart, marks.responseEnd),
  };
}

/**
 * システムプロンプトの節ごとの文字数。入力トークンの内訳を調べるために記録する。
 * relatedPoliciesContent は knowledgeSection の内数。
 */
export function measureChatPromptSections(
  input: Parameters<typeof buildInterviewDesign>[0]
): Record<string, number> {
  const { subject: _subject, ...sections } = buildInterviewDesign(input);
  return {
    ...Object.fromEntries(
      Object.entries(sections).map(([name, text]) => [name, text.length])
    ),
    relatedPoliciesContent: (input.bill?.related_policies ?? []).reduce(
      (sum, policy) => sum + (policy.content?.length ?? 0),
      0
    ),
  };
}
