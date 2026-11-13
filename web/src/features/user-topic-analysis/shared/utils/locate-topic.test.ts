import { describe, expect, it } from "vitest";
import type { PublicTopic } from "../types";
import { locateTopic } from "./locate-topic";

function makeTopic(id: string): PublicTopic {
  return {
    id,
    title: id,
    description: "",
    opinion_count: 0,
    opinions: [],
  };
}

describe("locateTopic", () => {
  const topics = [makeTopic("a"), makeTopic("b"), makeTopic("c")];

  it("見つからなければ null", () => {
    expect(locateTopic(topics, "x")).toBeNull();
  });

  it("先頭は prev=null, next=次", () => {
    expect(locateTopic(topics, "a")).toMatchObject({
      position: 1,
      total: 3,
      prevTopicId: null,
      nextTopicId: "b",
    });
  });

  it("中間は前後とも存在", () => {
    expect(locateTopic(topics, "b")).toMatchObject({
      position: 2,
      prevTopicId: "a",
      nextTopicId: "c",
    });
  });

  it("末尾は next=null", () => {
    expect(locateTopic(topics, "c")).toMatchObject({
      position: 3,
      prevTopicId: "b",
      nextTopicId: null,
    });
  });
});
