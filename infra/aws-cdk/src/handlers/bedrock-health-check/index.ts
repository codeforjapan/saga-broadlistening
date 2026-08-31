import {
  BedrockRuntimeClient,
  ConverseCommand,
} from "@aws-sdk/client-bedrock-runtime";
import {
  buildHealthCheckConverseInput,
  resolveGuardrailOptions,
} from "./build-converse-input";
import { extractReplyText } from "./extract-reply-text";

const client = new BedrockRuntimeClient({});

export const handler = async (): Promise<{
  statusCode: number;
  body: string;
}> => {
  const modelId = process.env.BEDROCK_MODEL_ID;
  if (!modelId) {
    throw new Error("BEDROCK_MODEL_ID environment variable is not set");
  }

  const guardrail = resolveGuardrailOptions(
    process.env.BEDROCK_GUARDRAIL_ID,
    process.env.BEDROCK_GUARDRAIL_VERSION
  );

  const response = await client.send(
    new ConverseCommand(buildHealthCheckConverseInput(modelId, guardrail))
  );

  const reply = extractReplyText(response.output?.message?.content?.[0]);

  return {
    statusCode: 200,
    body: JSON.stringify({ ok: true, modelId, reply }),
  };
};
