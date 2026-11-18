import "server-only";
import {
  flushTelemetry,
  getLangfuseSpanProcessor,
  registerNodeTelemetry as registerSharedTelemetry,
} from "@mirai-gikai/shared/telemetry/register";
import { after } from "next/server";
import { env } from "@/lib/env";

export { flushTelemetry, getLangfuseSpanProcessor };

export async function registerNodeTelemetry() {
  await registerSharedTelemetry({
    ...env.langfuse,
    environment: process.env.VERCEL_ENV || "development",
  });
}

/**
 * LLM を呼ぶリクエスト（API ルート・ページの描画）のトレース準備。
 * Vercel では instrumentation が自動で起動しないことがあるので明示的に登録し、
 * ためたトレースを応答後に送る（送らないまま関数が止まると消える）。
 * リクエストの中でしか呼べない（after の制約）
 */
export async function setupRequestTelemetry() {
  after(flushTelemetry);
  await registerNodeTelemetry();
}
