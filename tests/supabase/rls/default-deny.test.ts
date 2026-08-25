import type { Database } from "@mirai-gikai/supabase";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  cleanupTestUser,
  createTestUser,
  getAnonClient,
  getAuthenticatedClient,
} from "../utils";

/**
 * 全テーブルは RLS 有効 + ポリシーなし（default deny）。
 * anon / authenticated どちらからも SELECT・INSERT できないことを確認する。
 *
 * 対象は public スキーマの全テーブル。テーブルを追加したときに
 * ここへ足し忘れると `_assertAllTablesCovered` が型エラーになる
 * （手書きのリストが実スキーマから静かにずれるのを防ぐため）。
 */

type PublicTable = keyof Database["public"]["Tables"];

const tables = [
  "policies",
  "policy_contents",
  "policies_tags",
  "tags",
  "preview_tokens",
  "chat_sessions",
  "chat_messages",
  "interview_configs",
  "policies_interview_configs",
  "interview_questions",
  "interview_sessions",
  "interview_messages",
  "interview_rating_feedbacks",
  "opinions",
  "opinion_segments",
  "opinion_reactions",
  "topic_analysis_versions",
  "topic_analysis_topics",
  "topic_analysis_classifications",
  "topic_analysis_version",
  "topic",
  "topic_opinion",
  "portal_controls",
  "audit_logs",
  "guard_events",
  "api_rate_limits",
  "chat_usage_events",
  // Issue #59 で削除予定の旧テーブル
  "bills",
  "bill_contents",
  "bills_tags",
  "chats",
] as const satisfies readonly PublicTable[];

/** 網羅チェック。未掲載のテーブルがあると never に代入できず型エラーになる */
type UncoveredTable = Exclude<PublicTable, (typeof tables)[number]>;
const _assertAllTablesCovered: UncoveredTable[] = [];

describe("RLS default deny（全テーブル共通）", () => {
  describe("anon クライアント", () => {
    const anon = getAnonClient();

    for (const table of tables) {
      it(`${table}: SELECT が空結果になる`, async () => {
        const { data, error } = await anon.from(table).select("*").limit(1);
        // RLS で拒否される場合、エラーか空配列が返る
        if (error) {
          expect(error).toBeTruthy();
        } else {
          expect(data).toEqual([]);
        }
      });
    }

    it("policies: INSERT が拒否される", async () => {
      const { error } = await anon.from("policies").insert({
        name: "不正な挿入テスト",
        slug: `rls-test-${Date.now()}`,
        publish_status: "draft",
      });
      expect(error).not.toBeNull();
    });

    it("audit_logs: INSERT が拒否される", async () => {
      const { error } = await anon.from("audit_logs").insert({
        action: "不正な挿入テスト",
        entity_type: "policy",
      });
      expect(error).not.toBeNull();
    });
  });

  describe("authenticated クライアント", () => {
    let userId: string;
    let email: string;
    const password = "test-password-123";

    beforeAll(async () => {
      email = `rls-test-${Date.now()}@example.com`;
      const user = await createTestUser(email, password);
      userId = user.id;
    });

    afterAll(async () => {
      await cleanupTestUser(userId);
    });

    for (const table of tables) {
      it(`${table}: SELECT が空結果になる`, async () => {
        const client = await getAuthenticatedClient(email, password);
        const { data, error } = await client.from(table).select("*").limit(1);
        if (error) {
          expect(error).toBeTruthy();
        } else {
          expect(data).toEqual([]);
        }
      });
    }

    it("policies: INSERT が拒否される", async () => {
      const client = await getAuthenticatedClient(email, password);
      const { error } = await client.from("policies").insert({
        name: "不正な挿入テスト",
        slug: `rls-test-${Date.now()}`,
        publish_status: "draft",
      });
      expect(error).not.toBeNull();
    });

    it("audit_logs: INSERT が拒否される", async () => {
      const client = await getAuthenticatedClient(email, password);
      const { error } = await client.from("audit_logs").insert({
        action: "不正な挿入テスト",
        entity_type: "policy",
      });
      expect(error).not.toBeNull();
    });
  });
});
