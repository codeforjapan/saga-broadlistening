import { describe, expect, it } from "vitest";
import { buildPublicRespondentDetail } from "./build-public-respondent-detail";
import type {
  RawRespondentDetailRow,
  RawTranscriptMessageRow,
} from "./public-types";

const baseOpinion: RawRespondentDetailRow = {
  id: "opinion-1",
  role_title: "運送業の経営者",
  summary: "要約テキスト",
  final_text: "提出した意見の本文",
  role_description: "運送会社を経営しています",
  created_at: "2026-06-01T00:00:00Z",
};

describe("buildPublicRespondentDetail", () => {
  it("role_title を正規化し、role_description と会話ログを返す", () => {
    const messages: RawTranscriptMessageRow[] = [
      {
        id: "m1",
        role: "assistant",
        content: "この施策についてどう思いますか？",
        created_at: "2026-06-01T00:00:01Z",
      },
      {
        id: "m2",
        role: "user",
        content: "燃料費が下がるのはありがたいです",
        created_at: "2026-06-01T00:00:02Z",
      },
    ];

    const result = buildPublicRespondentDetail(baseOpinion, messages);

    expect(result.id).toBe("opinion-1");
    expect(result.role_title).toBe("運送業の経営者");
    expect(result.role_description).toBe("運送会社を経営しています");
    expect(result.final_text).toBe("提出した意見の本文");
    expect(result.messages).toEqual([
      {
        id: "m1",
        speaker: "assistant",
        content: "この施策についてどう思いますか？",
        created_at: "2026-06-01T00:00:01Z",
      },
      {
        id: "m2",
        speaker: "user",
        content: "燃料費が下がるのはありがたいです",
        created_at: "2026-06-01T00:00:02Z",
      },
    ]);
  });

  it("assistant/user 以外のメッセージ（system 等）は会話ログから除外する", () => {
    const messages: RawTranscriptMessageRow[] = [
      { id: "s1", role: "system", content: "システム指示", created_at: null },
      { id: "u1", role: "user", content: "回答", created_at: null },
    ];

    const result = buildPublicRespondentDetail(baseOpinion, messages);

    expect(result.messages.map((m) => m.id)).toEqual(["u1"]);
  });

  it("会話ログが空でも詳細を返す", () => {
    const result = buildPublicRespondentDetail(baseOpinion, []);
    expect(result.messages).toEqual([]);
  });
});
