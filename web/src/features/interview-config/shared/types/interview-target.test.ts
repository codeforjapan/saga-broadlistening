import { describe, expect, it } from "vitest";
import {
  policyInterviewTarget,
  previewCredentialOf,
  themeInterviewTarget,
} from "./interview-target";

describe("previewCredentialOf", () => {
  it("施策プレビューの完了・アーカイブへ資格情報を引き渡す", () => {
    expect(
      previewCredentialOf(policyInterviewTarget("policy", "token"))
    ).toEqual({
      policyId: "policy",
      token: "token",
    });
  });

  it("通常の施策・テーマには資格情報を付けない", () => {
    expect(
      previewCredentialOf(policyInterviewTarget("policy"))
    ).toBeUndefined();
    expect(
      previewCredentialOf(policyInterviewTarget("policy", ""))
    ).toBeUndefined();
    expect(previewCredentialOf(themeInterviewTarget("theme"))).toBeUndefined();
  });
});
