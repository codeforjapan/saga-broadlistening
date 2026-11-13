import { describe, expect, it } from "vitest";
import {
  appendMessageSearchFilterParams,
  hasReportLevelSearchFilters,
  parseMessageSearchFilterParams,
} from "./parse-message-search-filter-params";

describe("parseMessageSearchFilterParams", () => {
  it("有効な値をそのまま返す", () => {
    expect(parseMessageSearchFilterParams("医師")).toEqual({
      roleTitle: "医師",
    });
  });

  it("未指定はデフォルトを返す", () => {
    expect(parseMessageSearchFilterParams()).toEqual({ roleTitle: "" });
  });

  it("roleTitleは前後の空白を除去する", () => {
    expect(parseMessageSearchFilterParams("  医師  ")).toEqual({
      roleTitle: "医師",
    });
  });
});

describe("hasReportLevelSearchFilters", () => {
  it("すべてデフォルトならfalse", () => {
    expect(hasReportLevelSearchFilters({ roleTitle: "" })).toBe(false);
  });

  it("roleTitleが指定されていればtrue", () => {
    expect(hasReportLevelSearchFilters({ roleTitle: "医師" })).toBe(true);
  });
});

describe("appendMessageSearchFilterParams", () => {
  it("デフォルト以外の値のみパラメータに書き出す", () => {
    const params = new URLSearchParams();
    appendMessageSearchFilterParams(params, { roleTitle: "医師" });
    expect(params.get("roleTitle")).toBe("医師");
  });

  it("デフォルト値に戻した場合は既存のパラメータを削除する", () => {
    const params = new URLSearchParams("roleTitle=%E5%8C%BB%E5%B8%AB");
    appendMessageSearchFilterParams(params, { roleTitle: "" });
    expect(params.toString()).toBe("");
  });

  it("parseMessageSearchFilterParamsと往復して一致する", () => {
    const filters = { roleTitle: "教員" } as const;
    const params = new URLSearchParams();
    appendMessageSearchFilterParams(params, filters);
    expect(
      parseMessageSearchFilterParams(params.get("roleTitle") ?? undefined)
    ).toEqual(filters);
  });
});
