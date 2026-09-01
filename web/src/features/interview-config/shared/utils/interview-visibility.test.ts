import { describe, expect, it } from "vitest";
import {
  isInterviewVisible,
  isLinkedPolicy,
  isOpenInterview,
  selectPrimaryPolicyId,
  toLinkedPolicies,
} from "./interview-visibility";

describe("toLinkedPolicies", () => {
  it("publish_status から公開済みかどうかに正規化する", () => {
    expect(
      toLinkedPolicies([
        { policies: { id: "policy-1", publish_status: "published" } },
        { policies: { id: "policy-2", publish_status: "draft" } },
      ])
    ).toEqual([
      { id: "policy-1", isPublished: true },
      { id: "policy-2", isPublished: false },
    ]);
  });

  it("施策を辿れない紐付け行は落とす", () => {
    expect(toLinkedPolicies([{ policies: null }])).toEqual([]);
  });

  it("紐付けがなければ空配列を返す", () => {
    expect(toLinkedPolicies([])).toEqual([]);
  });
});

describe("isInterviewVisible", () => {
  it("施策に紐づかない抽象テーマ型は公開してよい", () => {
    expect(isInterviewVisible([])).toBe(true);
  });

  it("公開済み施策が1件でもあれば公開してよい", () => {
    expect(
      isInterviewVisible([{ isPublished: false }, { isPublished: true }])
    ).toBe(true);
  });

  it("紐づく施策がすべて未公開なら公開しない", () => {
    expect(
      isInterviewVisible([{ isPublished: false }, { isPublished: false }])
    ).toBe(false);
  });
});

describe("selectPrimaryPolicyId", () => {
  it("公開済みの先頭1件を採用する", () => {
    expect(
      selectPrimaryPolicyId([
        { id: "policy-1", isPublished: false },
        { id: "policy-2", isPublished: true },
        { id: "policy-3", isPublished: true },
      ])
    ).toBe("policy-2");
  });

  it("公開済み施策がなければ施策なしとして扱う", () => {
    expect(
      selectPrimaryPolicyId([{ id: "policy-1", isPublished: false }])
    ).toBeNull();
  });

  it("抽象テーマ型は施策なしとして扱う", () => {
    expect(selectPrimaryPolicyId([])).toBeNull();
  });
});

describe("isLinkedPolicy", () => {
  it("紐づく施策なら true", () => {
    expect(
      isLinkedPolicy([{ id: "policy-1", isPublished: false }], "policy-1")
    ).toBe(true);
  });

  it("紐づかない施策なら false", () => {
    expect(
      isLinkedPolicy([{ id: "policy-1", isPublished: true }], "policy-2")
    ).toBe(false);
  });

  it("抽象テーマ型はどの施策とも紐づかない", () => {
    expect(isLinkedPolicy([], "policy-1")).toBe(false);
  });
});

describe("isOpenInterview", () => {
  it("募集中なら true", () => {
    expect(isOpenInterview("open")).toBe(true);
  });

  it("募集終了・下書きは false（結果は見せても参加導線は出さない）", () => {
    expect(isOpenInterview("closed")).toBe(false);
    expect(isOpenInterview("draft")).toBe(false);
  });
});
