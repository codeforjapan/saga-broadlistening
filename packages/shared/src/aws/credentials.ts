import "server-only";
import { fromNodeProviderChain } from "@aws-sdk/credential-providers";
import { awsCredentialsProvider } from "@vercel/oidc-aws-credentials-provider";
import { createAwsCredentialsGetter } from "./utils/credentials-getter";

export const getAwsCredentials = createAwsCredentialsGetter({
  readEnv: () => process.env,
  fromChain: fromNodeProviderChain,
  fromVercel: awsCredentialsProvider,
});
