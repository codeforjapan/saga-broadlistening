import { describe, it, expect, afterEach } from "vitest";
import {
  createTestPolicy,
  cleanupTestPolicy,
  createTestPolicyContent,
  createTestTag,
  cleanupTestTag,
  createTestPolicyTag,
  createTestPreviewToken,
} from "@test-utils/utils";
import {
  findPublishedBillsWithContents,
  findPublishedBillById,
  findBillById,
  findTagsByBillId,
  findBillContentByDifficulty,
  findTagsByBillIds,
  findFeaturedTags,
  findPublishedBillsByTag,
  findFeaturedBillsWithContents,
  findPreviewToken,
} from "./bill-repository";

describe("bill-repository 統合テスト", () => {
  const billIds: string[] = [];
  const tagIds: string[] = [];

  afterEach(async () => {
    for (const billId of billIds) {
      await cleanupTestPolicy(billId);
    }
    billIds.length = 0;
    for (const tagId of tagIds) {
      await cleanupTestTag(tagId);
    }
    tagIds.length = 0;
  });

  // ============================================================
  // findPublishedBillsWithContents
  // ============================================================

  describe("findPublishedBillsWithContents", () => {
    it("公開済み施策を難易度コンテンツ付きで取得できる", async () => {
      const bill = await createTestPolicy({
        publish_status: "published",
        published_at: new Date().toISOString(),
      });
      billIds.push(bill.id);
      await createTestPolicyContent(bill.id, {
        difficulty_level: "normal",
        title: "テストタイトル",
      });

      const result = await findPublishedBillsWithContents("normal");

      const found = result.find((b) => b.id === bill.id);
      expect(found).toBeDefined();
      expect(found?.policy_contents).toHaveLength(1);
      expect(found?.policy_contents[0].title).toBe("テストタイトル");
      expect(found?.policy_contents[0].difficulty_level).toBe("normal");
    });

    it("下書き施策は含まれない", async () => {
      const bill = await createTestPolicy({ publish_status: "draft" });
      billIds.push(bill.id);
      await createTestPolicyContent(bill.id, { difficulty_level: "normal" });

      const result = await findPublishedBillsWithContents("normal");

      const found = result.find((b) => b.id === bill.id);
      expect(found).toBeUndefined();
    });

    it("指定した難易度のコンテンツがない施策は含まれない", async () => {
      const bill = await createTestPolicy({
        publish_status: "published",
        published_at: new Date().toISOString(),
      });
      billIds.push(bill.id);
      await createTestPolicyContent(bill.id, { difficulty_level: "hard" });

      const result = await findPublishedBillsWithContents("normal");

      const found = result.find((b) => b.id === bill.id);
      expect(found).toBeUndefined();
    });
  });

  // ============================================================
  // findPublishedBillById
  // ============================================================

  describe("findPublishedBillById", () => {
    it("公開済み施策を取得できる", async () => {
      const bill = await createTestPolicy({
        publish_status: "published",
        published_at: new Date().toISOString(),
        name: "公開テスト施策",
      });
      billIds.push(bill.id);

      const result = await findPublishedBillById(bill.id);

      expect(result).not.toBeNull();
      expect(result?.name).toBe("公開テスト施策");
    });

    it("下書き施策は取得できない", async () => {
      const bill = await createTestPolicy({ publish_status: "draft" });
      billIds.push(bill.id);

      const result = await findPublishedBillById(bill.id);

      expect(result).toBeNull();
    });

    it("存在しないIDではnullを返す", async () => {
      const result = await findPublishedBillById(
        "00000000-0000-0000-0000-000000000000"
      );

      expect(result).toBeNull();
    });
  });

  // ============================================================
  // findBillById
  // ============================================================

  describe("findBillById", () => {
    it("ステータス問わず施策を取得できる", async () => {
      const bill = await createTestPolicy({
        publish_status: "draft",
        name: "管理者用テスト施策",
      });
      billIds.push(bill.id);

      const result = await findBillById(bill.id);

      expect(result).not.toBeNull();
      expect(result?.name).toBe("管理者用テスト施策");
    });

    it("存在しないIDではnullを返す", async () => {
      const result = await findBillById("00000000-0000-0000-0000-000000000000");

      expect(result).toBeNull();
    });
  });

  // ============================================================
  // findTagsByBillId
  // ============================================================

  describe("findTagsByBillId", () => {
    it("施策のタグを取得できる", async () => {
      const bill = await createTestPolicy();
      billIds.push(bill.id);
      const tag = await createTestTag({ label: "テストタグ用ラベル" });
      tagIds.push(tag.id);
      await createTestPolicyTag(bill.id, tag.id);

      const result = await findTagsByBillId(bill.id);

      expect(result).not.toBeNull();
      expect(result).toHaveLength(1);
      expect(result?.[0].tags).toEqual(
        expect.objectContaining({
          id: tag.id,
          label: "テストタグ用ラベル",
        })
      );
    });

    it("タグが存在しない場合は空配列を返す", async () => {
      const bill = await createTestPolicy();
      billIds.push(bill.id);

      const result = await findTagsByBillId(bill.id);

      expect(result).toEqual([]);
    });
  });

  // ============================================================
  // findBillContentByDifficulty
  // ============================================================

  describe("findBillContentByDifficulty", () => {
    it("指定した難易度の施策コンテンツを取得できる", async () => {
      const bill = await createTestPolicy();
      billIds.push(bill.id);
      await createTestPolicyContent(bill.id, {
        difficulty_level: "normal",
        title: "ふつうタイトル",
      });
      await createTestPolicyContent(bill.id, {
        difficulty_level: "hard",
        title: "むずかしいタイトル",
      });

      const result = await findBillContentByDifficulty(bill.id, "normal");

      expect(result).not.toBeNull();
      expect(result?.title).toBe("ふつうタイトル");
      expect(result?.difficulty_level).toBe("normal");
    });

    it("該当する難易度がない場合はnullを返す", async () => {
      const bill = await createTestPolicy();
      billIds.push(bill.id);
      await createTestPolicyContent(bill.id, { difficulty_level: "normal" });

      const result = await findBillContentByDifficulty(bill.id, "hard");

      expect(result).toBeNull();
    });
  });

  // ============================================================
  // findTagsByBillIds
  // ============================================================

  describe("findTagsByBillIds", () => {
    it("複数の施策のタグを一括取得してグループ化できる", async () => {
      const bill1 = await createTestPolicy();
      const bill2 = await createTestPolicy();
      billIds.push(bill1.id, bill2.id);

      const tag1 = await createTestTag({ label: "タグA-一括取得テスト" });
      const tag2 = await createTestTag({ label: "タグB-一括取得テスト" });
      tagIds.push(tag1.id, tag2.id);

      await createTestPolicyTag(bill1.id, tag1.id);
      await createTestPolicyTag(bill1.id, tag2.id);
      await createTestPolicyTag(bill2.id, tag1.id);

      const result = await findTagsByBillIds([bill1.id, bill2.id]);

      expect(result.get(bill1.id)).toHaveLength(2);
      expect(result.get(bill2.id)).toHaveLength(1);
    });

    it("空配列を渡した場合は空のMapを返す", async () => {
      const result = await findTagsByBillIds([]);

      expect(result.size).toBe(0);
    });
  });

  // ============================================================
  // findFeaturedTags
  // ============================================================

  describe("findFeaturedTags", () => {
    it("featured_priorityが設定されているタグを取得できる", async () => {
      const tag = await createTestTag({
        label: `featured-tag-${Date.now()}`,
        featured_priority: 1,
      });
      tagIds.push(tag.id);

      const result = await findFeaturedTags();

      const found = result.find((t) => t.id === tag.id);
      expect(found).toBeDefined();
      expect(found?.featured_priority).toBe(1);
    });

    it("featured_priorityがnullのタグは含まれない", async () => {
      const tag = await createTestTag({
        label: `non-featured-tag-${Date.now()}`,
      });
      tagIds.push(tag.id);

      const result = await findFeaturedTags();

      const found = result.find((t) => t.id === tag.id);
      expect(found).toBeUndefined();
    });
  });

  // ============================================================
  // findPublishedBillsByTag
  // ============================================================

  describe("findPublishedBillsByTag", () => {
    it("特定タグに紐づく公開済み施策を取得できる", async () => {
      const bill = await createTestPolicy({
        publish_status: "published",
        published_at: new Date().toISOString(),
      });
      billIds.push(bill.id);
      await createTestPolicyContent(bill.id, { difficulty_level: "normal" });
      const tag = await createTestTag({ label: `tag-by-tag-${Date.now()}` });
      tagIds.push(tag.id);
      await createTestPolicyTag(bill.id, tag.id);

      const result = await findPublishedBillsByTag(tag.id, "normal");

      expect(result).not.toBeNull();
      expect(result?.length).toBeGreaterThanOrEqual(1);
      const found = result?.find((r) => r.policy_id === bill.id);
      expect(found).toBeDefined();
    });

    it("下書きの施策は含まれない", async () => {
      const bill = await createTestPolicy({ publish_status: "draft" });
      billIds.push(bill.id);
      await createTestPolicyContent(bill.id, { difficulty_level: "normal" });
      const tag = await createTestTag({ label: `tag-draft-${Date.now()}` });
      tagIds.push(tag.id);
      await createTestPolicyTag(bill.id, tag.id);

      const result = await findPublishedBillsByTag(tag.id, "normal");

      const found = result?.find((r) => r.policy_id === bill.id);
      expect(found).toBeUndefined();
    });
  });

  // ============================================================
  // findFeaturedBillsWithContents
  // ============================================================

  describe("findFeaturedBillsWithContents", () => {
    it("注目の施策を取得できる", async () => {
      const bill = await createTestPolicy({
        publish_status: "published",
        published_at: new Date().toISOString(),
        is_featured: true,
      });
      billIds.push(bill.id);
      await createTestPolicyContent(bill.id, {
        difficulty_level: "normal",
        title: "注目施策タイトル",
      });

      const result = await findFeaturedBillsWithContents("normal");

      const found = result.find((b) => b.id === bill.id);
      expect(found).toBeDefined();
      expect(found?.is_featured).toBe(true);
      expect(found?.policy_contents).toHaveLength(1);
      expect(found?.policy_contents[0].title).toBe("注目施策タイトル");
    });

    it("is_featured=falseの施策は含まれない", async () => {
      const bill = await createTestPolicy({
        publish_status: "published",
        published_at: new Date().toISOString(),
        is_featured: false,
      });
      billIds.push(bill.id);
      await createTestPolicyContent(bill.id, { difficulty_level: "normal" });

      const result = await findFeaturedBillsWithContents("normal");

      const found = result.find((b) => b.id === bill.id);
      expect(found).toBeUndefined();
    });
  });

  // ============================================================
  // findPreviewToken
  // ============================================================

  describe("findPreviewToken", () => {
    it("有効なプレビュートークンを取得できる", async () => {
      const bill = await createTestPolicy();
      billIds.push(bill.id);

      const futureDate = new Date(
        Date.now() + 24 * 60 * 60 * 1000
      ).toISOString();
      const previewToken = await createTestPreviewToken(bill.id, {
        token: "valid-test-token",
        expires_at: futureDate,
      });

      const result = await findPreviewToken(bill.id, "valid-test-token");

      expect(result).not.toBeNull();
      expect(result?.expires_at).toBe(previewToken.expires_at);
    });

    it("存在しないトークンではnullを返す", async () => {
      const bill = await createTestPolicy();
      billIds.push(bill.id);

      const result = await findPreviewToken(bill.id, "nonexistent-token");

      expect(result).toBeNull();
    });

    it("別の施策のトークンでは取得できない", async () => {
      const bill1 = await createTestPolicy();
      const bill2 = await createTestPolicy();
      billIds.push(bill1.id, bill2.id);

      await createTestPreviewToken(bill1.id, {
        token: "bill1-token",
      });

      const result = await findPreviewToken(bill2.id, "bill1-token");

      expect(result).toBeNull();
    });
  });
});
