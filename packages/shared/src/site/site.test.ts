import { describe, expect, it } from "vitest";
import {
  COPYRIGHT_TEXT,
  MUNICIPALITY_NAME,
  SITE_DESCRIPTION,
  SITE_HASHTAG,
  SITE_NAME,
  SITE_TAGLINE,
} from "./site";

describe("ブランド定数", () => {
  it("ハッシュタグとコピーライトはサービス名・自治体名から導出される", () => {
    // 手打ちのコピーを作ると、片方だけ差し替えて旧名が残る事故になる
    expect(SITE_HASHTAG).toBe(SITE_NAME);
    expect(COPYRIGHT_TEXT).toContain(MUNICIPALITY_NAME);
  });

  it("説明文とタグラインに自治体名が入る", () => {
    expect(SITE_DESCRIPTION).toContain(MUNICIPALITY_NAME);
    expect(SITE_TAGLINE).toContain(MUNICIPALITY_NAME);
  });

  it("表示に使う定数が空でない", () => {
    // 導出元が空だと、ハッシュタグが "#" だけになる等で気付きにくく壊れる
    for (const text of [
      SITE_NAME,
      MUNICIPALITY_NAME,
      SITE_DESCRIPTION,
      SITE_TAGLINE,
    ]) {
      expect(text.trim()).not.toBe("");
    }
  });

  it("旧ブランド名が残っていない", () => {
    for (const text of [SITE_NAME, SITE_DESCRIPTION, SITE_TAGLINE]) {
      expect(text).not.toContain("みらい議会");
      expect(text).not.toContain("CHIKAT");
      expect(text).not.toContain("佐賀");
    }
  });

  it("国政由来の語彙が残っていない", () => {
    for (const text of [SITE_DESCRIPTION, SITE_TAGLINE]) {
      expect(text).not.toMatch(/法案|議案|国会|衆議院|参議院/);
    }
  });
});
