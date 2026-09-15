import type { fromNodeProviderChain } from "@aws-sdk/credential-providers";
import { resolveAwsCredentialMode } from "./credential-mode";

type CredentialProvider = ReturnType<typeof fromNodeProviderChain>;
type Credentials = Awaited<ReturnType<CredentialProvider>>;
type Environment = Record<string, string | undefined>;

interface CredentialDependencies {
  readEnv: () => Environment;
  fromChain: () => CredentialProvider;
  fromVercel: (options: {
    roleArn: string;
    audience: "sts.amazonaws.com";
  }) => CredentialProvider;
  now?: () => number;
}

// Vercel's provider exchanges with STS on each call; Bedrock does not memoize it.
function cacheVercelCredentials(
  provider: CredentialProvider,
  now: () => number
): CredentialProvider {
  let credentials: Credentials | undefined;
  let pending: Promise<Credentials> | undefined;
  return async (options) => {
    if (pending) return pending;
    if (
      !options?.forceRefresh &&
      credentials?.expiration &&
      credentials.expiration.getTime() - now() > 5 * 60_000
    ) {
      return credentials;
    }
    pending = Promise.resolve()
      .then(() => provider(options))
      .then((value) => {
        credentials = value;
        return value;
      })
      .finally(() => {
        pending = undefined;
      });
    return pending;
  };
}

/** Retain the SDK's refresh cache, rebuilding it whenever environment changes. */
export function createAwsCredentialsGetter({
  readEnv,
  fromChain,
  fromVercel,
  now = Date.now,
}: CredentialDependencies): () => CredentialProvider {
  let cached: { env: Environment; provider: CredentialProvider } | undefined;
  return () => {
    const env = readEnv();
    const mode = resolveAwsCredentialMode(env);
    const entries = Object.entries(env);
    if (
      cached &&
      entries.length === Object.keys(cached.env).length &&
      entries.every(([key, value]) => cached?.env[key] === value)
    ) {
      return cached.provider;
    }
    const provider =
      mode.type === "chain"
        ? fromChain()
        : cacheVercelCredentials(
            fromVercel({ roleArn: mode.roleArn, audience: mode.audience }),
            now
          );
    cached = { env: { ...env }, provider };
    return provider;
  };
}
