// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ReportContent } from "./report-content";

const opinions = [
  {
    title: "保育の時間を延ばしてほしい",
    content: "夜まで預けたい",
    source_message_id: "m1",
  },
];
const messages = [
  { id: "m1", role: "user", content: "夜まで預けられると助かります" },
];

function renderContent(withMessages: boolean) {
  render(
    <ReportContent
      reportId="r1"
      summary="子育てと仕事の両立が難しい"
      sessionStartedAt="2026-11-19T01:25:00Z"
      characterCount={115}
      messages={withMessages ? messages : undefined}
      opinions={opinions}
      from="complete"
    />
  );
}

describe("ReportContent", () => {
  it("要約カードに要約・日時・分量を出し、主な意見を「意見N」の形で出す", () => {
    renderContent(false);

    expect(screen.getByText("子育てと仕事の両立が難しい")).toBeInTheDocument();
    expect(screen.getByText(/2026年11月19日/)).toBeInTheDocument();
    expect(screen.getByText("115文字")).toBeInTheDocument();
    expect(screen.getByText("意見1")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        level: 3,
        name: "保育の時間を延ばしてほしい",
      })
    ).toBeInTheDocument();
  });

  it("会話ログを渡さなければ、会話ログも「元の回答を見る」も出さない", () => {
    renderContent(false);

    expect(
      screen.queryByText("夜まで預けられると助かります")
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "元の回答を見る" })
    ).not.toBeInTheDocument();
  });

  it("会話ログを渡したときは、会話ログと「元の回答を見る」を出す", () => {
    renderContent(true);

    expect(
      screen.getByText("夜まで預けられると助かります")
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "元の回答を見る" })
    ).toBeInTheDocument();
  });
});
