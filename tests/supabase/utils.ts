import { createClient } from "@supabase/supabase-js";
import type {
  Database,
  Json,
} from "../../packages/supabase/types/supabase.types";

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
export type TestPolicyOverrides = Partial<{
  name: string;
  slug: string;
  publish_status: "draft" | "published";
  published_at: string;
  department: string;
  contact: string;
  is_featured: boolean;
  enable_ai_chat: boolean;
  knowledge_source: string;
  thumbnail_url: string;
}>;

export type TestInterviewConfigOverrides = Partial<{
  name: string;
  slug: string;
  description: string;
  status: "draft" | "open" | "closed";
  chat_model: string;
  starts_at: string;
  ends_at: string;
  deliberation_enabled: boolean;
  estimated_duration: number;
  thumbnail_url: string;
}>;

export type TestInterviewSessionOverrides = Partial<{
  started_at: string;
  completed_at: string | null;
  archived_at: string | null;
  rating: number;
}>;

export type TestOpinionOverrides = Partial<{
  final_text: string;
  summary: string;
  role_title: string;
  role_description: string;
  /** jsonb 列。`total` 以外の内訳（clarity など）も渡せる */
  content_richness: { total: number } & Record<string, Json>;
  moderation_score: number;
  review_status: "published" | "pending_review" | "hidden";
  is_public_by_user: boolean;
  is_public_by_admin: boolean;
  is_data_reuse_consented: boolean;
  created_at: string;
}>;

/** opinion_segments の1行分。未指定の列は連番から既定値を埋める。 */
export type TestOpinionSegmentInput = Partial<{
  title: string;
  content: string;
  contextual_quote: string;
  tags_extracted_at: string | null;
}>;

export type TestInterviewMessageInput = {
  role: "assistant" | "user";
  content: string;
  /** 同一 INSERT の行は created_at が同値になるため、順序を検証するなら明示する */
  created_at?: string;
};

/** テスト用 policy を作成 */
export async function createTestPolicy(overrides: TestPolicyOverrides = {}) {
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

/**
 * テスト用 policy を削除する。
 *
 * 施策 ↔ 意見募集は `policies_interview_configs` による多対多で、CASCADE は
 * 中間テーブルの行までしか届かない。**意見募集・セッション・意見・論点は残る**ため、
 * 意見募集も作ったテストは `createTestPolicyWithConfig()` /
 * `createTestInterviewData()` が返す `cleanup()` を使うこと。
 */
export async function cleanupTestPolicy(policyId: string): Promise<void> {
  await adminClient.from("policies").delete().eq("id", policyId);
}

/**
 * テスト用 interview_config を削除する。
 * 配下のセッション・意見・論点・リアクションは CASCADE で消える。
 */
export async function cleanupTestInterviewConfig(
  interviewConfigId: string
): Promise<void> {
  await adminClient
    .from("interview_configs")
    .delete()
    .eq("id", interviewConfigId);
}

/**
 * 後片付けを並行実行し、失敗した分をまとめて1つのエラーにして投げる。
 * 途中で失敗しても残りの削除を止めない。
 */
export async function cleanupAll(
  ...cleanups: Array<Promise<unknown>>
): Promise<void> {
  const results = await Promise.allSettled(cleanups);
  const rejected = results.filter(
    (result): result is PromiseRejectedResult => result.status === "rejected"
  );
  if (rejected.length > 0) {
    throw new Error(
      `テストデータのクリーンアップに失敗しました: ${rejected
        .map((result) => String(result.reason))
        .join(", ")}`
    );
  }
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
  overrides: TestInterviewConfigOverrides = {}
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
 * 施策と、それに紐づけた意見募集を1組作る。
 * policy ─ policies_interview_configs ─ interview_config
 *
 * 後片付けは戻り値の `cleanup()` を使うこと。`cleanupTestPolicy()` だけでは
 * 意見募集とその配下（セッション・意見・論点）が消えずに残る。
 */
export async function createTestPolicyWithConfig(
  overrides: {
    policy?: TestPolicyOverrides;
    config?: TestInterviewConfigOverrides;
  } = {}
) {
  const policy = await createTestPolicy(overrides.policy);
  try {
    const config = await createTestInterviewConfig(overrides.config);
    await linkPolicyToInterviewConfig(policy.id, config.id);
    return {
      policy,
      config,
      cleanup: async () => {
        await cleanupTestInterviewConfig(config.id);
        await cleanupTestPolicy(policy.id);
      },
    };
  } catch (error) {
    await cleanupTestPolicy(policy.id);
    throw error;
  }
}

/**
 * テスト用インタビューデータを一括作成
 * policy ─ policies_interview_configs ─ interview_config → interview_session
 */
export async function createTestInterviewData(userId: string | null) {
  const { policy, config, cleanup } = await createTestPolicyWithConfig();
  try {
    const session = await createTestSession(config.id, userId);
    return { policy, config, session, cleanup };
  } catch (error) {
    await cleanup();
    throw error;
  }
}

/** 指定した意見募集の配下にテスト用セッションを作成する */
export async function createTestSession(
  interviewConfigId: string,
  userId: string | null,
  overrides: TestInterviewSessionOverrides = {}
) {
  const { data, error } = await adminClient
    .from("interview_sessions")
    .insert({
      interview_config_id: interviewConfigId,
      user_id: userId,
      started_at: new Date().toISOString(),
      ...overrides,
    })
    .select()
    .single();
  if (error) throw new Error(`interview_session 作成失敗: ${error.message}`);
  return data;
}

/** テスト用 opinion（確定版の意見）を作成 */
export async function createTestOpinion(
  interviewSessionId: string,
  overrides: TestOpinionOverrides = {}
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

/**
 * テスト用インタビューメッセージを count 件作成する（内容は連番で自動生成）。
 * 内容や時刻を指定したい場合は `insertTestInterviewMessages` を使う。
 */
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

/** 指定したセッションに、内容を明示したメッセージをまとめて作成する */
export async function insertTestInterviewMessages(
  sessionId: string,
  messages: TestInterviewMessageInput[]
): Promise<void> {
  if (messages.length === 0) return;
  const { error } = await adminClient.from("interview_messages").insert(
    messages.map((message) => ({
      interview_session_id: sessionId,
      role: message.role,
      content: message.content,
      ...(message.created_at ? { created_at: message.created_at } : {}),
    }))
  );
  if (error) throw new Error(`interview_messages 作成失敗: ${error.message}`);
}

/**
 * 意見募集配下に session + opinion + opinion_segments を1組作る。
 *
 * 論点（opinion_segments）は渡した配列順に `opinion_index` が振られ、
 * `title` / `content` を省略すると連番から既定値を埋める。
 */
export async function createTestOpinionWithSegments(options: {
  interviewConfigId: string;
  userId: string | null;
  segments: TestOpinionSegmentInput[];
  opinion?: TestOpinionOverrides;
  session?: TestInterviewSessionOverrides;
  messages?: TestInterviewMessageInput[];
}): Promise<{
  sessionId: string;
  opinionId: string;
  segmentIds: string[];
}> {
  const session = await createTestSession(
    options.interviewConfigId,
    options.userId,
    options.session
  );
  const opinion = await createTestOpinion(session.id, options.opinion);
  await insertTestInterviewMessages(session.id, options.messages ?? []);

  const { data: segments, error } = await adminClient
    .from("opinion_segments")
    .insert(
      options.segments.map((segment, index) => ({
        opinion_id: opinion.id,
        opinion_index: index,
        title: segment.title ?? `論点${index}`,
        content: segment.content ?? `内容${index}`,
        ...(segment.contextual_quote != null
          ? { contextual_quote: segment.contextual_quote }
          : {}),
        ...(segment.tags_extracted_at != null
          ? { tags_extracted_at: segment.tags_extracted_at }
          : {}),
      }))
    )
    .select("id");
  if (error || !segments) {
    throw new Error(`opinion_segments 作成失敗: ${error?.message}`);
  }

  return {
    sessionId: session.id,
    opinionId: opinion.id,
    segmentIds: segments.map((segment) => segment.id),
  };
}

/**
 * 意見募集配下に公開済みの意見を count 件まとめて作る（k-匿名性ゲートの水増し用）。
 *
 * セッションと意見をそれぞれ1回の INSERT にまとめるため、件数が増えても
 * DB との往復は2回で済む。`opinion` / `session` に関数を渡すと行ごとに列を上書きできる。
 */
export async function createTestPublicOpinions(options: {
  interviewConfigId: string;
  userId: string | null;
  count: number;
  opinion?: (index: number) => TestOpinionOverrides;
  session?: (index: number) => TestInterviewSessionOverrides;
}) {
  if (options.count === 0) return { sessions: [], opinions: [] };

  const now = Date.now();
  const { data: sessions, error: sessionError } = await adminClient
    .from("interview_sessions")
    .insert(
      Array.from({ length: options.count }, (_, index) => ({
        interview_config_id: options.interviewConfigId,
        user_id: options.userId,
        started_at: new Date(now + index).toISOString(),
        completed_at: new Date(now + index + 1000).toISOString(),
        ...options.session?.(index),
      }))
    )
    .select();
  if (sessionError || !sessions) {
    throw new Error(
      `interview_sessions 一括作成失敗: ${sessionError?.message}`
    );
  }

  const { data: opinions, error: opinionError } = await adminClient
    .from("opinions")
    .insert(
      sessions.map((session, index) => ({
        interview_session_id: session.id,
        review_status: "published" as const,
        is_public_by_user: true,
        is_public_by_admin: true,
        final_text: `テスト意見本文 ${index + 1}`,
        summary: `テスト意見要約 ${index + 1}`,
        ...options.opinion?.(index),
      }))
    )
    .select();
  if (opinionError || !opinions) {
    throw new Error(`opinions 一括作成失敗: ${opinionError?.message}`);
  }

  return { sessions, opinions };
}
