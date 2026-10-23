import {
  adminClient,
  cleanupTestExternalIdentityByUid,
  cleanupTestUser,
  createTestUser,
  type TestUser,
  uniqueSuffix,
} from "@test-utils/utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resolveExternalIdentities } from "./resolve-external-identities";

const PROVIDER = "saga_super_app" as const;

describe("resolveExternalIdentities 統合テスト", () => {
  let user: TestUser;
  let otherUser: TestUser;
  let uid: string;

  beforeEach(async () => {
    user = await createTestUser();
    otherUser = await createTestUser(
      `test-other-${uniqueSuffix()}@example.com`
    );
    uid = `uid-${uniqueSuffix()}`;
  });

  afterEach(async () => {
    await cleanupTestExternalIdentityByUid(PROVIDER, uid);
    await cleanupTestUser(user.id);
    await cleanupTestUser(otherUser.id);
  });

  it("同じ連携元・UID を2回解決しても1行のままで、last_seen_at だけ更新される", async () => {
    const claims = [{ providerKey: PROVIDER, externalUid: uid }];

    const [first] = await resolveExternalIdentities({
      userId: user.id,
      claims,
    });
    expect(first.providerKey).toBe(PROVIDER);

    const { data: before } = await adminClient
      .from("external_identities")
      .select("first_seen_at, last_seen_at")
      .eq("id", first.id)
      .single();

    // last_seen_at の更新を観測できるよう少し待つ
    await new Promise((resolve) => setTimeout(resolve, 20));
    const [second] = await resolveExternalIdentities({
      userId: user.id,
      claims,
    });
    expect(second.id).toBe(first.id);
    expect(
      await resolveExternalIdentities({ userId: user.id, claims })
    ).toHaveLength(1);

    const { data: rows } = await adminClient
      .from("external_identities")
      .select("id, first_seen_at, last_seen_at")
      .eq("provider_key", PROVIDER)
      .eq("external_uid", uid);
    expect(rows).toHaveLength(1);
    expect(rows?.[0].first_seen_at).toBe(before?.first_seen_at);
    expect(new Date(rows?.[0].last_seen_at ?? 0).getTime()).toBeGreaterThan(
      new Date(before?.last_seen_at ?? 0).getTime()
    );
  });

  it("ユーザーに紐付け、Cookie が無い次回の解決でも既存の紐付きを返す", async () => {
    const [withCookie] = await resolveExternalIdentities({
      userId: user.id,
      claims: [{ providerKey: PROVIDER, externalUid: uid }],
    });

    const withoutCookie = await resolveExternalIdentities({
      userId: user.id,
      claims: [],
    });
    expect(withoutCookie.map((i) => i.id)).toEqual([withCookie.id]);

    // 別ユーザーには紐付いていない
    const other = await resolveExternalIdentities({
      userId: otherUser.id,
      claims: [],
    });
    expect(other).toEqual([]);
  });

  it("Cookie 由来の外部IDを先頭に、既存の紐付けを後ろに返す", async () => {
    const olderUid = `uid-${uniqueSuffix()}`;
    try {
      const [older] = await resolveExternalIdentities({
        userId: user.id,
        claims: [{ providerKey: PROVIDER, externalUid: olderUid }],
      });
      const result = await resolveExternalIdentities({
        userId: user.id,
        claims: [{ providerKey: PROVIDER, externalUid: uid }],
      });
      expect(result.map((i) => i.id)).toHaveLength(2);
      expect(result[1].id).toBe(older.id);
      expect(result[0].id).not.toBe(older.id);
    } finally {
      await cleanupTestExternalIdentityByUid(PROVIDER, olderUid);
    }
  });

  it("同じ外部IDに複数のユーザーが紐付ける（ブラウザと WebView のセッション共存）", async () => {
    const claims = [{ providerKey: PROVIDER, externalUid: uid }];
    const [a] = await resolveExternalIdentities({ userId: user.id, claims });
    const [b] = await resolveExternalIdentities({
      userId: otherUser.id,
      claims,
    });
    expect(a.id).toBe(b.id);

    const { data: links } = await adminClient
      .from("external_identity_users")
      .select("user_id")
      .eq("external_identity_id", a.id);
    expect(links?.map((l) => l.user_id).sort()).toEqual(
      [user.id, otherUser.id].sort()
    );
  });
});
