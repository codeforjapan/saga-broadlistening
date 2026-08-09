import { describe, expect, it } from "vitest";
import { resolveEnvConfig } from "./index";

describe("resolveEnvConfig", () => {
  it("dev環境の設定を返す", () => {
    const config = resolveEnvConfig("dev");

    expect(config.envName).toBe("dev");
    expect(config.account).toBe("826784631888");
    expect(config.region).toBe("ap-northeast-1");
  });

  it("stg環境はAWSアカウントが未設定のためエラーを投げる", () => {
    expect(() => resolveEnvConfig("stg")).toThrow(/not configured/);
  });

  it("prd環境の設定を返す", () => {
    const config = resolveEnvConfig("prd");

    expect(config.envName).toBe("prd");
    expect(config.account).toBe("085350497655");
    expect(config.region).toBe("ap-northeast-1");
  });

  it("未知の環境名の場合はエラーを投げる", () => {
    expect(() => resolveEnvConfig("unknown")).toThrow(
      /Unknown environment/
    );
  });
});
