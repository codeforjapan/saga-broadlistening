export type EnvName = "dev" | "stg" | "prd";

export interface EnvConfig {
  readonly envName: EnvName;
  readonly account: string;
  readonly region: string;
  readonly bedrockModelId: string;
}
