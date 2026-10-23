import { describe, expect, it, vi } from "vitest";
import { createAwsCredentialsGetter } from "./credentials-getter";

const credentials = { accessKeyId: "test", secretAccessKey: "test" };
const vercelEnv = { VERCEL_ENV: "production", AWS_ROLE_ARN: "arn:first" };

describe("shared AWS credential lifetime", () => {
  it("retains the SDK chain for repeated model resolutions but reflects env changes", () => {
    const env: Record<string, string | undefined> = { AWS_PROFILE: "first" };
    const fromChain = vi.fn(() => async () => credentials);
    const get = createAwsCredentialsGetter({
      readEnv: () => env,
      fromChain,
      fromVercel: () => async () => credentials,
    });
    const first = get();
    expect(get()).toBe(first);
    expect(fromChain).toHaveBeenCalledOnce();
    env.AWS_PROFILE = "second";
    expect(get()).not.toBe(first);
    expect(fromChain).toHaveBeenCalledTimes(2);
    delete env.AWS_PROFILE;
    get();
    expect(fromChain).toHaveBeenCalledTimes(3);
  });
  it("recreates Vercel credentials on role changes and still rejects missing roles", () => {
    const env: Record<string, string | undefined> = { ...vercelEnv };
    const fromVercel = vi.fn(() => async () => credentials);
    const get = createAwsCredentialsGetter({
      readEnv: () => env,
      fromChain: () => async () => credentials,
      fromVercel,
    });
    const first = get();
    env.AWS_ROLE_ARN = "arn:second";
    expect(get()).not.toBe(first);
    expect(fromVercel).toHaveBeenLastCalledWith({
      roleArn: "arn:second",
      audience: "sts.amazonaws.com",
    });
    delete env.AWS_ROLE_ARN;
    expect(() => get()).toThrow(/AWS_ROLE_ARN/);
  });
  it("deduplicates concurrent STS requests, caches valid credentials and refreshes before expiry", async () => {
    let now = 0;
    const load = vi.fn(async () => ({
      ...credentials,
      expiration: new Date(now + 60 * 60_000),
    }));
    const get = createAwsCredentialsGetter({
      readEnv: () => vercelEnv,
      fromChain: () => load,
      fromVercel: () => load,
      now: () => now,
    });
    const provider = get();
    const [first, concurrent] = await Promise.all([provider(), get()()]);
    expect(first).toBe(concurrent);
    expect(load).toHaveBeenCalledOnce();
    now = 54 * 60_000;
    expect(await get()()).toBe(first);
    expect(load).toHaveBeenCalledOnce();
    now = 55 * 60_000;
    const refreshed = await get()();
    expect(refreshed).not.toBe(first);
    expect(load).toHaveBeenCalledTimes(2);
    await provider({ forceRefresh: true });
    expect(load).toHaveBeenCalledTimes(3);
  });
  it("retries failed credential requests", async () => {
    const load = vi
      .fn()
      .mockRejectedValueOnce(new Error("STS unavailable"))
      .mockResolvedValue({ ...credentials, expiration: new Date(60 * 60_000) });
    const get = createAwsCredentialsGetter({
      readEnv: () => vercelEnv,
      fromChain: () => load,
      fromVercel: () => load,
      now: () => 0,
    });
    await expect(get()()).rejects.toThrow("STS unavailable");
    await expect(get()()).resolves.toMatchObject(credentials);
    expect(load).toHaveBeenCalledTimes(2);
  });
  it("does not cache credentials whose expiration is unknown", async () => {
    const load = vi.fn(async () => credentials);
    const get = createAwsCredentialsGetter({
      readEnv: () => vercelEnv,
      fromChain: () => load,
      fromVercel: () => load,
    });
    await get()();
    await get()();
    expect(load).toHaveBeenCalledTimes(2);
  });
});
