// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { InterviewStepDialog } from "@/features/interview-session/client/components/interview-step-dialog";
import { InterviewPublicConsentStep } from "./interview-public-consent-step";

function renderStep(
  overrides: {
    isSubmitting?: boolean;
    error?: string | null;
    chatLogPublic?: boolean;
  } = {}
) {
  const onSubmit = vi.fn();
  const onBack = vi.fn();
  render(
    <InterviewStepDialog open onOpenChange={vi.fn()}>
      <InterviewPublicConsentStep
        chatLogPublic={overrides.chatLogPublic ?? false}
        onBack={onBack}
        onSubmit={onSubmit}
        isSubmitting={overrides.isSubmitting ?? false}
        error={overrides.error}
      />
    </InterviewStepDialog>
  );
  return { onSubmit, onBack };
}

describe("InterviewPublicConsentStep", () => {
  it("STEP 3 / 3 と、会話の原文は公開されないことを伝える", () => {
    renderStep();

    expect(screen.getByText("STEP 3 / 3")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /インタビュー内容の公開を/ })
    ).toBeInTheDocument();
    expect(
      screen.getByText("会話の原文は公開されません。")
    ).toBeInTheDocument();
  });

  it("会話ログを公開するテーマでは、原文も掲載されうると案内する", () => {
    renderStep({ chatLogPublic: true });

    expect(
      screen.getByText(/意見のまとめとインタビューの原文が/)
    ).toBeInTheDocument();
    expect(
      screen.queryByText("会話の原文は公開されません。")
    ).not.toBeInTheDocument();
  });

  it("オープンデータ提供の告知とデータ利用規約リンクを表示する", () => {
    renderStep();

    expect(
      screen.getByText(/第三者にオープンデータとして提供されることがあります/)
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", {
        name: "AIインタビューデータ利用規約",
      })
    ).toBeInTheDocument();
  });

  it("公開許可で onSubmit(true)、非公開で onSubmit(false)、戻るで onBack を呼ぶ", async () => {
    const user = userEvent.setup();
    const { onSubmit, onBack } = renderStep();

    await user.click(
      screen.getByRole("button", { name: /公開を許可して提出する/ })
    );
    expect(onSubmit).toHaveBeenCalledWith(true);

    await user.click(screen.getByRole("button", { name: "非公開で提出する" }));
    expect(onSubmit).toHaveBeenCalledWith(false);

    await user.click(screen.getByRole("button", { name: "戻る" }));
    expect(onBack).toHaveBeenCalled();
  });

  it("送信中はボタンが無効化される", () => {
    renderStep({ isSubmitting: true });
    expect(screen.getByRole("button", { name: /送信中/ })).toBeDisabled();
  });

  it("提出に失敗したらエラーを出す", () => {
    renderStep({ error: "提出に失敗しました" });
    expect(screen.getByText("提出に失敗しました")).toBeInTheDocument();
  });
});
