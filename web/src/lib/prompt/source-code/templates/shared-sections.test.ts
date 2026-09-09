import { MUNICIPALITY_NAME, SITE_NAME } from "@mirai-gikai/branding/site";
import { describe, expect, it } from "vitest";
import { SERVICE_OVERVIEW } from "./shared-sections";

describe("SERVICE_OVERVIEW", () => {
  it("サービス名と運営自治体名をブランド定数から差し込む", () => {
    expect(SERVICE_OVERVIEW).toContain(SITE_NAME);
    expect(SERVICE_OVERVIEW).toContain(MUNICIPALITY_NAME);
  });

  // このブランチ（vanilla）最大のリスクは特定自治体名の取り残しなので、
  // プロンプトに直書きが再混入したらここで落とす
  it("特定の自治体名・旧ブランド名を直書きしていない", () => {
    expect(SERVICE_OVERVIEW).not.toMatch(/佐賀|CHIKAT|みらい議会/);
  });
});
