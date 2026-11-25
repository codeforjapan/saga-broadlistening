import { getAiModel } from "@mirai-gikai/shared/ai/registry";
import { generateText } from "ai";

const selection = getAiModel("default");
const result = await generateText({
  ...selection,
  prompt: "Reply with OK only.",
  maxOutputTokens: 256,
  maxRetries: 0,
});
console.log(
  JSON.stringify(
    {
      model: selection.modelId,
      text: result.text,
      usage: result.usage,
    },
    null,
    2
  )
);
