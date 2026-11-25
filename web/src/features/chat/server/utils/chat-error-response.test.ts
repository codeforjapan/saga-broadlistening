import { describe, expect, it } from "vitest";
import {
  INTERVIEW_SESSION_NOT_STARTED_MESSAGE,
  InterviewParticipationDeniedError,
  InterviewSessionNotStartedError,
} from "@/features/interview-session/shared/types/errors";
import { ChatError, ChatErrorCode } from "../../shared/types/errors";
import { chatErrorToResponse } from "./chat-error-response";

describe("chatErrorToResponse", () => {
  it("InterviewParticipationDeniedError で 403 を返す", async () => {
    const res = chatErrorToResponse(new InterviewParticipationDeniedError());
    expect(res.status).toBe(403);
    expect(await res.text()).toContain("条件を満たしていません");
  });

  it("InterviewSessionNotStartedError で 409 を返す（開始画面からはじめてもらう）", async () => {
    const res = chatErrorToResponse(new InterviewSessionNotStartedError());
    expect(res.status).toBe(409);
    expect(await res.text()).toBe(INTERVIEW_SESSION_NOT_STARTED_MESSAGE);
  });

  it("DAILY_COST_LIMIT_REACHED で 429 を返す", async () => {
    const res = chatErrorToResponse(
      new ChatError(ChatErrorCode.DAILY_COST_LIMIT_REACHED)
    );
    expect(res.status).toBe(429);
    expect(await res.text()).toContain("本日の利用上限");
  });

  it("SYSTEM_DAILY_COST_LIMIT_REACHED で 429 を返す", async () => {
    const res = chatErrorToResponse(
      new ChatError(ChatErrorCode.SYSTEM_DAILY_COST_LIMIT_REACHED)
    );
    expect(res.status).toBe(429);
    expect(await res.text()).toContain("本日の利用上限");
  });

  it("SYSTEM_MONTHLY_COST_LIMIT_REACHED で 429 を返す", async () => {
    const res = chatErrorToResponse(
      new ChatError(ChatErrorCode.SYSTEM_MONTHLY_COST_LIMIT_REACHED)
    );
    expect(res.status).toBe(429);
    expect(await res.text()).toContain("今月の利用上限");
  });

  it("その他の ChatError で 500 を返す", async () => {
    const res = chatErrorToResponse(
      new ChatError(ChatErrorCode.PROMPT_FETCH_FAILED)
    );
    expect(res.status).toBe(500);
    expect(await res.text()).toContain("エラーが発生しました");
  });

  it("ChatError 以外のエラーで 500 を返す", async () => {
    const res = chatErrorToResponse(new Error("unexpected"));
    expect(res.status).toBe(500);
    expect(await res.text()).toContain("エラーが発生しました");
  });
});
