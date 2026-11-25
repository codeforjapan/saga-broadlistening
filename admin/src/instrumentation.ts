export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { registerNodeTelemetry } = await import("./lib/telemetry/register");
    await registerNodeTelemetry();
  }
}
