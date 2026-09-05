import { describe, expect, it } from "vitest";
import { resolveEnvConfig } from "./index";

describe("resolveEnvConfig", () => {
  it("dev環境の設定を返す", () => {
    const config = resolveEnvConfig("dev");

    expect(config.envName).toBe("dev");
    expect(config.account).toBe("826784631888");
    expect(config.region).toBe("ap-northeast-1");
    expect(config.trustedBranch).toBe("develop");
    expect(config.trustedGithubEnvironment).toBe("staging");
  });

  it("prd環境の設定を返す", () => {
    const config = resolveEnvConfig("prd");

    expect(config.envName).toBe("prd");
    expect(config.account).toBe("085350497655");
    expect(config.region).toBe("ap-northeast-1");
    expect(config.trustedBranch).toBe("main");
    expect(config.trustedGithubEnvironment).toBe("production");
  });

  it("未知の環境名の場合はエラーを投げる", () => {
    expect(() => resolveEnvConfig("unknown")).toThrow(
      /Unknown environment/
    );
  });
});
