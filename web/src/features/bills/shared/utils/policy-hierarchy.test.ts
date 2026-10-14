import { describe, expect, it } from "vitest";
import {
  isParentPolicy,
  selectPrimaryThemeForPolicy,
} from "./policy-hierarchy";

describe("isParentPolicy", () => {
  const topLevel = { parent_policy_id: null };

  it("公開中の子を持つ、親のない施策は親施策", () => {
    expect(
      isParentPolicy(topLevel, [
        { publish_status: "draft" },
        { publish_status: "published" },
      ])
    ).toBe(true);
  });

  it("子が下書きだけなら親施策ではない", () => {
    expect(isParentPolicy(topLevel, [{ publish_status: "draft" }])).toBe(false);
  });

  it("子を持たない施策は、テーマにつながっていても親施策ではない", () => {
    expect(isParentPolicy(topLevel, [])).toBe(false);
  });

  it("親を持つ施策（子施策）は親施策ではない", () => {
    expect(
      isParentPolicy({ parent_policy_id: "parent" }, [
        { publish_status: "published" },
      ])
    ).toBe(false);
  });
});

describe("selectPrimaryThemeForPolicy", () => {
  const theme = (id: string, status: string, created_at: string) => ({
    id,
    status,
    created_at,
  });

  it("募集中のテーマを優先する", () => {
    expect(
      selectPrimaryThemeForPolicy([
        theme("closed-new", "closed", "2026-10-01T00:00:00Z"),
        theme("open-old", "open", "2026-01-01T00:00:00Z"),
      ])?.id
    ).toBe("open-old");
  });

  it("募集中が複数あれば新しいもの", () => {
    expect(
      selectPrimaryThemeForPolicy([
        theme("open-old", "open", "2026-01-01T00:00:00Z"),
        theme("open-new", "open", "2026-05-01T00:00:00Z"),
      ])?.id
    ).toBe("open-new");
  });

  it("募集中がなければ最新のもの", () => {
    expect(
      selectPrimaryThemeForPolicy([
        theme("closed-old", "closed", "2026-01-01T00:00:00Z"),
        theme("closed-new", "closed", "2026-05-01T00:00:00Z"),
      ])?.id
    ).toBe("closed-new");
  });

  it("下書きのテーマは、新しくても選ばない", () => {
    expect(
      selectPrimaryThemeForPolicy([
        theme("closed-old", "closed", "2026-01-01T00:00:00Z"),
        theme("draft-new", "draft", "2026-05-01T00:00:00Z"),
      ])?.id
    ).toBe("closed-old");
    expect(
      selectPrimaryThemeForPolicy([
        theme("draft", "draft", "2026-05-01T00:00:00Z"),
      ])
    ).toBeNull();
  });

  it("作成日時が同じなら ID の降順", () => {
    expect(
      selectPrimaryThemeForPolicy([
        theme("a", "open", "2026-01-01T00:00:00Z"),
        theme("b", "open", "2026-01-01T00:00:00Z"),
      ])?.id
    ).toBe("b");
  });

  it("テーマがなければ null", () => {
    expect(selectPrimaryThemeForPolicy([])).toBeNull();
  });
});
