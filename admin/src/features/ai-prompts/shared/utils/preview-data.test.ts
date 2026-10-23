import { describe, expect, it } from "vitest";
import { toBillPromptVariables, toNormalPreviewBill } from "./preview-data";

const bill = {
  id: "1",
  name: "施策名",
  title: "通常タイトル",
  summary: null,
  content: null,
  tags: ["子育て"],
  isFeatured: true,
  knowledgeSource: "資料",
};

describe("preview data", () => {
  it("passes empty content through the same bill variable contract", () => {
    expect(toBillPromptVariables(bill)).toEqual({
      billName: "施策名",
      billTitle: "通常タイトル",
      billSummary: "",
      billContent: "",
      knowledgeSource: "資料",
    });
  });

  it("excludes policies without normal content and gated knowledge", () => {
    const row = {
      id: "1",
      name: "施策",
      is_featured: true,
      enable_ai_chat: false,
      knowledge_source: "非公開資料",
      policies_tags: [{ tags: { label: "福祉" } }],
      policy_contents: [
        {
          title: "詳しく",
          summary: "説明",
          content: "本文",
          difficulty_level: "hard",
        },
      ],
    };
    expect(toNormalPreviewBill(row)).toBeNull();
    expect(
      toNormalPreviewBill({
        ...row,
        policy_contents: [
          { ...row.policy_contents[0], difficulty_level: "normal" },
        ],
      })
    ).toMatchObject({ tags: ["福祉"], knowledgeSource: "" });
  });
});
