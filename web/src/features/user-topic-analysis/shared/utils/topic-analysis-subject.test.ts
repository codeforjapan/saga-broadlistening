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
  it("施策ページを起点にする", () => {
    expect(
      buildPolicyTopicSubject({ id: "policy-1", name: "子育て支援策" })
    ).toEqual({ name: "子育て支援策", href: "/bills/policy-1" });
  });
});

describe("buildThemeTopicSubject", () => {
  it("テーマにつながる施策（親施策）があれば、その施策を起点にする", () => {
    expect(
      buildThemeTopicSubject({
        name: "若者支援のテーマ",
        policy: { id: "parent-1", name: "若者支援" },
      })
    ).toEqual({ name: "若者支援", href: "/bills/parent-1" });
  });

  it("施策につながらないテーマは、テーマ名だけを出してリンクしない", () => {
    expect(
      buildThemeTopicSubject({ name: "まちの未来について", policy: null })
    ).toEqual({ name: "まちの未来について", href: null });
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
