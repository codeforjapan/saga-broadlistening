import { describe, expect, it } from "vitest";
import { injectJsonFields, injectJsonFieldsAsync } from "./inject-json-fields";

/**
 * ReadableStreamを作成するヘルパー
 */
function createStream(chunks: string[]): ReadableStream<string> {
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(chunk);
      }
      controller.close();
    },
  });
}

/**
 * ReadableStream<Uint8Array>を文字列に変換するヘルパー
 */
async function streamToString(
  stream: ReadableStream<Uint8Array>
): Promise<string> {
  const reader = stream.getReader();
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
 * チャンクを1つずつ流し、その時点までに出てきた文字列を返す。
 * 途中まで送ったところで、どこまでが読み手に届いているかを確かめるために使う。
 */
async function emittedAfterEachChunk(
  chunks: string[],
  resolveFields: () => Promise<Record<string, unknown>> = async () => ({})
): Promise<string[]> {
  let input!: ReadableStreamDefaultController<string>;
  const source = new ReadableStream<string>({
    start(controller) {
      input = controller;
    },
  });
  const reader = injectJsonFieldsAsync(source, resolveFields).getReader();
  const decoder = new TextDecoder();
  let emitted = "";
  const snapshots: string[] = [];
  // 読み取りを待たせておき、届いたものを足していく
  let pending = reader.read();
  const drain = async () => {
    for (;;) {
      const next = await Promise.race([
        pending,
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 0)),
      ]);
      if (next === null) return;
      if (next.done) return;
      emitted += decoder.decode(next.value, { stream: true });
      pending = reader.read();
    }
  };
  for (const chunk of chunks) {
    input.enqueue(chunk);
    await drain();
    snapshots.push(emitted);
  }
  input.close();
  await drain();
  snapshots.push(emitted);
  return snapshots;
}

describe("injectJsonFields", () => {
  it("単一フィールドを注入できる", async () => {
    const input = '{"text":"hello","count":1}';
    const stream = createStream([input]);

    const result = await streamToString(
      injectJsonFields(stream, { next_stage: "summary" })
    );

    expect(JSON.parse(result)).toEqual({
      text: "hello",
      count: 1,
      next_stage: "summary",
    });
  });

  it("複数フィールドを注入できる", async () => {
    const input = '{"text":"hello"}';
    const stream = createStream([input]);

    const result = await streamToString(
      injectJsonFields(stream, {
        next_stage: "chat",
        timestamp: 12345,
      })
    );

    expect(JSON.parse(result)).toEqual({
      text: "hello",
      next_stage: "chat",
      timestamp: 12345,
    });
  });

  it("ネストしたオブジェクトを注入できる", async () => {
    const input = '{"text":"hello"}';
    const stream = createStream([input]);

    const result = await streamToString(
      injectJsonFields(stream, {
        metadata: { source: "llm", version: 1 },
      })
    );

    expect(JSON.parse(result)).toEqual({
      text: "hello",
      metadata: { source: "llm", version: 1 },
    });
  });

  it("空のフィールドオブジェクトでは何も注入しない", async () => {
    const input = '{"text":"hello"}';
    const stream = createStream([input]);

    const result = await streamToString(injectJsonFields(stream, {}));

    expect(JSON.parse(result)).toEqual({
      text: "hello",
    });
  });

  it("複数チャンクに分割されたストリームを処理できる", async () => {
    // LLMのストリーミング出力をシミュレート
    const chunks = ['{"te', 'xt":"h', 'ello","co', 'unt":1}'];
    const stream = createStream(chunks);

    const result = await streamToString(
      injectJsonFields(stream, { next_stage: "summary" })
    );

    expect(JSON.parse(result)).toEqual({
      text: "hello",
      count: 1,
      next_stage: "summary",
    });
  });

  it("ネストしたJSONオブジェクトの最後の閉じ括弧の前に注入する", async () => {
    const input = '{"text":"hello","report":{"summary":"test"}}';
    const stream = createStream([input]);

    const result = await streamToString(
      injectJsonFields(stream, { next_stage: "summary" })
    );

    expect(JSON.parse(result)).toEqual({
      text: "hello",
      report: { summary: "test" },
      next_stage: "summary",
    });
  });

  it("文字列値に閉じ括弧が含まれていても正しく処理できる", async () => {
    const input = '{"text":"hello}world"}';
    const stream = createStream([input]);

    const result = await streamToString(
      injectJsonFields(stream, { added: true })
    );

    // 最後の } の前に注入されるので、文字列内の } は無視される
    expect(JSON.parse(result)).toEqual({
      text: "hello}world",
      added: true,
    });
  });

  it("配列を値として注入できる", async () => {
    const input = '{"text":"hello"}';
    const stream = createStream([input]);

    const result = await streamToString(
      injectJsonFields(stream, {
        tags: ["a", "b", "c"],
      })
    );

    expect(JSON.parse(result)).toEqual({
      text: "hello",
      tags: ["a", "b", "c"],
    });
  });

  it("null値を注入できる", async () => {
    const input = '{"text":"hello"}';
    const stream = createStream([input]);

    const result = await streamToString(
      injectJsonFields(stream, { nullable_field: null })
    );

    expect(JSON.parse(result)).toEqual({
      text: "hello",
      nullable_field: null,
    });
  });

  it("1文字ずつストリームされても正しく処理できる", async () => {
    const input = '{"text":"hi"}';
    const chunks = input.split("");
    const stream = createStream(chunks);

    const result = await streamToString(
      injectJsonFields(stream, { added: true })
    );

    expect(JSON.parse(result)).toEqual({
      text: "hi",
      added: true,
    });
  });
});

describe("injectJsonFieldsAsync", () => {
  it("ストリームを読み切った後に決まった値を注入する", async () => {
    let finished = false;
    const stream = createStream(['{"text":"こん', 'にちは"}']);
    const result = await streamToString(
      injectJsonFieldsAsync(stream, async () => {
        finished = true;
        return { next_stage: "summary", quick_replies: ["はい"] };
      })
    );
    expect(finished).toBe(true);
    expect(JSON.parse(result)).toEqual({
      text: "こんにちは",
      next_stage: "summary",
      quick_replies: ["はい"],
    });
  });

  it("注入する値が無ければそのまま返す", async () => {
    const stream = createStream(['{"text":"a"}']);
    const result = await streamToString(
      injectJsonFieldsAsync(stream, async () => ({}))
    );
    expect(result).toBe('{"text":"a"}');
  });

  it("本文は受け取ったそばから流し、最後の閉じ括弧より後だけを止めておく", async () => {
    // outputFormat はキーをアルファベット順に返すので、本文の後ろに短い値が続く
    const chunks = [
      '{"end_request":false,"question_id":"Q1","text":"',
      "通勤が",
      "大変なんですね。",
      '","topic_title":"仕事","wrap_up":false}',
    ];
    const snapshots = await emittedAfterEachChunk(chunks, async () => ({
      next_stage: "chat",
    }));

    expect(snapshots[1]).toContain('"text":"通勤が');
    expect(snapshots[2]).toContain("通勤が大変なんですね。");
    // 閉じ括弧は注入のために止めておく
    expect(snapshots[3]).toBe(
      '{"end_request":false,"question_id":"Q1","text":"通勤が大変なんですね。","topic_title":"仕事","wrap_up":false'
    );
    expect(JSON.parse(snapshots[4])).toEqual({
      end_request: false,
      question_id: "Q1",
      text: "通勤が大変なんですね。",
      topic_title: "仕事",
      wrap_up: false,
      next_stage: "chat",
    });
  });

  it("閉じ括弧で終わるチャンクはその括弧だけを止め、続きが来たら流す", async () => {
    const snapshots = await emittedAfterEachChunk(
      ['{"text":"a}', 'b"', "}"],
      async () => ({ next_stage: "chat" })
    );

    expect(snapshots[0]).toBe('{"text":"a');
    expect(snapshots[1]).toBe('{"text":"a}b"');
    // 最後の閉じ括弧は注入のために止めておく
    expect(snapshots[2]).toBe('{"text":"a}b"');
    expect(JSON.parse(snapshots[3])).toEqual({
      text: "a}b",
      next_stage: "chat",
    });
  });

  it("最後の閉じ括弧の後ろの空白も残して注入する", async () => {
    const result = await streamToString(
      injectJsonFieldsAsync(createStream(['{"text":"a"}', "\n"]), async () => ({
        next_stage: "chat",
      }))
    );
    expect(result).toBe('{"text":"a","next_stage":"chat"}\n');
  });

  it("チャンクの境目で割れた絵文字を壊さない", async () => {
    const snapshots = await emittedAfterEachChunk(
      ['{"text":"a\ud83d', '\ude00b"}'],
      async () => ({ next_stage: "chat" })
    );

    expect(snapshots[0]).toBe('{"text":"a');
    expect(JSON.parse(snapshots[2])).toEqual({
      text: "a😀b",
      next_stage: "chat",
    });
  });
});
