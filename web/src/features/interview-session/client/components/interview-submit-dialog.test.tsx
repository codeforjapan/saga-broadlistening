// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { UserProfileForm } from "@/features/user-profile/client/hooks/use-user-profile-form";
import type { InterviewReportViewData } from "../../shared/schemas";
import { InterviewSubmitDialog } from "./interview-submit-dialog";

const report: InterviewReportViewData = {
  summary: "子育てと仕事の両立が難しい",
  final_text: "仕事が忙しく、子育ての時間がとれません。",
  role_title: "会社員",
  role_description: "共働きで子どもが2人いる",
  opinions: [
    {
      title: "保育の時間を延ばしてほしい",
      content: "夜まで預けたい",
      source_message_id: null,
      contextual_quote: null,
      richness: null,
      concern: null,
      proposal: null,
      reasoning_types: null,
    },
  ],
};

function createProfileForm(): UserProfileForm {
  return {
    ageGroup: "",
    setAgeGroup: vi.fn(),
    area: "",
    setArea: vi.fn(),
    isLoaded: true,
    isSaving: false,
    save: vi.fn(async () => {}),
  };
}

function renderDialog(
  overrides: { canRevise?: boolean; profileForm?: UserProfileForm } = {}
) {
  const onOpenChange = vi.fn();
  const onSubmit = vi.fn();
  const profileForm = overrides.profileForm ?? createProfileForm();
  const props = {
    onOpenChange,
    report,
    profileForm,
    canRevise: overrides.canRevise ?? true,
    onSubmit,
    isSubmitting: false,
  };
  const { rerender } = render(<InterviewSubmitDialog open {...props} />);
  const setOpen = (open: boolean) =>
    rerender(<InterviewSubmitDialog open={open} {...props} />);
  return { onOpenChange, onSubmit, profileForm, setOpen };
}

describe("InterviewSubmitDialog", () => {
  it("STEP 1 でまとめの中身を出す", () => {
    renderDialog();

    expect(screen.getByText("STEP 1 / 3")).toBeInTheDocument();
    expect(screen.getByText(report.final_text)).toBeInTheDocument();
    expect(screen.getByText("会社員")).toBeInTheDocument();
    expect(
      screen.getByText("1. 保育の時間を延ばしてほしい")
    ).toBeInTheDocument();
  });

  it("「直したいところを伝える」でモーダルを閉じる", async () => {
    const user = userEvent.setup();
    const { onOpenChange } = renderDialog();

    await user.click(
      screen.getByRole("button", { name: "直したいところを伝える" })
    );
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("締めの発話のあと（直せないとき）は「直したいところを伝える」を出さない", () => {
    renderDialog({ canRevise: false });

    expect(
      screen.queryByRole("button", { name: "直したいところを伝える" })
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/直せます/)).not.toBeInTheDocument();
  });

  it("前の属性を読み終えるまで「次へ」を押せない", async () => {
    const user = userEvent.setup();
    renderDialog({
      profileForm: { ...createProfileForm(), isLoaded: false },
    });

    await user.click(screen.getByRole("button", { name: /この内容で次へ/ }));
    expect(screen.getByRole("button", { name: /^次へ/ })).toBeDisabled();
  });

  it("属性の保存中に閉じたら、保存が終わっても STEP 3 に進まない", async () => {
    const user = userEvent.setup();
    let finishSave = () => {};
    const profileForm = {
      ...createProfileForm(),
      save: vi.fn(
        () =>
          new Promise<void>((resolve) => {
            finishSave = resolve;
          })
      ),
    };
    const { setOpen } = renderDialog({ profileForm });

    await user.click(screen.getByRole("button", { name: /この内容で次へ/ }));
    await user.click(screen.getByRole("button", { name: /^次へ/ }));
    await user.keyboard("{Escape}");
    setOpen(false);
    await act(async () => finishSave());

    setOpen(true);
    expect(screen.getByText("STEP 1 / 3")).toBeInTheDocument();
  });

  it("「次へ」で属性を保存して STEP 3 に進み、公開を選んで提出できる", async () => {
    const user = userEvent.setup();
    const { onSubmit, profileForm } = renderDialog();

    await user.click(screen.getByRole("button", { name: /この内容で次へ/ }));
    expect(screen.getByText("STEP 2 / 3")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^次へ/ }));
    expect(profileForm.save).toHaveBeenCalled();
    expect(screen.getByText("STEP 3 / 3")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /公開を許可して提出する/ })
    );
    expect(onSubmit).toHaveBeenCalledWith(true);
  });

  it("「スキップ」は属性を保存せずに STEP 3 に進む", async () => {
    const user = userEvent.setup();
    const { profileForm } = renderDialog();

    await user.click(screen.getByRole("button", { name: /この内容で次へ/ }));
    await user.click(screen.getByRole("button", { name: "スキップ" }));

    expect(profileForm.save).not.toHaveBeenCalled();
    expect(screen.getByText("STEP 3 / 3")).toBeInTheDocument();
  });

  it("「戻る」で前のステップに戻れる", async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.click(screen.getByRole("button", { name: /この内容で次へ/ }));
    await user.click(screen.getByRole("button", { name: "スキップ" }));
    await user.click(screen.getByRole("button", { name: "戻る" }));
    expect(screen.getByText("STEP 2 / 3")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "戻る" }));
    expect(screen.getByText("STEP 1 / 3")).toBeInTheDocument();
  });
});
