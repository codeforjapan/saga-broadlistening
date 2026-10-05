import { describe, expect, it } from "vitest";
import { parseTopDesign } from "./top-design";

describe("parseTopDesign", () => {
  it("a / b をそのまま案として返す", () => {
    expect(parseTopDesign("a")).toBe("a");
    expect(parseTopDesign("b")).toBe("b");
  });

  it("大文字でも受け付ける", () => {
    expect(parseTopDesign("A")).toBe("a");
  });

  it("同じパラメータが複数あるときは先頭を使う", () => {
    expect(parseTopDesign(["b", "a"])).toBe("b");
  });

  it("未指定・不正値は null（現行TOPのまま）", () => {
    expect(parseTopDesign(undefined)).toBeNull();
    expect(parseTopDesign("")).toBeNull();
    expect(parseTopDesign("c")).toBeNull();
    expect(parseTopDesign([])).toBeNull();
  });
});
