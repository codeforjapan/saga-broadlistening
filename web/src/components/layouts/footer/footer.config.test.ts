import { describe, expect, it } from "vitest";
import { routes } from "@/lib/routes";
import { policyLinks, primaryLinks } from "./footer.config";

describe("footer.config", () => {
  it("policyLinks に規約ページと開発者向けページへの内部リンクが含まれる", () => {
    const hrefs = policyLinks.map((link) => link.href);

    expect(hrefs).toContain(routes.terms());
    expect(hrefs).toContain(routes.privacy());
    expect(hrefs).toContain(routes.developers());
  });

  it("すべてのリンクが内部ルートを指す", () => {
    const internalHrefs = new Set<string>([
      routes.home(),
      routes.terms(),
      routes.privacy(),
      routes.developers(),
    ]);

    for (const link of [...primaryLinks, ...policyLinks]) {
      expect(internalHrefs.has(link.href)).toBe(true);
    }
  });
});
