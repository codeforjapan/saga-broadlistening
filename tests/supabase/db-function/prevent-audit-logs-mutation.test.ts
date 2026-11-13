import { beforeAll, describe, expect, it } from "vitest";
import { adminClient } from "../utils";

/**
 * audit_logs は追記専用。
 *
 * アクセスは全て service role（RLS をバイパスする）経由のため、RLS では
 * 守れない。UPDATE / DELETE を拒否しているのは
 * prevent_audit_logs_mutation() トリガなので、service role から実際に
 * 弾かれることをここで確認する。
 *
 * 投入した行は DELETE できないため後片付けをしない（追記専用テーブルの性質上、
 * 他のテストは audit_logs を参照しないので影響はない）。
 */
describe("prevent_audit_logs_mutation() トリガ", () => {
  let auditLogId: string;

  beforeAll(async () => {
    const { data, error } = await adminClient
      .from("audit_logs")
      .insert({
        action: "テスト操作",
        entity_type: "policy",
        metadata: { note: "追記専用トリガの検証用" },
      })
      .select()
      .single();
    if (error || !data) {
      throw new Error(`audit_logs 作成失敗: ${error?.message}`);
    }
    auditLogId = data.id;
  });

  it("INSERT は許可される", async () => {
    const { data, error } = await adminClient
      .from("audit_logs")
      .select("action, entity_type")
      .eq("id", auditLogId)
      .single();

    expect(error).toBeNull();
    expect(data).toMatchObject({
      action: "テスト操作",
      entity_type: "policy",
    });
  });

  it("service role からの UPDATE が拒否される", async () => {
    const { error } = await adminClient
      .from("audit_logs")
      .update({ action: "改ざんされた操作" })
      .eq("id", auditLogId);

    expect(error).not.toBeNull();
    expect(error?.message).toContain("audit_logs is append-only");
  });

  it("service role からの DELETE が拒否され、行が残る", async () => {
    const { error } = await adminClient
      .from("audit_logs")
      .delete()
      .eq("id", auditLogId);

    expect(error).not.toBeNull();
    expect(error?.message).toContain("audit_logs is append-only");

    const { data } = await adminClient
      .from("audit_logs")
      .select("id")
      .eq("id", auditLogId)
      .maybeSingle();
    expect(data?.id).toBe(auditLogId);
  });

  it("UPDATE が拒否されたあとも元の値が変わっていない", async () => {
    const { data } = await adminClient
      .from("audit_logs")
      .select("action")
      .eq("id", auditLogId)
      .single();

    expect(data?.action).toBe("テスト操作");
  });
});
