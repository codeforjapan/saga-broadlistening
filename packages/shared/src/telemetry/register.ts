import "server-only";
import { LangfuseSpanProcessor } from "@langfuse/otel";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";

declare global {
  var __miraiGikaiLangfuseSpanProcessor: LangfuseSpanProcessor | undefined;
}

export function getLangfuseSpanProcessor() {
  return globalThis.__miraiGikaiLangfuseSpanProcessor;
}

export async function registerNodeTelemetry(config: {
  publicKey?: string;
  secretKey?: string;
  baseUrl?: string;
  environment?: string;
}) {
  if (getLangfuseSpanProcessor()) return;

  if (!config.publicKey || !config.secretKey) {
    console.warn(
      "[Telemetry] Langfuse credentials not configured. Telemetry disabled."
    );
    return;
  }

  try {
    const processor = new LangfuseSpanProcessor({
      ...config,
      additionalHeaders: { "x-langfuse-ingestion-version": "4" },
    });
    const provider = new NodeTracerProvider({ spanProcessors: [processor] });
    provider.register();
    globalThis.__miraiGikaiLangfuseSpanProcessor = processor;
  } catch (error) {
    console.error("[Telemetry] Failed to initialize Langfuse:", error);
  }
}

export async function flushTelemetry() {
  try {
    await getLangfuseSpanProcessor()?.forceFlush();
  } catch (error) {
    console.error("[Telemetry] Failed to flush Langfuse:", error);
  }
}
