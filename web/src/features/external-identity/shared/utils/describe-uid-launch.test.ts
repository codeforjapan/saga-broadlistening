import { describe, expect, it } from "vitest";
import {
  describeUidLaunch,
  isUidLaunchDebugHost,
  toUidShape,
} from "./describe-uid-launch";

describe("isUidLaunchDebugHost", () => {
  it("develop ブランチのデプロイだけ true", () => {
    expect(
      isUidLaunchDebugHost("saga-kocho-web-git-develop-c4j.vercel.app")
    ).toBe(true);
    expect(isUidLaunchDebugHost("saga-kocho-web.vercel.app")).toBe(false);
    expect(isUidLaunchDebugHost("saga-kocho-web-git-main-c4j.vercel.app")).toBe(
      false
    );
    expect(isUidLaunchDebugHost("localhost")).toBe(false);
  });
});

describe("toUidShape", () => {
  it("英字を a、数字を 0、空白を ␣ にして記号は残す", () => {
    expect(toUidShape("yuji.ym+saga@710.gs")).toBe("aaaa.aa+aaaa@000.aa");
    expect(toUidShape("a b")).toBe("a␣a");
  });

  it("長い値は 64 文字で切る", () => {
    expect(toUidShape("x".repeat(70))).toBe(`${"a".repeat(64)}…`);
  });
});

describe("describeUidLaunch", () => {
  it("形式チェックを通る #uid= は valid", () => {
    expect(describeUidLaunch("#uid=test-webview-1", "")).toEqual({
      hashKeys: ["uid"],
      searchKeys: [],
      uid: { length: 14, shape: "aaaa-aaaaaaa-0", valid: true },
    });
  });

  it("メールアドレス形式の #uid= は形だけ返して invalid", () => {
    expect(describeUidLaunch("#uid=yuji.ym%2Bsaga@710.gs", "").uid).toEqual({
      length: 19,
      shape: "aaaa.aa+aaaa@000.aa",
      valid: false,
    });
  });

  it("エンコードされていない + は空白になる", () => {
    expect(describeUidLaunch("#uid=a+b", "").uid?.shape).toBe("a␣a");
  });

  it("?uid= で渡された場合も形を返すが、受け取れないので invalid", () => {
    expect(describeUidLaunch("", "?uid=abc&x=1")).toEqual({
      hashKeys: [],
      searchKeys: ["uid", "x"],
      uid: { length: 3, shape: "aaa", valid: false },
    });
  });

  it("UID がなければ uid は null", () => {
    expect(describeUidLaunch("", "")).toEqual({
      hashKeys: [],
      searchKeys: [],
      uid: null,
    });
    expect(describeUidLaunch("#chat-log", "").uid).toBeNull();
  });
});
