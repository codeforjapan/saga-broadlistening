import { describe, expect, it } from "vitest";
import {
  canGenerateVoiceSummary,
  MIN_OPINIONS_FOR_VOICE_SUMMARY,
} from "./threshold";

describe("canGenerateVoiceSummary", () => {
  it("公開意見の表示ゲートと同じ20件を境にする", () => {
    expect(MIN_OPINIONS_FOR_VOICE_SUMMARY).toBe(20);
    expect(canGenerateVoiceSummary(19)).toBe(false);
    expect(canGenerateVoiceSummary(20)).toBe(true);
    expect(canGenerateVoiceSummary(0)).toBe(false);
  });
});
