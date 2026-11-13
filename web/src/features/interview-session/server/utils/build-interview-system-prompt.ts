import "server-only";

export {
  buildPublishedInterviewPrompt as buildInterviewSystemPrompt,
  buildPublishedSummaryPrompt as buildSummarySystemPrompt,
  loadPublishedInterviewPromptParts as loadInterviewPromptParts,
} from "@mirai-gikai/shared/interview-prompts/published";
