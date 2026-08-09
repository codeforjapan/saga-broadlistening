import type { EnvConfig, EnvName } from "../types";
import { devConfig } from "./dev";
import { prdConfig } from "./prd";
import { stgConfig, UNCONFIGURED_ACCOUNT_ID } from "./stg";

const environments: Record<EnvName, EnvConfig> = {
  dev: devConfig,
  stg: stgConfig,
  prd: prdConfig,
};

function isEnvName(value: string): value is EnvName {
  return value in environments;
}

export function resolveEnvConfig(envName: string): EnvConfig {
  if (!isEnvName(envName)) {
    const validNames = Object.keys(environments).join(", ");
    throw new Error(
      `Unknown environment: "${envName}". Expected one of: ${validNames}.`
    );
  }

  const config = environments[envName];
  if (config.account === UNCONFIGURED_ACCOUNT_ID) {
    throw new Error(
      `AWS account for environment "${envName}" is not configured yet. ` +
        `Update lib/config/environments/${envName}.ts with the real account ID before deploying.`
    );
  }

  return config;
}
