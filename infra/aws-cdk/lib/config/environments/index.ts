import type { EnvConfig, EnvName } from "../types";
import { prdConfig } from "./prd";
import { stgConfig } from "./stg";

const environments: Record<EnvName, EnvConfig> = {
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

  return environments[envName];
}
