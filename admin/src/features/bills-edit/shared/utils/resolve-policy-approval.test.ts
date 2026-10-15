import { describe, expect, it } from "vitest";
import { resolvePolicyApproval } from "./resolve-policy-approval";

const now = new Date("2026-10-15T05:30:00Z");
const approved = {
  approved_at: "2026-09-01T00:00:00Z",
  approved_by: "admin-original",
};
const unapproved = { approved_at: null, approved_by: null };

describe("resolvePolicyApproval", () => {
  it("未承認の施策にチェックを入れると、現在日時と操作した管理者を記録する", () => {
    expect(
      resolvePolicyApproval({
        isApproved: true,
        current: unapproved,
        actorId: "admin-1",
        now,
      })
    ).toEqual({
      approved_at: "2026-10-15T05:30:00.000Z",
      approved_by: "admin-1",
    });
  });

  it("新規作成でチェックを入れると、現在日時と操作した管理者を記録する", () => {
    expect(
      resolvePolicyApproval({
        isApproved: true,
        current: null,
        actorId: "admin-1",
        now,
      })
    ).toEqual({
      approved_at: "2026-10-15T05:30:00.000Z",
      approved_by: "admin-1",
    });
  });

  it("承認済みの施策をチェックのまま保存しても、元の日時・承認者を変えない", () => {
    expect(
      resolvePolicyApproval({
        isApproved: true,
        current: approved,
        actorId: "admin-1",
        now,
      })
    ).toEqual({});
  });

  it("操作した管理者が分からなければ承認しない", () => {
    expect(() =>
      resolvePolicyApproval({
        isApproved: true,
        current: unapproved,
        actorId: undefined,
        now,
      })
    ).toThrow("承認には操作した管理者が必要です");
  });

  it("チェックを外すと承認を取り消す", () => {
    expect(
      resolvePolicyApproval({
        isApproved: false,
        current: approved,
        actorId: "admin-1",
        now,
      })
    ).toEqual({ approved_at: null, approved_by: null });
  });

  it("指定がなければ承認の列を変えない", () => {
    expect(
      resolvePolicyApproval({
        isApproved: undefined,
        current: approved,
        actorId: "admin-1",
        now,
      })
    ).toEqual({});
  });
});
