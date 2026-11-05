import { describe, expect, it } from "vitest";
import { toChildPolicyCardView } from "./child-policy-card";

describe("toChildPolicyCardView", () => {
  it("タグ名順で最初のタグを出す", () => {
    expect(
      toChildPolicyCardView({
        id: "child",
        name: "奨学金返還支援",
        thumbnail_url: "https://example.jp/a.png",
        policies_tags: [
          { tags: { label: "若者" } },
          { tags: { label: "奨学金返済" } },
          { tags: null },
        ],
      })
    ).toEqual({
      id: "child",
      name: "奨学金返還支援",
      thumbnailUrl: "https://example.jp/a.png",
      tagLabel: "奨学金返済",
    });
  });

  it("タグがなければ null", () => {
    expect(
      toChildPolicyCardView({
        id: "child",
        name: "施策",
        thumbnail_url: null,
        policies_tags: [],
      }).tagLabel
    ).toBeNull();
  });
});
