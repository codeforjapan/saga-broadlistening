const TAIL_SIZE = 64;

function buildInjection(fields: Record<string, unknown>): string {
  const fieldEntries = Object.entries(fields);
  return fieldEntries.length > 0
    ? "," +
        fieldEntries
          .map(([key, value]) => `${JSON.stringify(key)}:${JSON.stringify(value)}`)
          .join(",")
    : "";
}

/**
 * injectJsonFields の注入フィールドを、ストリームの終わりに決める版。
 *
 * LLM の出力を読み切ってから決まる値（ステージ遷移・選択肢ボタンなど）を返すときに使う。
 * resolveFields はストリームの末尾で1回だけ呼ばれ、その結果を最後の閉じ括弧の前に挿入する。
 */
export function injectJsonFieldsAsync(
  textStream: ReadableStream<string>,
  resolveFields: () => Promise<Record<string, unknown>>
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  // 末尾の数文字をバッファリングして、最後の閉じ括弧を検出
  let tail = "";

  const transformer = new TransformStream<string, Uint8Array>({
    transform(chunk, controller) {
      const combined = tail + chunk;
      if (combined.length > TAIL_SIZE) {
        controller.enqueue(encoder.encode(combined.slice(0, -TAIL_SIZE)));
        tail = combined.slice(-TAIL_SIZE);
      } else {
        tail = combined;
      }
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
