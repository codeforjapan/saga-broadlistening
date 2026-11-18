import { isLocalSupabaseUrl } from "./admin-user";
import type { AdminClient } from "./helper";

/**
 * デモ回答者の人数。
 * 意見・リアクション・チャットを複数ユーザーに分散させるための固定プール。
 */
const RESPONDENT_COUNT = 30;

/**
 * 固定 UUID の回答者 ID。
 * seed を流し直しても同じ ID になるようにしている。
 * デモ用セッション・意見の固定 ID と紛らわしくならないよう `1` で始める。
 */
function respondentId(index: number): string {
  return `00000000-0000-0000-0000-1${String(index + 1).padStart(11, "0")}`;
}

/**
 * デモ回答者の匿名ユーザーを作成する。
 *
 * `interview_sessions.user_id` / `chat_sessions.user_id` /
 * `opinion_reactions.user_id` は `auth.users(id)` を参照する FK を持つため、
 * 実在しない UUID を投入すると seed が失敗する。
 *
 * 固定パスワードのアカウントをホスト環境に作らないよう、admin ユーザーと
 * 同じくローカル接続時のみ作成する。ローカル以外では空配列を返し、
 * 呼び出し側は `user_id = null`（イベント経由の回答相当）として扱う。
 */
export async function seedDemoRespondents(
  supabase: AdminClient
): Promise<string[]> {
  if (!isLocalSupabaseUrl(process.env.SUPABASE_URL)) {
    console.log(
      "⏭️  Skipping demo respondents: SUPABASE_URL is not a local Supabase instance"
    );
    return [];
  }

  console.log(`🙋 Creating ${RESPONDENT_COUNT} demo respondents...`);

  const ids: string[] = [];
  for (let index = 0; index < RESPONDENT_COUNT; index++) {
    const id = respondentId(index);
    const { error } = await supabase.auth.admin.createUser({
      id,
      email: `respondent${index + 1}@example.com`,
      email_confirm: true,
    });

    // 既に存在する場合（db reset せずに seed を再実行したケース）は正常系
    const alreadyExists =
      error &&
      (error.code === "email_exists" ||
        /already|duplicate/i.test(error.message));
    if (error && !alreadyExists) {
      throw new Error(`Failed to create demo respondent: ${error.message}`);
    }

    ids.push(id);
  }

  console.log(`✅ Created ${ids.length} demo respondents`);
  return ids;
}

/**
 * 回答者プールから循環で 1 人選ぶ。
 * プールが空（ホスト環境）の場合は null（イベント経由の回答）を返す。
 */
export function pickRespondent(
  respondentIds: string[],
  index: number
): string | null {
  if (respondentIds.length === 0) return null;
  return respondentIds[index % respondentIds.length];
}
