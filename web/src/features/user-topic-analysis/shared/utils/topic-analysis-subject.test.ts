import { describe, expect, it } from "vitest";
import {
  policyInterviewTarget,
  themeInterviewTarget,
} from "@/features/interview-config/shared/types/interview-target";
import {
  buildPolicyTopicSubject,
  buildThemeTopicSubject,
  getSubjectKindLabel,
  getTopicListHeading,
} from "./topic-analysis-subject";

describe("buildPolicyTopicSubject", () => {
  it("施策詳細を戻り先にする", () => {
    expect(
      buildPolicyTopicSubject({ id: "policy-1", name: "子育て支援策" })
    ).toEqual({
      name: "子育て支援策",
      href: "/bills/policy-1",
      label: "施策詳細",
    });
  });
});

describe("buildThemeTopicSubject", () => {
  it("募集中のテーマはテーマページを戻り先にする", () => {
    expect(
      buildThemeTopicSubject({
        slug: "kosodate",
        name: "子育ての困りごと",
        isOpen: true,
      })
    ).toEqual({
      name: "子育ての困りごと",
      href: "/interviews/kosodate",
      label: "テーマ詳細",
    });
  });

  it("募集が終わったテーマは個別ページが無いためテーマ一覧に送る", () => {
    expect(
      buildThemeTopicSubject({
        slug: "kosodate",
        name: "子育ての困りごと",
        isOpen: false,
      })
    ).toEqual({
      name: "子育ての困りごと",
      href: "/interviews",
      label: "テーマ一覧",
    });
  });
});

describe("getTopicListHeading", () => {
  it("起点によって見出しを出し分ける", () => {
    expect(getTopicListHeading(policyInterviewTarget("policy-1"))).toBe(
      "💬施策のトピック一覧"
    );
    expect(getTopicListHeading(themeInterviewTarget("kosodate"))).toBe(
      "💬テーマのトピック一覧"
    );
  });
});

describe("getSubjectKindLabel", () => {
  it("起点によって対象の呼び方を返す", () => {
    expect(getSubjectKindLabel(policyInterviewTarget("policy-1"))).toBe("施策");
    expect(getSubjectKindLabel(themeInterviewTarget("kosodate"))).toBe(
      "テーマ"
    );
  });
});
