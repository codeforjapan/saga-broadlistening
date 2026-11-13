import "server-only";
import { registerNodeTelemetry as registerSharedTelemetry } from "@mirai-gikai/shared/telemetry/register";
import { env } from "@/lib/env";

export {
  flushTelemetry,
  getLangfuseSpanProcessor,
} from "@mirai-gikai/shared/telemetry/register";

export async function registerNodeTelemetry() {
  await registerSharedTelemetry({
    ...env.langfuse,
    environment: process.env.VERCEL_ENV || "development",
  });
}
