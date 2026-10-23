import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ExternalIdentityGuideNotice } from "./external-identity-guide-notice";

function renderGuide(guideUrl: string | null) {
  return renderToStaticMarkup(
    createElement(ExternalIdentityGuideNotice, {
      participation: {
        kind: "guide",
        themeName: "若者支援",
        providers: [
          {
            key: "saga_super_app",
            displayName: "佐賀市スーパーアプリ",
            guideUrl,
          },
        ],
      },
    })
  );
}

describe("ExternalIdentityGuideNotice", () => {
  it("URL未設定でも対象テーマと手動でアプリを開く方法を示す", () => {
    const html = renderGuide(null);
    expect(html).toContain("若者支援");
    expect(html).toContain("佐賀市スーパーアプリを手動で開き");
    expect(html).not.toContain("<a ");
    expect(html).not.toContain("回答方法を見る");
  });

  it("設定された市HPの案内へ安全な外部リンクを表示する", () => {
    const html = renderGuide("https://www.city.saga.lg.jp/guide");
    expect(html).toContain('href="https://www.city.saga.lg.jp/guide"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain("回答方法を見る");
  });
});
