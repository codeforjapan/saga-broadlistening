import { randomUUID } from "node:crypto";
import { MIN_PUBLIC_OPINIONS_FOR_DISPLAY } from "@mirai-gikai/shared/report-publication/auto-publish";
import { afterEach, describe, expect, it } from "vitest";
import {
  getInitialPublicReportsByBillId,
  getPublicReportsByBillIdPaginated,
  PAGE_SIZE,
} from "./get-all-public-reports-by-bill-id";
import { getPublicReportById } from "./get-public-report-by-id";
import { getPublicReportsByBillId } from "./get-public-reports-by-bill-id";
import { getReportOgData } from "./get-report-og-data";
import { getReportWithMessages } from "./get-report-with-messages";
import {
  cleanupPublicReportLoaderContext,
  createPublicReport,
  createPublicReportLoaderContext,
  createPublicReports,
  type PublicReportLoaderContext,
} from "./public-report-loader.integration-test-utils";

describe("公開レポート loader 統合テスト", () => {
  let context: PublicReportLoaderContext | null = null;

  afterEach(async () => {
    await cleanupPublicReportLoaderContext(context);
    context = null;
  });

  it("公開済み件数が表示閾値未満なら施策詳細用レポートを返さない", async () => {
    context = await createPublicReportLoaderContext();
    await createPublicReports(context, MIN_PUBLIC_OPINIONS_FOR_DISPLAY - 1);

    await expect(getPublicReportsByBillId(context.billId)).resolves.toEqual({
      reports: [],
      totalCount: 0,
    });
  });

  it("公開済み件数が表示閾値以上なら施策詳細用に最大3件と総件数を返す", async () => {
    context = await createPublicReportLoaderContext();
    await createPublicReports(context, MIN_PUBLIC_OPINIONS_FOR_DISPLAY);

    const result = await getPublicReportsByBillId(context.billId);

    expect(result.totalCount).toBe(MIN_PUBLIC_OPINIONS_FOR_DISPLAY);
    expect(result.reports).toHaveLength(3);
  });

  it("初期ページは公開済み件数が表示閾値未満なら空を返す", async () => {
    context = await createPublicReportLoaderContext();
    await createPublicReports(context, MIN_PUBLIC_OPINIONS_FOR_DISPLAY - 1);

    await expect(
      getInitialPublicReportsByBillId(context.billId)
    ).resolves.toEqual({
      reports: [],
      totalCount: 0,
      hasMore: false,
    });
  });

  it("初期ページは総件数と新着順のレポートを返す", async () => {
    context = await createPublicReportLoaderContext();
    await createPublicReports(context, MIN_PUBLIC_OPINIONS_FOR_DISPLAY);

    const result = await getInitialPublicReportsByBillId(
      context.billId,
      "newest"
    );

    expect(result.totalCount).toBe(MIN_PUBLIC_OPINIONS_FOR_DISPLAY);
    expect(result.reports).toHaveLength(MIN_PUBLIC_OPINIONS_FOR_DISPLAY);
    expect(result.hasMore).toBe(false);
  });

  it("ページネーション loader は次ページを表示件数ゲート後に返す", async () => {
    context = await createPublicReportLoaderContext();
    await createPublicReports(context, PAGE_SIZE + 1);

    const result = await getPublicReportsByBillIdPaginated(
      context.billId,
      PAGE_SIZE,
      "newest"
    );

    expect(result.reports).toHaveLength(1);
    expect(result.hasMore).toBe(false);
  });

  it("公開直リンク loader は公開済み件数が表示閾値未満なら null を返す", async () => {
    context = await createPublicReportLoaderContext();
    const target = await createPublicReport(context);
    await createPublicReports(context, MIN_PUBLIC_OPINIONS_FOR_DISPLAY - 2);

    await expect(getPublicReportById(target.report.id)).resolves.toBeNull();
  });

  it("公開条件を満たさないレポートIDでは loader が null を返す（404扱い）", async () => {
    // 公開設定が削除された場合など、公開条件を満たすレポートが存在しないケース。
    // repository が PGRST116 で null を返し、各 loader はそれを null として扱う。
    const missingReportId = randomUUID();

    await expect(getPublicReportById(missingReportId)).resolves.toBeNull();
    await expect(getReportOgData(missingReportId)).resolves.toBeNull();
  });

  it("公開直リンク loader は表示可能なレポートとユーザー文字数を返す", async () => {
    context = await createPublicReportLoaderContext("統合テスト施策");
    const target = await createPublicReport(context, {
      messages: [
        { role: "user", content: "abc" },
        { role: "assistant", content: "ignored" },
        { role: "user", content: "de" },
      ],
    });
    await createPublicReports(context, MIN_PUBLIC_OPINIONS_FOR_DISPLAY - 1);

    const result = await getPublicReportById(target.report.id);

    expect(result?.bill_id).toBe(context.billId);
    expect(result?.bill.bill_content).toEqual({ title: "統合テスト施策" });
    expect(result?.characterCount).toBe(5);
  });

  it("OGP loader は公開済み件数ゲートを満たす場合だけデータを返す", async () => {
    context = await createPublicReportLoaderContext("OGP 施策");
    const target = await createPublicReport(context, { summary: "OGP 要約" });
    await createPublicReports(context, MIN_PUBLIC_OPINIONS_FOR_DISPLAY - 2);

    await expect(getReportOgData(target.report.id)).resolves.toBeNull();

    await createPublicReports(context, 1);

    await expect(getReportOgData(target.report.id)).resolves.toEqual({
      summary: "OGP 要約-1",
      billName: "OGP 施策",
    });
  });

  it("チャットログ loader は非所有者に公開済み件数ゲートを適用する", async () => {
    context = await createPublicReportLoaderContext("チャットログ施策");
    const target = await createPublicReport(context, {
      messages: [{ role: "user", content: "hello" }],
    });
    await createPublicReports(context, MIN_PUBLIC_OPINIONS_FOR_DISPLAY - 2);

    await expect(getReportWithMessages(target.report.id)).resolves.toBeNull();

    await createPublicReports(context, 1);

    const result = await getReportWithMessages(target.report.id);

    expect(result?.report.bill_id).toBe(context.billId);
    expect(result?.messages).toHaveLength(1);
    expect(result?.bill.bill_content).toEqual({ title: "チャットログ施策" });
  });
});
