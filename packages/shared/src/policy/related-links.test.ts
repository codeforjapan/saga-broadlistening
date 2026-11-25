import { describe, expect, it } from "vitest";
import {
  MAX_RELATED_LINKS,
  parseRelatedLinks,
  RELATED_LINK_KIND_LABELS,
  relatedLinksSchema,
} from "./related-links";

const cityHpLink = {
  label: "佐賀市：奨学金返還支援",
  url: "https://www.city.saga.lg.jp/kurashi/sumai/1/716.html",
  kind: "city_hp",
};

describe("relatedLinksSchema", () => {
  it("施策詳細ページと佐賀市HPの2種別を受け付ける", () => {
    const result = relatedLinksSchema.safeParse([
      cityHpLink,
      {
        label: "奨学金返還支援制度の詳細",
        url: "https://example.jp/detail",
        kind: "policy_detail",
      },
    ]);
    expect(result.success).toBe(true);
  });

  it("空配列を受け付ける", () => {
    expect(relatedLinksSchema.safeParse([]).success).toBe(true);
  });

  it("http(s) 以外のURLを拒否する", () => {
    for (const url of ["javascript:alert(1)", "ftp://example.jp", "example"]) {
      const result = relatedLinksSchema.safeParse([{ ...cityHpLink, url }]);
      expect(result.success, url).toBe(false);
    }
  });

  it("表示名が空・未知の種別を拒否する", () => {
    expect(
      relatedLinksSchema.safeParse([{ ...cityHpLink, label: " " }]).success
    ).toBe(false);
    expect(
      relatedLinksSchema.safeParse([{ ...cityHpLink, kind: "other" }]).success
    ).toBe(false);
  });

  it("上限件数を超えると拒否する", () => {
    const links = Array.from({ length: MAX_RELATED_LINKS + 1 }, () => ({
      ...cityHpLink,
    }));
    expect(relatedLinksSchema.safeParse(links).success).toBe(false);
  });
});

describe("parseRelatedLinks", () => {
  it("形の合わない要素だけを捨て、順序を保つ", () => {
    const second = { ...cityHpLink, label: "2件目" };
    expect(
      parseRelatedLinks([cityHpLink, { label: "壊れた要素" }, second])
    ).toEqual([cityHpLink, second]);
  });

  it("配列でない値は空配列にする", () => {
    expect(parseRelatedLinks(null)).toEqual([]);
    expect(parseRelatedLinks({})).toEqual([]);
  });
});

describe("RELATED_LINK_KIND_LABELS", () => {
  it("種別キーを画面の表示名に対応づける", () => {
    expect(RELATED_LINK_KIND_LABELS.policy_detail).toBe("施策詳細ページ");
    expect(RELATED_LINK_KIND_LABELS.city_hp).toBe("佐賀市HP");
  });
});
