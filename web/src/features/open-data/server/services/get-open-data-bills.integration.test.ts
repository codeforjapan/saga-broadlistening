import {
  adminClient,
  cleanupTestPolicy,
  cleanupTestTag,
  createTestPolicy,
  createTestPolicyContent,
  createTestPolicyTag,
  createTestTag,
} from "@test-utils/utils";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { DifficultyLevelEnum } from "@/features/bill-difficulty/shared/types";
import type { OpenDataBillItem } from "../../shared/types/open-data-bills";
import { decodeCursor, type OpenDataCursor } from "../../shared/utils/cursor";
import { getOpenDataBillDetail } from "./get-open-data-bill-detail";
import { getOpenDataBills } from "./get-open-data-bills";

/**
 * 公開施策の一覧・詳細サービスを実DBで検証する。
 * ローカルDBには他の施策が存在し得るため、検証はこのテストで作成した
 * 施策の行だけに絞って行う。
 */
describe("getOpenDataBills / getOpenDataBillDetail", () => {
  let publishedBillId: string;
  let publishedBillWithoutStanceId: string;
  let draftBillId: string;
  let tagId: string;

  beforeAll(async () => {
    // 新しい方: タグ・両難易度コンテンツあり
    const published = await createTestPolicy({
      publish_status: "published",
      published_at: new Date().toISOString(),
    });
    publishedBillId = published.id;
    await createTestPolicyContent(publishedBillId, {
      difficulty_level: "normal",
      title: "ふつうタイトル",
      summary: "ふつう概要",
      content: "ふつう本文",
    });
    await createTestPolicyContent(publishedBillId, {
      difficulty_level: "hard",
      title: "難しいタイトル",
      summary: "難しい概要",
      content: "難しい本文",
    });
    const tag = await createTestTag();
    tagId = tag.id;
    await createTestPolicyTag(publishedBillId, tagId);

    // 古い方: タグなし・normalコンテンツのみ
    const withoutStance = await createTestPolicy({
      publish_status: "published",
      published_at: new Date().toISOString(),
    });
    publishedBillWithoutStanceId = withoutStance.id;
    await createTestPolicyContent(publishedBillWithoutStanceId, {
      difficulty_level: "normal",
    });

    // 非公開: 一覧・詳細どちらにも含まれない
    const draft = await createTestPolicy({ publish_status: "draft" });
    draftBillId = draft.id;
    await createTestPolicyContent(draftBillId, { difficulty_level: "normal" });

    // created_at で並び順・カーソルを検証できるよう明示的にずらす
    const setCreatedAt = async (billId: string, createdAt: string) => {
      const { error } = await adminClient
        .from("policies")
        .update({ created_at: createdAt })
        .eq("id", billId);
      if (error) throw new Error(error.message);
    };
    await setCreatedAt(publishedBillId, "2026-01-02T00:00:00+00:00");
    await setCreatedAt(
      publishedBillWithoutStanceId,
      "2026-01-01T00:00:00+00:00"
    );
  });

  afterAll(async () => {
    await cleanupTestPolicy(publishedBillId);
    await cleanupTestPolicy(publishedBillWithoutStanceId);
    await cleanupTestPolicy(draftBillId);
    await cleanupTestTag(tagId);
  });

  const testBillIds = () => [
    publishedBillId,
    publishedBillWithoutStanceId,
    draftBillId,
  ];

  /**
   * 全ページを走査して施策を収集する。ローカルDBの件数が1ページ分を
   * 超えてもテストが影響を受けないようにする。
   */
  const fetchAllBills = async (
    difficulty: DifficultyLevelEnum,
    cursor: OpenDataCursor | null = null
  ) => {
    const items: OpenDataBillItem[] = [];
    let currentCursor = cursor;
    do {
      const page = await getOpenDataBills({
        limit: 100,
        cursor: currentCursor,
        difficulty,
      });
      items.push(...page.items);
      currentCursor = page.nextCursor ? decodeCursor(page.nextCursor) : null;
    } while (currentCursor);
    return items;
  };

  it("公開中の施策のみを新しい順に、タグ付きで返す", async () => {
    const items = await fetchAllBills("normal");
    const mine = items.filter((item) => testBillIds().includes(item.billId));

    expect(mine.map((item) => item.billId)).toEqual([
      publishedBillId,
      publishedBillWithoutStanceId,
    ]);

    const [withTag, withoutTag] = mine;
    expect(withTag?.title).toBe("ふつうタイトル");
    expect(withTag?.summary).toBe("ふつう概要");
    expect(withTag?.tags).toEqual([{ id: tagId, label: expect.any(String) }]);
    expect(withoutTag?.tags).toEqual([]);
  });

  it("difficulty=hard ではhardコンテンツを持つ施策のみを返す", async () => {
    const items = await fetchAllBills("hard");
    const mine = items.filter((item) => testBillIds().includes(item.billId));

    expect(mine.map((item) => item.billId)).toEqual([publishedBillId]);
    expect(mine[0]?.title).toBe("難しいタイトル");
  });

  it("cursor 以降のページには古い施策だけが含まれる", async () => {
    const items = await fetchAllBills("normal");
    const newer = items.find((item) => item.billId === publishedBillId);
    expect(newer).toBeTruthy();
    if (!newer) return;

    const afterCursor = await fetchAllBills("normal", {
      createdAt: newer.createdAt,
      id: newer.billId,
    });
    const mine = afterCursor.filter((item) =>
      testBillIds().includes(item.billId)
    );
    expect(mine.map((item) => item.billId)).toEqual([
      publishedBillWithoutStanceId,
    ]);
  });

  it("詳細は本文を含めて返し、難易度で内容が切り替わる", async () => {
    const normal = await getOpenDataBillDetail({
      billId: publishedBillId,
      difficulty: "normal",
    });
    expect(normal?.content).toBe("ふつう本文");

    const hard = await getOpenDataBillDetail({
      billId: publishedBillId,
      difficulty: "hard",
    });
    expect(hard?.content).toBe("難しい本文");
  });

  it("非公開の施策・指定難易度のコンテンツがない施策の詳細は null", async () => {
    expect(
      await getOpenDataBillDetail({ billId: draftBillId, difficulty: "normal" })
    ).toBeNull();
    expect(
      await getOpenDataBillDetail({
        billId: publishedBillWithoutStanceId,
        difficulty: "hard",
      })
    ).toBeNull();
  });
});
