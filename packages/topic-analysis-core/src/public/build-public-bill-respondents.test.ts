import { describe, expect, it } from "vitest";
import { buildPublicBillRespondents } from "./build-public-bill-respondents";
import type { RawRespondentRow } from "./public-types";

function row(overrides: Partial<RawRespondentRow> = {}): RawRespondentRow {
  return {
    id: "r1",
    role_title: null,
    summary: "要約",
    final_text: "提出した意見の本文",
    created_at: null,
    ...overrides,
  };
}

describe("buildPublicBillRespondents", () => {
  it("summary・final_text・created_at をそのまま引き継ぐ", () => {
    const [r] = buildPublicBillRespondents([
      row({
        role_title: "育休経験者",
        summary: "本文",
        final_text: "提出文",
        created_at: "2026-06-09",
      }),
    ]);
    expect(r.role_title).toBe("育休経験者");
    expect(r.summary).toBe("本文");
    expect(r.final_text).toBe("提出文");
    expect(r.created_at).toBe("2026-06-09");
  });

  it("汎用的な role_title は null に倒す（カテゴリラベルに委ねる）", () => {
    const result = buildPublicBillRespondents([
      row({ id: "a", role_title: "一般市民" }),
      row({ id: "b", role_title: "  " }),
      row({ id: "c", role_title: "小学校教員" }),
    ]);
    expect(result.map((r) => r.role_title)).toEqual([null, null, "小学校教員"]);
  });
});
