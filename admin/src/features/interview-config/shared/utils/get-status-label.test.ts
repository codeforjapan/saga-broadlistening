import { describe, expect, it } from "vitest";
import { getStatusLabel } from "./get-status-label";

describe("getStatusLabel", () => {
  it("draftを下書きと表示する", () => {
    expect(getStatusLabel("draft")).toBe("下書き");
  });

  it("openを募集中と表示する", () => {
    expect(getStatusLabel("open")).toBe("募集中");
  });

  it("closedを終了と表示する", () => {
    expect(getStatusLabel("closed")).toBe("終了");
  });
});
