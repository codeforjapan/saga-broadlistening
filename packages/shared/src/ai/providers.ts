import "server-only";
import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { createGateway } from "ai";
import { getAwsCredentials } from "../aws/credentials";
import type { AiConfig, AiEnvironment, AiProvider } from "./config";
import type { AiProviderInstance } from "./utils/model-resolver";

export function createAiProvider(
  provider: AiProvider,
  config: AiConfig,
  env: AiEnvironment
): AiProviderInstance {
  switch (provider) {
    case "bedrock":
      return createAmazonBedrock({
        region: config.awsRegion,
        credentialProvider: getAwsCredentials(),
      });
    case "gateway":
      return createGateway({ apiKey: env.AI_GATEWAY_API_KEY });
    case "openai":
      return createOpenAI({ apiKey: env.OPENAI_API_KEY });
    case "google":
      return createGoogleGenerativeAI({
        apiKey: env.GOOGLE_GENERATIVE_AI_API_KEY,
      });
  }
}
