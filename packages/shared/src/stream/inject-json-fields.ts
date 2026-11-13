function buildInjection(fields: Record<string, unknown>): string {
  const fieldEntries = Object.entries(fields);
  return fieldEntries.length > 0
    ? "," +
        fieldEntries
          .map(
            ([key, value]) => `${JSON.stringify(key)}:${JSON.stringify(value)}`
          )
          .join(",")
    : "";
}

/** 最後の閉じ括弧になりうる "}" の位置。無ければ文字列の長さを返す */
function findFinalBraceCandidate(text: string): number {
  const lastBrace = text.lastIndexOf("}");
  if (lastBrace === -1 || text.slice(lastBrace + 1).trim() !== "") {
    return text.length;
  }
  return lastBrace;
}

/** サロゲートペアの前半（上位サロゲート）か。チャンクの境目で絵文字などが割れないよう、次まで止める */
function isHighSurrogate(code: number): boolean {
  return code >= 0xd800 && code <= 0xdbff;
}

/** いま流してよい長さ。最後の閉じ括弧の候補と、割れたサロゲートペアの前半は止めておく */
function findHoldPosition(text: string): number {
  const holdFrom = findFinalBraceCandidate(text);
  return holdFrom > 0 && isHighSurrogate(text.charCodeAt(holdFrom - 1))
    ? holdFrom - 1
    : holdFrom;
}

/**
 * injectJsonFields の注入フィールドを、ストリームの終わりに決める版。
 *
 * LLM の出力を読み切ってから決まる値（ステージ遷移・選択肢ボタンなど）を返すときに使う。
 * resolveFields はストリームの末尾で1回だけ呼ばれ、その結果を最後の閉じ括弧の前に挿入する。
 * ストリームは JSON オブジェクトで終わる前提（Output.object の textStream など）。
 * 最後の閉じ括弧の後ろに空白以外が続く出力では注入しない。
 */
export function injectJsonFieldsAsync(
  textStream: ReadableStream<string>,
  resolveFields: () => Promise<Record<string, unknown>>
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  // 最後の閉じ括弧になりうる部分（"}" と、その後ろの空白だけ）を止めておく。
  // "}" の後ろに空白以外が続けば、それは最後の閉じ括弧ではないので流してよい。
  // （止める量を固定の文字数にすると、短い本文が生成の終わりまで画面に出ない）
  let tail = "";

  const transformer = new TransformStream<string, Uint8Array>({
    transform(chunk, controller) {
      const combined = tail + chunk;
      const holdFrom = findHoldPosition(combined);
      const flushable = combined.slice(0, holdFrom);
      if (flushable) controller.enqueue(encoder.encode(flushable));
      tail = combined.slice(holdFrom);
    },

    async flush(controller) {
      // 末尾の閉じ括弧を探してフィールドを注入
      const injection = buildInjection(await resolveFields());
      const lastBrace = tail.lastIndexOf("}");
      if (lastBrace !== -1 && injection) {
        controller.enqueue(
          encoder.encode(
            `${tail.slice(0, lastBrace)}${injection}}${tail.slice(lastBrace + 1)}`
          )
        );
      } else {
        if (injection) {
          console.warn(
            "[injectJsonFields] No closing brace found in stream tail; fields were not injected."
          );
        }
        controller.enqueue(encoder.encode(tail));
      }
    },
  });

  return textStream.pipeThrough(transformer);
}

/**
 * JSONストリームに追加フィールドを注入するTransformStreamを作成
 *
 * LLMが生成するJSONオブジェクトの最後の閉じ括弧の前に
 * 追加のフィールドを挿入する
 *
 * @example
 * ```ts
 * const transformedStream = injectJsonFields(textStream, {
 *   next_stage: "summary",
 *   timestamp: Date.now(),
 * });
 * ```
 */
export function injectJsonFields(
  textStream: ReadableStream<string>,
  fields: Record<string, unknown>
): ReadableStream<Uint8Array> {
  return injectJsonFieldsAsync(textStream, async () => fields);
}
