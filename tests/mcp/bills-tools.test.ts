import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { registerBillsTools } from "../../admin/src/features/mcp/server/tools/register-bills-tools";
import {
  adminClient,
  cleanupTestPolicy,
  cleanupTestTag,
  createTestPolicy,
  createTestPolicyContent,
  createTestPolicyTag,
  createTestTag,
} from "../supabase/utils";
import { createTestRegistry, type TestMcpRegistry } from "./utils";

/**
 * bills ツール群は Epic #54 で参照先が policies 系に変わった。
 * ツール名・入出力のキー（billId 等）は据え置きで、読み書きするのは
 * policies / policy_contents / policies_tags。
 */
describe("MCP bills tools", () => {
  let registry: TestMcpRegistry;
  const policyIds: string[] = [];
  const tagIds: string[] = [];

  beforeEach(() => {
    registry = createTestRegistry();
    registerBillsTools(registry.asMcpServer());
  });

  afterEach(async () => {
    for (const id of policyIds.splice(0)) await cleanupTestPolicy(id);
    for (const id of tagIds.splice(0)) await cleanupTestTag(id);
  });

  describe("list_bills", () => {
    it("publish_status でフィルタした施策を返す", async () => {
      const draftPolicy = await createTestPolicy({ publish_status: "draft" });
      const publishedPolicy = await createTestPolicy({
        publish_status: "published",
        published_at: new Date().toISOString(),
      });
      policyIds.push(draftPolicy.id, publishedPolicy.id);

      const draftResult = await registry.callTool<
        Array<{ id: string; publish_status: string }>
      >("list_bills", { publish_status: "draft" });
      const draftIds = draftResult.map((b) => b.id);
      expect(draftIds).toContain(draftPolicy.id);
      expect(draftIds).not.toContain(publishedPolicy.id);
      expect(draftResult.every((b) => b.publish_status === "draft")).toBe(true);

      const publishedResult = await registry.callTool<
        Array<{ id: string; publish_status: string }>
      >("list_bills", { publish_status: "published" });
      const publishedIds = publishedResult.map((b) => b.id);
      expect(publishedIds).toContain(publishedPolicy.id);
      expect(publishedIds).not.toContain(draftPolicy.id);
    });

    it("publish_status 未指定なら全件返す", async () => {
      const policy = await createTestPolicy({ publish_status: "draft" });
      policyIds.push(policy.id);

      const result = await registry.callTool<Array<{ id: string }>>(
        "list_bills",
        {}
      );
      expect(result.map((b) => b.id)).toContain(policy.id);
    });
  });

  describe("get_bill", () => {
    it("施策本体・policy_contents・tagIds をまとめて返す", async () => {
      const policy = await createTestPolicy();
      policyIds.push(policy.id);
      await createTestPolicyContent(policy.id, { difficulty_level: "normal" });
      await createTestPolicyContent(policy.id, { difficulty_level: "hard" });
      const tag = await createTestTag();
      tagIds.push(tag.id);
      await createTestPolicyTag(policy.id, tag.id);

      const result = await registry.callTool<{
        bill: { id: string };
        contents: Array<{ difficulty_level: string }>;
        tagIds: string[];
      }>("get_bill", { billId: policy.id });

      expect(result.bill.id).toBe(policy.id);
      expect(result.contents).toHaveLength(2);
      expect(result.contents.map((c) => c.difficulty_level).sort()).toEqual([
        "hard",
        "normal",
      ]);
      expect(result.tagIds).toEqual([tag.id]);
    });

    it("該当する施策が無いと例外を投げる", async () => {
      await expect(
        registry.callTool("get_bill", {
          billId: "00000000-0000-0000-0000-000000000000",
        })
      ).rejects.toThrow();
    });
  });

  describe("get_bill_by_slug", () => {
    it("slug で施策を引ける", async () => {
      const policy = await createTestPolicy({ name: "slug検索用" });
      policyIds.push(policy.id);

      const result = await registry.callTool<{
        bill: { id: string; slug: string };
      }>("get_bill_by_slug", { slug: policy.slug });
      expect(result.bill.id).toBe(policy.id);
      expect(result.bill.slug).toBe(policy.slug);
    });

    it("該当する施策が無いと例外を投げる", async () => {
      await expect(
        registry.callTool("get_bill_by_slug", {
          slug: `non-existent-${Date.now()}`,
        })
      ).rejects.toThrow();
    });
  });

  describe("create_bill", () => {
    it("担当部署・問い合わせ先・AI質問可否を保存する", async () => {
      const suffix = Date.now();
      const result = await registry.callTool<{
        ok: boolean;
        bill: { id: string };
      }>("create_bill", {
        name: `MCP作成テスト-${suffix}`,
        slug: `mcp-create-${suffix}`,
        department: "こども未来部",
        contact: "0952-00-0000",
        is_featured: false,
        knowledge_source: "参考情報",
        enable_ai_chat: true,
      });

      expect(result.ok).toBe(true);
      policyIds.push(result.bill.id);

      const { data } = await adminClient
        .from("policies")
        .select(
          "name, slug, department, contact, publish_status, knowledge_source, enable_ai_chat"
        )
        .eq("id", result.bill.id)
        .single();
      expect(data?.name).toBe(`MCP作成テスト-${suffix}`);
      expect(data?.slug).toBe(`mcp-create-${suffix}`);
      expect(data?.department).toBe("こども未来部");
      expect(data?.contact).toBe("0952-00-0000");
      expect(data?.knowledge_source).toBe("参考情報");
      expect(data?.enable_ai_chat).toBe(true);
      // 作成直後は下書き
      expect(data?.publish_status).toBe("draft");
    });

    it("knowledge_source / enable_ai_chat を省略しても作成できる", async () => {
      const suffix = Date.now();
      const result = await registry.callTool<{
        ok: boolean;
        bill: { id: string };
      }>("create_bill", {
        name: `MCP作成テスト省略-${suffix}`,
        slug: `mcp-create-omit-${suffix}`,
        is_featured: false,
      });
      expect(result.ok).toBe(true);
      policyIds.push(result.bill.id);

      const { data } = await adminClient
        .from("policies")
        .select("knowledge_source, enable_ai_chat")
        .eq("id", result.bill.id)
        .single();
      // 省略時は DB のデフォルト（NULL / false）が入る
      expect(data?.knowledge_source).toBeNull();
      expect(data?.enable_ai_chat).toBe(false);
    });
  });

  describe("update_bill", () => {
    it("name と department を更新する", async () => {
      const policy = await createTestPolicy({ name: "更新前" });
      policyIds.push(policy.id);

      const result = await registry.callTool<{ ok: boolean }>("update_bill", {
        billId: policy.id,
        name: "更新後",
        department: "総務部",
        contact: "0952-11-1111",
        is_featured: true,
        enable_ai_chat: true,
      });
      expect(result.ok).toBe(true);

      const { data } = await adminClient
        .from("policies")
        .select("name, department, contact, is_featured, enable_ai_chat")
        .eq("id", policy.id)
        .single();
      expect(data?.name).toBe("更新後");
      expect(data?.department).toBe("総務部");
      expect(data?.contact).toBe("0952-11-1111");
      expect(data?.is_featured).toBe(true);
      expect(data?.enable_ai_chat).toBe(true);
    });

    it("billId 以外を省略すると updated_at だけが更新される", async () => {
      const policy = await createTestPolicy({
        name: "部分更新元",
        department: "こども未来部",
      });
      policyIds.push(policy.id);

      const result = await registry.callTool<{ ok: boolean }>("update_bill", {
        billId: policy.id,
      });
      expect(result.ok).toBe(true);

      const { data } = await adminClient
        .from("policies")
        .select("name, department, updated_at")
        .eq("id", policy.id)
        .single();
      expect(data?.name).toBe("部分更新元");
      expect(data?.department).toBe("こども未来部");
      expect(data?.updated_at).not.toBe(policy.updated_at);
    });

    it("一部のフィールドのみ指定した場合、他のフィールドは変更されない", async () => {
      const policy = await createTestPolicy({
        name: "更新前の名前",
        department: "こども未来部",
        contact: "0952-00-0000",
        is_featured: false,
      });
      policyIds.push(policy.id);

      const result = await registry.callTool<{ ok: boolean }>("update_bill", {
        billId: policy.id,
        name: "更新後の名前のみ",
      });
      expect(result.ok).toBe(true);

      const { data } = await adminClient
        .from("policies")
        .select("name, department, contact, is_featured, slug")
        .eq("id", policy.id)
        .single();
      expect(data?.name).toBe("更新後の名前のみ");
      expect(data?.department).toBe("こども未来部");
      expect(data?.contact).toBe("0952-00-0000");
      expect(data?.is_featured).toBe(false);
      expect(data?.slug).toBe(policy.slug);
    });
  });

  describe("update_bill_publish_status", () => {
    it("publish_status を変更し、published_at を埋める", async () => {
      const policy = await createTestPolicy({ publish_status: "draft" });
      policyIds.push(policy.id);

      const result = await registry.callTool<{ ok: boolean }>(
        "update_bill_publish_status",
        { billId: policy.id, publishStatus: "published" }
      );
      expect(result.ok).toBe(true);

      const { data } = await adminClient
        .from("policies")
        .select("publish_status, published_at")
        .eq("id", policy.id)
        .single();
      expect(data?.publish_status).toBe("published");
      // published への変更時は CHECK 制約を満たすため published_at が必ず入る
      expect(data?.published_at).not.toBeNull();
    });
  });

  describe("update_bill_contents", () => {
    it("normal / hard 両方を upsert する", async () => {
      const policy = await createTestPolicy();
      policyIds.push(policy.id);

      const result = await registry.callTool<{ ok: boolean }>(
        "update_bill_contents",
        {
          billId: policy.id,
          normal: {
            title: "ふつうタイトル",
            summary: "ふつう要約",
            content: "ふつう本文",
          },
          hard: {
            title: "難しいタイトル",
            summary: "難しい要約",
            content: "難しい本文",
          },
        }
      );
      expect(result.ok).toBe(true);

      const { data } = await adminClient
        .from("policy_contents")
        .select("difficulty_level, title, summary, content")
        .eq("policy_id", policy.id)
        .order("difficulty_level");
      expect(data).toHaveLength(2);
      const hard = data?.find((c) => c.difficulty_level === "hard");
      const normal = data?.find((c) => c.difficulty_level === "normal");
      expect(normal?.title).toBe("ふつうタイトル");
      expect(hard?.summary).toBe("難しい要約");
    });

    it("title/summary/content がすべて空の難易度はスキップする", async () => {
      const policy = await createTestPolicy();
      policyIds.push(policy.id);

      await registry.callTool("update_bill_contents", {
        billId: policy.id,
        normal: { title: "", summary: "", content: "" },
        hard: { title: "難しい", summary: "", content: "" },
      });

      const { data } = await adminClient
        .from("policy_contents")
        .select("difficulty_level")
        .eq("policy_id", policy.id);
      expect(data).toHaveLength(1);
      expect(data?.[0]?.difficulty_level).toBe("hard");
    });

    it("既存レコードがあれば onConflict で上書きする", async () => {
      const policy = await createTestPolicy();
      policyIds.push(policy.id);
      await createTestPolicyContent(policy.id, {
        difficulty_level: "normal",
        title: "古い",
      });

      await registry.callTool("update_bill_contents", {
        billId: policy.id,
        normal: { title: "新しい", summary: "新要約", content: "新本文" },
        hard: { title: "", summary: "", content: "" },
      });

      const { data } = await adminClient
        .from("policy_contents")
        .select("title")
        .eq("policy_id", policy.id)
        .eq("difficulty_level", "normal")
        .single();
      expect(data?.title).toBe("新しい");
    });
  });

  describe("update_bill_tags", () => {
    it("既存タグとの差分のみ insert/delete し、added/removed を返す", async () => {
      const policy = await createTestPolicy();
      policyIds.push(policy.id);
      const tagA = await createTestTag();
      const tagB = await createTestTag();
      const tagC = await createTestTag();
      tagIds.push(tagA.id, tagB.id, tagC.id);

      // 初期: A, B
      await createTestPolicyTag(policy.id, tagA.id);
      await createTestPolicyTag(policy.id, tagB.id);

      // A は維持、B を削除、C を追加
      const result = await registry.callTool<{
        ok: boolean;
        added: string[];
        removed: string[];
      }>("update_bill_tags", {
        billId: policy.id,
        tagIds: [tagA.id, tagC.id],
      });

      expect(result.ok).toBe(true);
      expect(result.added).toEqual([tagC.id]);
      expect(result.removed).toEqual([tagB.id]);

      const { data } = await adminClient
        .from("policies_tags")
        .select("tag_id")
        .eq("policy_id", policy.id);
      const ids = (data ?? []).map((d) => d.tag_id).sort();
      expect(ids).toEqual([tagA.id, tagC.id].sort());
    });

    it("差分が無い場合は added/removed が共に空", async () => {
      const policy = await createTestPolicy();
      policyIds.push(policy.id);
      const tag = await createTestTag();
      tagIds.push(tag.id);
      await createTestPolicyTag(policy.id, tag.id);

      const result = await registry.callTool<{
        added: string[];
        removed: string[];
      }>("update_bill_tags", { billId: policy.id, tagIds: [tag.id] });
      expect(result.added).toEqual([]);
      expect(result.removed).toEqual([]);
    });
  });

  it("登録されているツール名が想定通り", () => {
    expect(registry.toolNames().sort()).toEqual(
      [
        "list_bills",
        "get_bill",
        "get_bill_by_slug",
        "create_bill",
        "update_bill",
        "update_bill_publish_status",
        "update_bill_contents",
        "update_bill_tags",
      ].sort()
    );
  });
});
