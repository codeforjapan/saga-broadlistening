import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../packages/supabase/types/supabase.types";

// ── 環境変数（`.env` または CI が供給。`npx supabase status` で確認） ──
const SUPABASE_URL = process.env.SUPABASE_URL ?? "http://127.0.0.1:54421";
const SECRET_KEY = requireEnv("SUPABASE_SECRET_KEY");
const PUBLISHABLE_KEY = requireEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `環境変数 ${name} が未設定です。ローカル実行時は \`.env\` をコピーし、\`npx supabase status\` で値を確認してください。`
    );
  }
  return value;
}

/** 同一テスト実行内で衝突しない一意な接尾辞 */
function uniqueSuffix(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ── クライアント ──
/** secret key クライアント（RLS バイパス） */
export const adminClient = createClient<Database>(SUPABASE_URL, SECRET_KEY);

/** publishable key クライアント（RLS 適用） */
export function getAnonClient() {
  return createClient<Database>(SUPABASE_URL, PUBLISHABLE_KEY);
}

/** 認証済みクライアントを取得 */
export async function getAuthenticatedClient(email: string, password: string) {
  const client = createClient<Database>(SUPABASE_URL, PUBLISHABLE_KEY);
  const { error } = await client.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw new Error(`サインイン失敗: ${error.message}`);
  return client;
}

// ── テストユーザー管理 ──
export type TestUser = {
  id: string;
  email: string;
  password: string;
};

/** admin 権限を持つテストユーザーを作成 */
export async function createTestAdminUser(
  email = `test-admin-${Date.now()}@example.com`,
  password = "test-password-123"
): Promise<TestUser> {
  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { roles: ["admin"] },
  });
  if (error) throw new Error(`admin ユーザー作成失敗: ${error.message}`);
  return { id: data.user.id, email, password };
}

/** 一般テストユーザーを作成 */
export async function createTestUser(
  email = `test-user-${Date.now()}@example.com`,
  password = "test-password-123"
): Promise<TestUser> {
  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw new Error(`ユーザー作成失敗: ${error.message}`);
  return { id: data.user.id, email, password };
}

/** テストユーザーを削除 */
export async function cleanupTestUser(userId: string): Promise<void> {
  const { error } = await adminClient.auth.admin.deleteUser(userId);
  if (error) {
    console.warn(`ユーザー ${userId} の削除失敗: ${error.message}`);
  }
}

// ── テストデータ作成ヘルパー ──
/** テスト用 policy を作成 */
export async function createTestPolicy(
  overrides: Partial<{
    name: string;
    slug: string;
    publish_status: "draft" | "published";
    published_at: string;
    department: string;
    contact: string;
    is_featured: boolean;
    enable_ai_chat: boolean;
    knowledge_source: string;
  }> = {}
) {
  const suffix = uniqueSuffix();
  const defaults = {
    name: `テスト施策 ${suffix}`,
    slug: `test-policy-${suffix}`,
    publish_status: "draft" as const,
    ...overrides,
  };
  const { data, error } = await adminClient
    .from("policies")
    .insert(defaults)
    .select()
    .single();
  if (error) throw new Error(`policy 作成失敗: ${error.message}`);
  return data;
}

/** テスト用 policy を削除（CASCADE で関連データも削除） */
export async function cleanupTestPolicy(policyId: string): Promise<void> {
  await adminClient.from("policies").delete().eq("id", policyId);
}

/** テスト用 policy_contents を作成 */
export async function createTestPolicyContent(
  policyId: string,
  overrides: Partial<{
    difficulty_level: "normal" | "hard";
    title: string;
    summary: string;
    content: string;
  }> = {}
) {
  const suffix = uniqueSuffix();
  const defaults = {
    policy_id: policyId,
    difficulty_level: "normal" as const,
    title: `テスト施策タイトル ${suffix}`,
    summary: `テスト施策サマリー ${suffix}`,
    content: `# テスト施策コンテンツ ${suffix}`,
    ...overrides,
  };
  const { data, error } = await adminClient
    .from("policy_contents")
    .insert(defaults)
    .select()
    .single();
  if (error) throw new Error(`policy_contents 作成失敗: ${error.message}`);
  return data;
}

/** テスト用 interview_config（意見募集）を作成 */
export async function createTestInterviewConfig(
  overrides: Partial<{
    name: string;
    slug: string;
    description: string;
    status: "draft" | "open" | "closed";
    chat_model: string;
    starts_at: string;
    ends_at: string;
    deliberation_enabled: boolean;
    estimated_duration: number;
  }> = {}
) {
  const suffix = uniqueSuffix();
  const defaults = {
    name: `テスト意見募集 ${suffix}`,
    slug: `test-config-${suffix}`,
    status: "open" as const,
    chat_model: "test-model",
    ...overrides,
  };
  const { data, error } = await adminClient
    .from("interview_configs")
    .insert(defaults)
    .select()
    .single();
  if (error) throw new Error(`interview_config 作成失敗: ${error.message}`);
  return data;
}

/** 施策と意見募集を紐づける */
export async function linkPolicyToInterviewConfig(
  policyId: string,
  interviewConfigId: string
) {
  const { error } = await adminClient
    .from("policies_interview_configs")
    .insert({ policy_id: policyId, interview_config_id: interviewConfigId });
  if (error) {
    throw new Error(`policies_interview_configs 作成失敗: ${error.message}`);
  }
}

/**
 * テスト用インタビューデータを一括作成
 * policy ─ policies_interview_configs ─ interview_config → interview_session
 */
export async function createTestInterviewData(userId: string | null) {
  const policy = await createTestPolicy();
  const config = await createTestInterviewConfig();
  await linkPolicyToInterviewConfig(policy.id, config.id);

  const { data: session, error: sessionError } = await adminClient
    .from("interview_sessions")
    .insert({
      interview_config_id: config.id,
      user_id: userId,
      started_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (sessionError || !session)
    throw new Error(`interview_session 作成失敗: ${sessionError?.message}`);

  return { policy, config, session };
}

/** テスト用 opinion（確定版の意見）を作成 */
export async function createTestOpinion(
  interviewSessionId: string,
  overrides: Partial<{
    final_text: string;
    summary: string;
    role_title: string;
    role_description: string;
    content_richness: { total: number };
    moderation_score: number;
    review_status: "published" | "pending_review" | "hidden";
    is_public_by_user: boolean;
    is_public_by_admin: boolean;
    is_data_reuse_consented: boolean;
  }> = {}
) {
  const defaults = {
    interview_session_id: interviewSessionId,
    final_text: `テスト意見本文 ${uniqueSuffix()}`,
    ...overrides,
  };
  const { data, error } = await adminClient
    .from("opinions")
    .insert(defaults)
    .select()
    .single();
  if (error) throw new Error(`opinions 作成失敗: ${error.message}`);
  return data;
}

/** テスト用 tag を作成 */
export async function createTestTag(
  overrides: Partial<{
    label: string;
    description: string;
    featured_priority: number;
  }> = {}
) {
  const defaults = {
    label: `テストタグ-${uniqueSuffix()}`,
    ...overrides,
  };
  const { data, error } = await adminClient
    .from("tags")
    .insert(defaults)
    .select()
    .single();
  if (error) throw new Error(`tag 作成失敗: ${error.message}`);
  return data;
}

/** テスト用 tag を削除 */
export async function cleanupTestTag(tagId: string): Promise<void> {
  await adminClient.from("tags").delete().eq("id", tagId);
}

/** テスト用 policies_tags を作成 */
export async function createTestPolicyTag(policyId: string, tagId: string) {
  const { data, error } = await adminClient
    .from("policies_tags")
    .insert({ policy_id: policyId, tag_id: tagId })
    .select()
    .single();
  if (error) throw new Error(`policies_tags 作成失敗: ${error.message}`);
  return data;
}

/** テスト用 preview_tokens を作成 */
export async function createTestPreviewToken(
  policyId: string,
  overrides: Partial<{
    token: string;
    expires_at: string;
  }> = {}
) {
  const defaults = {
    policy_id: policyId,
    token: `test-token-${uniqueSuffix()}`,
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    ...overrides,
  };
  const { data, error } = await adminClient
    .from("preview_tokens")
    .insert(defaults)
    .select()
    .single();
  if (error) throw new Error(`preview_tokens 作成失敗: ${error.message}`);
  return data;
}

/** テスト用インタビューメッセージを作成 */
export async function createTestInterviewMessages(
  sessionId: string,
  count: number
) {
  const messages = Array.from({ length: count }, (_, i) => ({
    interview_session_id: sessionId,
    role: (i % 2 === 0 ? "assistant" : "user") as "assistant" | "user",
    content: `テストメッセージ ${i + 1}`,
  }));

  const { data, error } = await adminClient
    .from("interview_messages")
    .insert(messages)
    .select();
  if (error) throw new Error(`interview_messages 作成失敗: ${error.message}`);
  return data;
}
