import { normalizeRoleTitle } from "./normalize-role-title";
import type {
  PublicRespondentDetail,
  RawRespondentDetailRow,
  RawTranscriptMessageRow,
  TranscriptMessage,
} from "./public-types";

/** interview_messages.role を会話ログの speaker に正規化（assistant/user 以外は除外）。 */
function toSpeaker(role: string | null): TranscriptMessage["speaker"] | null {
  if (role === "assistant" || role === "user") return role;
  return null;
}

/**
 * 公開意見の生行＋会話メッセージから、回答者詳細の表示データを構築する純粋関数。
 * role_title を表示用に正規化し、会話ログは assistant/user のみ残す。
 * フィルタ（review_status = 'published'）は取得側で適用済み。
 */
export function buildPublicRespondentDetail(
  opinion: RawRespondentDetailRow,
  messages: RawTranscriptMessageRow[]
): PublicRespondentDetail {
  const transcript: TranscriptMessage[] = [];
  for (const m of messages) {
    const speaker = toSpeaker(m.role);
    if (!speaker) continue;
    transcript.push({
      id: m.id,
      speaker,
      content: m.content,
      created_at: m.created_at,
    });
  }

  return {
    id: opinion.id,
    role_title: normalizeRoleTitle(opinion.role_title),
    role_description: opinion.role_description,
    summary: opinion.summary,
    final_text: opinion.final_text,
    created_at: opinion.created_at,
    messages: transcript,
  };
}
