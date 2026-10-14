import { describe, expect, it } from "vitest";
import {
  type KikaseteThemeSource,
  stripAbout,
  toKikaseteInterview,
} from "./kikasete-interview";

const youthTheme: KikaseteThemeSource = {
  id: "config-youth",
  name: "若者支援",
  slug: "wakamono-shien",
  status: "open",
  estimated_duration: 10,
  created_at: "2026-09-01T00:00:00Z",
  participation_mode: "public",
  allowed_provider_keys: [],
  interview_sessions: [{ count: 64 }],
};

describe("toKikaseteInterview", () => {
  it("テーマからきかせてボックスの表示用データを作る", () => {
    expect(toKikaseteInterview(youthTheme)).toEqual({
      slug: "wakamono-shien",
      prompt: "若者支援について、あなたの経験や考えを聞かせてください",
      durationLabel: "約10分〜",
      participantLabel: "64人が参加",
      isOpen: true,
      participationRule: {
        name: "若者支援",
        participation_mode: "public",
        allowed_provider_keys: [],
      },
    });
  });

  it("テーマ名が「〜について」で終わっても、問いかけで重ねない", () => {
    expect(
      toKikaseteInterview({ ...youthTheme, name: "子育て支援について" }).prompt
    ).toBe("子育て支援について、あなたの経験や考えを聞かせてください");
  });

  it("参加人数が0件なら表示しない", () => {
    expect(
      toKikaseteInterview({ ...youthTheme, interview_sessions: [] })
        .participantLabel
    ).toBeNull();
  });

  it("募集中でなければ「はじめる」を押せない状態にする", () => {
    expect(
      toKikaseteInterview({ ...youthTheme, status: "closed" }).isOpen
    ).toBe(false);
  });
});

describe("stripAbout", () => {
  it("末尾の「について」だけを外す", () => {
    expect(stripAbout("子育て支援について")).toBe("子育て支援");
    expect(stripAbout("若者支援")).toBe("若者支援");
    expect(stripAbout("給食についての意見")).toBe("給食についての意見");
  });
});
