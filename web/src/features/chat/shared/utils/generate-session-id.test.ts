import { afterEach, describe, expect, it, vi } from "vitest";
import { generateSessionId } from "./generate-session-id";

const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe("generateSessionId", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("crypto.randomUUID が利用可能ならそれを使う", () => {
    const randomUUID = vi.fn(() => "11111111-1111-4111-8111-111111111111");
    vi.stubGlobal("crypto", { randomUUID });

    expect(generateSessionId()).toBe("11111111-1111-4111-8111-111111111111");
    expect(randomUUID).toHaveBeenCalledOnce();
  });

  it("randomUUID が無くても getRandomValues でUUID v4を生成する", () => {
    vi.stubGlobal("crypto", {
      getRandomValues: (arr: Uint8Array) => {
        for (let i = 0; i < arr.length; i++) {
          arr[i] = i;
        }
        return arr;
      },
    });

    const id = generateSessionId();
    expect(id).toMatch(UUID_V4_REGEX);
  });

  it("crypto が無い環境でもUUID v4形式の文字列を返す", () => {
    vi.stubGlobal("crypto", undefined);

    const id = generateSessionId();
    expect(id).toMatch(UUID_V4_REGEX);
  });

  it("呼び出しごとに異なるIDを返す", () => {
    vi.stubGlobal("crypto", undefined);

    expect(generateSessionId()).not.toBe(generateSessionId());
  });
});
