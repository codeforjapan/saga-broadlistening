// @vitest-environment jsdom
import { act, render } from "@testing-library/react";
import { createElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  userId: undefined as string | undefined,
  router: { refresh: vi.fn() },
}));
vi.mock("next/navigation", () => ({ useRouter: () => state.router }));
vi.mock("@/features/chat/client/hooks/use-anonymous-supabase-user", () => ({
  useAnonymousSupabaseUser: () => state.userId,
}));

import { AuthGate } from "./auth-gate";

describe("AuthGate", () => {
  beforeEach(() => {
    state.userId = undefined;
    state.router.refresh.mockClear();
  });

  it("UID保存後に認証が完了してもサーバーの回答導線を更新する", async () => {
    const view = render(createElement(AuthGate));
    expect(state.router.refresh).not.toHaveBeenCalled();
    await act(async () => {
      state.userId = "anonymous-user";
      view.rerender(createElement(AuthGate));
    });
    expect(state.router.refresh).toHaveBeenCalledTimes(1);
    view.rerender(createElement(AuthGate));
    expect(state.router.refresh).toHaveBeenCalledTimes(1);
    view.unmount();
  });

  it("UID Cookieだけが残っている再訪でも認証確立後に再判定する", () => {
    state.userId = "restored-user";
    const view = render(createElement(AuthGate));
    expect(state.router.refresh).toHaveBeenCalledTimes(1);
    view.unmount();
  });
});
