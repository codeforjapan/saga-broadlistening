import { describe, expect, it } from "vitest";
import { savedPromptResult } from "./save-result";

describe("savedPromptResult", () => {
  it("returns only this save's revision when another admin updated before the metadata read", () => {
    const persisted = {
      id: "saved",
      version: 1,
      content: "text",
      change_note: "first",
      created_by: "actor",
      created_at: "2026-09-27T00:00:00Z",
    };
    const result = savedPromptResult({
      expectedRevision: 0,
      savedVersionId: "saved",
      state: {
        prompt: { revision: 2 },
        versions: [
          { ...persisted, id: "another-admin", version: 2 },
          persisted,
        ],
      },
    });
    expect(result).toEqual({
      success: true,
      revision: 1,
      version: {
        id: "saved",
        version: 1,
        content: "text",
        changeNote: "first",
        createdBy: "actor",
        createdAt: "2026-09-27T00:00:00Z",
      },
    });
  });
});
