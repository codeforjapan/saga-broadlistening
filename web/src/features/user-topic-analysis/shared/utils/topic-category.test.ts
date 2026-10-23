import { describe, expect, it } from "vitest";
import type { PublicOpinion } from "../types";
import { normalizeRoleTitle, opinionAttributionLabel } from "./topic-category";

function makeOpinion(overrides: Partial<PublicOpinion> = {}): PublicOpinion {
  return {
    id: "o1",
    opinion_id: "op1",
    opinion_public: true,
    created_at: null,
    title: "t",
    content: "c",
    role_title: null,
    contextual_quote: null,
    richness: null,
    source_message_id: null,
    question_snippet: null,
    ...overrides,
  };
}

describe("opinionAttributionLabel", () => {
  it("role_title があればそれを使う", () => {
    expect(makeAttribution({ role_title: "育休経験者" })).toBe("育休経験者");
  });

  it("role_title が null なら既定ラベルにフォールバック", () => {
    expect(makeAttribution({ role_title: null })).toBe("市民");
  });

  it("role_title が空白のみなら既定ラベルにフォールバック（'（）'防止）", () => {
    expect(makeAttribution({ role_title: "  " })).toBe("市民");
  });

  it("汎用的な「一般市民」等の肩書も既定ラベルにフォールバック", () => {
    expect(makeAttribution({ role_title: "一般市民" })).toBe("市民");
  });

  function makeAttribution(overrides: Partial<PublicOpinion>) {
    return opinionAttributionLabel(makeOpinion(overrides));
  }
});

describe("normalizeRoleTitle", () => {
  it("固有の肩書はそのまま返す", () => {
    expect(normalizeRoleTitle("育休経験者")).toBe("育休経験者");
  });
  it("null・空白は null", () => {
    expect(normalizeRoleTitle(null)).toBeNull();
    expect(normalizeRoleTitle("  ")).toBeNull();
  });
  it("汎用的な「市民」相当（一般市民/市民/一般）は null", () => {
    expect(normalizeRoleTitle("一般市民")).toBeNull();
    expect(normalizeRoleTitle("市民")).toBeNull();
    expect(normalizeRoleTitle("一般")).toBeNull();
  });
});
