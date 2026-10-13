import { describe, expect, it } from "vitest";
import { resolveSubjectPolicyId } from "./resolve-subject-policy-id";

describe("resolveSubjectPolicyId", () => {
  it("施策配下の画面では、紐づけ中の施策よりその施策を優先する", () => {
    expect(resolveSubjectPolicyId("bill-1", ["policy-2", "policy-3"])).toBe(
      "bill-1"
    );
  });

  it("施策配下でなければ、フォームで紐づけ中の先頭の施策を使う", () => {
    expect(resolveSubjectPolicyId(null, ["policy-2", "policy-3"])).toBe(
      "policy-2"
    );
  });

  it("どちらもなければ施策なしとして扱う", () => {
    expect(resolveSubjectPolicyId(null, [])).toBeNull();
    expect(resolveSubjectPolicyId(null, undefined)).toBeNull();
  });
});
