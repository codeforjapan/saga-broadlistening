type AwsCredentialMode =
  | { type: "chain" }
  | { type: "vercel"; roleArn: string; audience: "sts.amazonaws.com" };

/** Local SSO and ECS use the SDK chain, even if AWS_ROLE_ARN is present. */
export function resolveAwsCredentialMode(
  env: Record<string, string | undefined>
): AwsCredentialMode {
  const isVercelDeployment =
    env.VERCEL_ENV !== "development" &&
    (env.VERCEL === "1" || Boolean(env.VERCEL_ENV));
  if (!isVercelDeployment) return { type: "chain" };
  const roleArn = env.AWS_ROLE_ARN?.trim();
  if (!roleArn)
    throw new Error("AWS_ROLE_ARN is required for AWS credentials on Vercel");
  return { type: "vercel", roleArn, audience: "sts.amazonaws.com" };
}
