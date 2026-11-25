import { describe, expect, it } from "vitest";
import { mergeExternalIdentities } from "./merge-external-identities";

const a = { id: "a" };
const b = { id: "b" };
const c = { id: "c" };

describe("mergeExternalIdentities", () => {
  it("Cookie 由来を先頭に、既存の紐付けを順序を保って続ける", () => {
    expect(mergeExternalIdentities([c], [b, a])).toEqual([c, b, a]);
  });

  it("同じ外部IDは1件にまとめる", () => {
    expect(mergeExternalIdentities([a], [b, a])).toEqual([a, b]);
    expect(mergeExternalIdentities([a, a], [])).toEqual([a]);
  });

  it("空入力を扱える", () => {
    expect(mergeExternalIdentities([], [])).toEqual([]);
    expect(mergeExternalIdentities([], [a])).toEqual([a]);
  });
});
