import { describe, expect, it } from "vitest";
import {
  buildHealthCheckConverseInput,
  resolveGuardrailOptions,
} from "./build-converse-input";
import { extractReplyText } from "./extract-reply-text";

describe("buildHealthCheckConverseInput", () => {
  it("指定したmodelIdでConverseCommand用の入力を組み立てる", () => {
    const input = buildHealthCheckConverseInput(
      "anthropic.claude-3-5-sonnet-20241022-v2:0"
    );

    expect(input.modelId).toBe("anthropic.claude-3-5-sonnet-20241022-v2:0");

    const messages = input.messages ?? [];
    expect(messages).toHaveLength(1);

    const [message] = messages;
    expect(message?.role).toBe("user");
    expect(extractReplyText(message?.content?.[0])).toContain("ok");
  });

  it("guardrailを指定した場合はguardrailConfigを含める", () => {
    const input = buildHealthCheckConverseInput(
      "anthropic.claude-3-5-sonnet-20241022-v2:0",
      { guardrailId: "gr-123", guardrailVersion: "1" }
    );

    expect(input.guardrailConfig).toEqual({
      guardrailIdentifier: "gr-123",
      guardrailVersion: "1",
    });
  });

  it("guardrailを指定しない場合はguardrailConfigを含めない", () => {
    const input = buildHealthCheckConverseInput(
      "anthropic.claude-3-5-sonnet-20241022-v2:0"
    );

    expect(input.guardrailConfig).toBeUndefined();
  });
});

describe("resolveGuardrailOptions", () => {
  it("両方の環境変数が設定されている場合はGuardrailOptionsを返す", () => {
    const result = resolveGuardrailOptions("gr-123", "1");

    expect(result).toEqual({ guardrailId: "gr-123", guardrailVersion: "1" });
  });

  it("両方とも未設定の場合はundefinedを返す", () => {
    const result = resolveGuardrailOptions(undefined, undefined);

    expect(result).toBeUndefined();
  });

  it("guardrailIdのみ設定されている場合はエラーを投げる", () => {
    expect(() => resolveGuardrailOptions("gr-123", undefined)).toThrow(
      "guardrailId: set, guardrailVersion: unset"
    );
  });

  it("guardrailVersionのみ設定されている場合はエラーを投げる", () => {
    expect(() => resolveGuardrailOptions(undefined, "1")).toThrow(
      "guardrailId: unset, guardrailVersion: set"
    );
  });
});
