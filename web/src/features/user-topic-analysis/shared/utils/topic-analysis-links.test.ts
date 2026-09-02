import { describe, expect, it } from "vitest";
import {
  policyInterviewTarget,
  themeInterviewTarget,
} from "@/features/interview-config/shared/types/interview-target";
import {
  getOpinionsLink,
  getTopicDetailLink,
  getTopicsLink,
} from "./topic-analysis-links";

describe("getTopicsLink", () => {
  it("施策に紐づく意見募集は施策配下のトピック一覧を指す", () => {
    expect(getTopicsLink(policyInterviewTarget("policy-1"))).toBe(
      "/bills/policy-1/topics"
    );
  });

  it("抽象テーマ型はテーマ配下のトピック一覧を指す", () => {
    expect(getTopicsLink(themeInterviewTarget("theme-slug"))).toBe(
      "/interviews/theme-slug/topics"
    );
  });

  it("プレビュートークンはトピック一覧には引き継がない", () => {
    expect(getTopicsLink(policyInterviewTarget("policy-1", "token"))).toBe(
      "/bills/policy-1/topics"
    );
  });
});

describe("getTopicDetailLink", () => {
  it("施策に紐づく意見募集は施策配下のトピック詳細を指す", () => {
    expect(
      getTopicDetailLink(policyInterviewTarget("policy-1"), "topic-1")
    ).toBe("/bills/policy-1/topics/topic-1");
  });

  it("抽象テーマ型はテーマ配下のトピック詳細を指す", () => {
    expect(
      getTopicDetailLink(themeInterviewTarget("theme-slug"), "topic-1")
    ).toBe("/interviews/theme-slug/topics/topic-1");
  });
});

describe("getOpinionsLink", () => {
  it("施策に紐づく意見募集は施策配下の回答一覧を指す", () => {
    expect(getOpinionsLink(policyInterviewTarget("policy-1"))).toBe(
      "/bills/policy-1/opinions"
    );
  });

  it("抽象テーマ型はテーマ配下の回答一覧を指す", () => {
    expect(getOpinionsLink(themeInterviewTarget("theme-slug"))).toBe(
      "/interviews/theme-slug/opinions"
    );
  });
});
