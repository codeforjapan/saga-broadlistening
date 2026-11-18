import { describe, expect, it } from "vitest";
import { resolveAwsCredentialMode } from "./credential-mode";

describe("AWS credential selection", () => {
  it.each([
    {},
    { AWS_PROFILE: "sso" },
    { AWS_ROLE_ARN: "arn:local" },
    { AWS_CONTAINER_CREDENTIALS_RELATIVE_URI: "/credentials" },
    { VERCEL_ENV: "development", AWS_ROLE_ARN: "arn:local" },
  ])("uses the SDK chain outside Vercel deployment: %j", (env) => {
    expect(resolveAwsCredentialMode(env)).toEqual({ type: "chain" });
  });
  it.each([
    { VERCEL_ENV: "production" },
    { VERCEL_ENV: "preview" },
    { VERCEL: "1" },
  ])("requires a role on Vercel: %j", (env) => {
    expect(() => resolveAwsCredentialMode(env)).toThrow(/AWS_ROLE_ARN/);
    expect(
      resolveAwsCredentialMode({ ...env, AWS_ROLE_ARN: "arn:vercel" })
    ).toEqual({
      type: "vercel",
      roleArn: "arn:vercel",
      audience: "sts.amazonaws.com",
    });
  });
});
