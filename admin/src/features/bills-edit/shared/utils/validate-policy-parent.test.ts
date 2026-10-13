import { describe, expect, it } from "vitest";
import { validatePolicyParent } from "./validate-policy-parent";

const topLevelParent = { id: "parent", parent_policy_id: null };

describe("validatePolicyParent", () => {
  it("親を持たない施策を親にできる", () => {
    expect(
      validatePolicyParent({
        policyId: "self",
        parentPolicyId: "parent",
        parent: topLevelParent,
        childCount: 0,
      })
    ).toBeNull();
  });

  it("新規作成時も親を指定できる", () => {
    expect(
      validatePolicyParent({
        policyId: null,
        parentPolicyId: "parent",
        parent: topLevelParent,
        childCount: 0,
      })
    ).toBeNull();
  });

  it("自分自身を親にできない", () => {
    expect(
      validatePolicyParent({
        policyId: "self",
        parentPolicyId: "self",
        parent: { id: "self", parent_policy_id: null },
        childCount: 0,
      })
    ).toBe("自分自身を親施策にはできません");
  });

  it("存在しない施策を親にできない", () => {
    expect(
      validatePolicyParent({
        policyId: "self",
        parentPolicyId: "missing",
        parent: null,
        childCount: 0,
      })
    ).toBe("指定した親施策が見つかりません");
  });

  it("子施策を親にする（孫になる）指定を拒否する", () => {
    expect(
      validatePolicyParent({
        policyId: "self",
        parentPolicyId: "child",
        parent: { id: "child", parent_policy_id: "parent" },
        childCount: 0,
      })
    ).toBe("子施策は親施策にできません（親子は1階層までです）");
  });

  it("子を持つ施策を他の施策の子にできない", () => {
    expect(
      validatePolicyParent({
        policyId: "self",
        parentPolicyId: "parent",
        parent: topLevelParent,
        childCount: 1,
      })
    ).toBe("子施策を持つ施策は、他の施策の子にできません");
  });
});
