import { describe, expect, it } from "vitest";
import { toRelatedLinkViews } from "./related-links-view";

describe("toRelatedLinkViews", () => {
  it("種別の表示名とドメインを付け、元の順で返す", () => {
    expect(
      toRelatedLinkViews([
        {
          label: "奨学金返還支援制度の詳細",
          url: "https://example.jp/detail?x=1",
          kind: "policy_detail",
        },
        {
          label: "佐賀市：奨学金返還支援",
          url: "https://www.city.saga.lg.jp/kurashi/sumai/1/716.html",
          kind: "city_hp",
        },
      ])
    ).toEqual([
      {
        label: "奨学金返還支援制度の詳細",
        url: "https://example.jp/detail?x=1",
        kind: "policy_detail",
        kindLabel: "施策詳細ページ",
        domain: "example.jp",
      },
      {
        label: "佐賀市：奨学金返還支援",
        url: "https://www.city.saga.lg.jp/kurashi/sumai/1/716.html",
        kind: "city_hp",
        kindLabel: "佐賀市HP",
        domain: "www.city.saga.lg.jp",
      },
    ]);
  });

  it("空・不正な値なら空配列", () => {
    expect(toRelatedLinkViews([])).toEqual([]);
    expect(toRelatedLinkViews(null)).toEqual([]);
    expect(
      toRelatedLinkViews([
        { label: "x", url: "javascript:alert(1)", kind: "city_hp" },
      ])
    ).toEqual([]);
  });
});
