import { describe, expect, it } from "vitest";
import { toHomeChatContext } from "./home-chat-context";

describe("toHomeChatContext", () => {
  it("keeps the home chat name and JSON fields", () => {
    expect(toHomeChatContext({ policyName: "条例", title: "教育", summary: null, tags: ["学校"], isFeatured: true })).toEqual({
      name: "教育（条例）", summary: undefined, tags: ["学校"], isFeatured: true,
    });
  });
});
