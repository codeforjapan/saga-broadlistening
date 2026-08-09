import {
  BedrockRuntimeClient,
  ConverseCommand,
} from "@aws-sdk/client-bedrock-runtime";
import { buildHealthCheckConverseInput } from "./build-converse-input";
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

  const response = await client.send(
    new ConverseCommand(buildHealthCheckConverseInput(modelId))
  );

  const reply = extractReplyText(response.output?.message?.content?.[0]);

  return {
    statusCode: 200,
    body: JSON.stringify({ ok: true, modelId, reply }),
  };
};
