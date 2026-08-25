import { describe, expect, it } from "vitest";
import { resolveBackfillParams } from "./backfill-params";

const UUID = "11111111-1111-4111-8111-111111111111";

describe("resolveBackfillParams", () => {
  it("デフォルトは scope=pending・interviewConfigId なし", () => {
    expect(resolveBackfillParams({})).toEqual({
      ok: true,
      params: { interviewConfigId: undefined, scope: "pending" },
    });
  });

  it("interviewConfigId 指定の pending を受け付ける", () => {
    expect(resolveBackfillParams({ interviewConfigId: UUID })).toEqual({
      ok: true,
      params: { interviewConfigId: UUID, scope: "pending" },
    });
  });

  it("scope=all は interviewConfigId があれば受け付ける", () => {
    expect(resolveBackfillParams({ interviewConfigId: UUID, scope: "all" })).toEqual({
      ok: true,
      params: { interviewConfigId: UUID, scope: "all" },
    });
  });

  it("scope=all で interviewConfigId が無ければエラー（全テーマ×全部は不可）", () => {
    const result = resolveBackfillParams({ scope: "all" });
    expect(result.ok).toBe(false);
  });

  it("未知の scope 文字列は pending に丸める", () => {
    expect(resolveBackfillParams({ scope: "everything" })).toEqual({
      ok: true,
      params: { interviewConfigId: undefined, scope: "pending" },
    });
  });

  it("UUID 形式でない interviewConfigId はエラー", () => {
    const result = resolveBackfillParams({ interviewConfigId: "not-a-uuid" });
    expect(result.ok).toBe(false);
  });

  it("空文字・空白の interviewConfigId は未指定として扱う", () => {
    expect(resolveBackfillParams({ interviewConfigId: "   " })).toEqual({
      ok: true,
      params: { interviewConfigId: undefined, scope: "pending" },
    });
  });

  it("登録済みモデルIDを受け付ける", () => {
    const result = resolveBackfillParams({ model: "anthropic/claude-sonnet-4.6" });
    expect(result).toEqual({
      ok: true,
      params: {
        interviewConfigId: undefined,
        scope: "pending",
        model: "anthropic/claude-sonnet-4.6",
      },
    });
  });

  it("未知のモデルIDはエラー", () => {
    const result = resolveBackfillParams({ model: "openai/gpt-3.5-turbo" });
    expect(result.ok).toBe(false);
  });

  it("空文字・空白の model は未指定として扱う", () => {
    const result = resolveBackfillParams({ model: "  " });
    expect(result).toEqual({
      ok: true,
      params: { interviewConfigId: undefined, scope: "pending", model: undefined },
    });
  });

  it("非文字列の model は throw せず検証エラーになる", () => {
    const result = resolveBackfillParams({ model: 123 });
    expect(result.ok).toBe(false);
  });

  it("非文字列の interviewConfigId は throw せず検証エラーになる", () => {
    const result = resolveBackfillParams({ interviewConfigId: { id: 1 } });
    expect(result.ok).toBe(false);
  });
});
