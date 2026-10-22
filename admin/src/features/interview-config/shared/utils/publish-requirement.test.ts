import { describe, expect, it } from "vitest";
import {
  findPublishBlockReason,
  NO_QUESTIONS_PUBLISH_ERROR,
} from "./publish-requirement";

describe("findPublishBlockReason", () => {
  it("質問が0件のまま募集中にはできない", () => {
    expect(findPublishBlockReason({ status: "open", questionCount: 0 })).toBe(
      NO_QUESTIONS_PUBLISH_ERROR
    );
  });

  it("質問があれば募集中にできる", () => {
    expect(
      findPublishBlockReason({ status: "open", questionCount: 1 })
    ).toBeNull();
  });

  it("下書き・終了は質問が0件でも保存できる", () => {
    expect(
      findPublishBlockReason({ status: "draft", questionCount: 0 })
    ).toBeNull();
    expect(
      findPublishBlockReason({ status: "closed", questionCount: 0 })
    ).toBeNull();
  });
});
