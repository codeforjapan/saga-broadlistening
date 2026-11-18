import {
  AppRouterContext,
  type AppRouterInstance,
} from "next/dist/shared/lib/app-router-context.shared-runtime";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { LatestInterviewSession } from "@/features/interview-session/server/loaders/get-latest-interview-session";
import type { InterviewParticipationView } from "../../shared/types/interview-participation-view";
import { themeInterviewTarget } from "../../shared/types/interview-target";
import { InterviewActionButtons } from "./interview-action-buttons";

// Next.jsの実際のRouter Contextへ、ナビゲーションを実行しない実装を注入する。
const router: AppRouterInstance = {
  back() {},
  forward() {},
  refresh() {},
  push() {},
  replace() {},
  prefetch() {},
};
const sessions: {
  label: string;
  session: LatestInterviewSession | null;
  cta: string;
}[] = [
  { label: "開始前", session: null, cta: "AIインタビューをはじめる" },
  {
    label: "回答途中",
    session: { id: "session", status: "active", reportId: null },
    cta: "AIインタビューを再開する",
  },
  {
    label: "回答完了後",
    session: { id: "session", status: "completed", reportId: "report" },
    cta: "もう一度新たに回答する",
  },
];
function renderActions(
  participation: InterviewParticipationView,
  sessionInfo: LatestInterviewSession | null
) {
  return renderToStaticMarkup(
    createElement(
      AppRouterContext.Provider,
      { value: router },
      createElement(InterviewActionButtons, {
        target: themeInterviewTarget("youth"),
        participation,
        sessionInfo,
      })
    )
  );
}

describe("開始・再開・再回答の参加条件", () => {
  it.each(sessions)("$label: 参加不可なら案内だけを表示する", ({ session }) => {
    const html = renderActions(
      {
        kind: "guide",
        themeName: "若者支援",
        providers: [
          {
            key: "saga_super_app",
            displayName: "佐賀市スーパーアプリ",
            guideUrl: null,
          },
        ],
      },
      session
    );
    expect(html).toContain("アプリから回答する方法");
    expect(html).not.toContain("AIインタビューをはじめる");
    expect(html).not.toContain("AIインタビューを再開する");
    expect(html).not.toContain("もう一度");
    expect(html).not.toContain("/interviews/youth/chat");
  });
  it.each(sessions)("$label: 参加できる場合は対応するCTAを表示する", ({
    session,
    cta,
  }) => {
    expect(renderActions({ kind: "allowed" }, session)).toContain(cta);
  });
});
