import "server-only";
import { LangfuseClient } from "@langfuse/client";
import { env } from "@/lib/env";

let langfuseClient: LangfuseClient | null = null;

export function getLangfuseClient(): LangfuseClient {
  if (!langfuseClient) {
    const { publicKey, secretKey, baseUrl } = env.langfuse;

    if (!publicKey || !secretKey) {
      throw new Error(
        "Langfuse credentials not configured. Set LANGFUSE_PUBLIC_KEY and LANGFUSE_SECRET_KEY"
      );
    }

    langfuseClient = new LangfuseClient({
      publicKey,
      secretKey,
      baseUrl,
    });
  }

  return langfuseClient;
}
