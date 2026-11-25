import {
  cleanupTestUser,
  createTestUser,
  type TestUser,
} from "@test-utils/utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  findUserProfileByUserId,
  upsertUserProfile,
} from "./user-profile-repository";

describe("user-profile-repository 統合テスト", () => {
  let testUser: TestUser;

  beforeEach(async () => {
    testUser = await createTestUser();
  });

  afterEach(async () => {
    await cleanupTestUser(testUser.id);
  });

  it("まだ保存していなければ null を返す", async () => {
    expect(await findUserProfileByUserId(testUser.id)).toBeNull();
  });

  it("保存した属性を取得できる", async () => {
    await upsertUserProfile(testUser.id, { ageGroup: "20s", area: "city" });

    expect(await findUserProfileByUserId(testUser.id)).toEqual({
      ageGroup: "20s",
      area: "city",
    });
  });

  it("2回目の保存は上書きし、未回答の項目は null に戻す", async () => {
    await upsertUserProfile(testUser.id, { ageGroup: "20s", area: "city" });
    await upsertUserProfile(testUser.id, { ageGroup: "30s", area: null });

    expect(await findUserProfileByUserId(testUser.id)).toEqual({
      ageGroup: "30s",
      area: null,
    });
  });

  it("ユーザーを削除すると属性も消える", async () => {
    await upsertUserProfile(testUser.id, { ageGroup: "20s", area: "city" });
    await cleanupTestUser(testUser.id);

    expect(await findUserProfileByUserId(testUser.id)).toBeNull();
  });
});
