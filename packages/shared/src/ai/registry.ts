import "server-only";
import { createAiProvider } from "./providers";
import { createAiModelResolver } from "./utils/model-resolver";

export type { AiModelPurpose } from "./config";
export type { ResolvedAiModel } from "./utils/model-resolver";
export const getAiModel = createAiModelResolver({
  readEnv: () => process.env,
  createProvider: createAiProvider,
});
