import { BOUNDED_FUNDING_PROVIDER, createBoundedFundingRequest, createMvpRefreshClientFromEnvironment, MvpRefreshStore } from "@/lib/data-platform/mvp-refresh"

type Command = "inspect" | "plan" | "preflight" | "acquire" | "normalize" | "commit" | "verify" | "run" | "resume" | "status"

function option(name: string): string {
  const index = process.argv.indexOf(`--${name}`)
  const value = index >= 0 ? process.argv[index + 1] : undefined
  if (!value || value.startsWith("--")) throw new Error(`BOUNDED_FUNDING_${name.toUpperCase()}_REQUIRED`)
  return value
}

function boundedRequest() {
  return createBoundedFundingRequest({ provider: option("provider") as typeof BOUNDED_FUNDING_PROVIDER, instrument: option("instrument") as "BTCUSDT", eventTimeStart: option("start"), eventTimeEnd: option("end"), maximumEventCount: 1_000, requestedAt: new Date().toISOString() })
}

async function main() {
  const command = process.argv[2] as Command
  if (!["inspect", "plan", "preflight", "acquire", "normalize", "commit", "verify", "run", "resume", "status"].includes(command)) throw new Error("BOUNDED_FUNDING_COMMAND_INVALID")
  const request = boundedRequest()
  if (["inspect", "plan", "preflight"].includes(command)) return print({ command, status: "READY", requestIdentity: request.requestIdentity, provider: request.provider, instrument: request.instrument, start: request.eventTimeStart, end: request.eventTimeEnd, bounded: true, productionMutation: false })
  if (command === "status") {
    const client = createMvpRefreshClientFromEnvironment()
    try { return print({ command, requestIdentity: request.requestIdentity, controlPlane: await new MvpRefreshStore(client).status(), productionMutation: false }) } finally { await client.shutdown() }
  }
  return print({ command, status: "BLOCKED", requestIdentity: request.requestIdentity, reason: "BOUNDED_CANONICAL_RUNTIME_PORTS_REQUIRED", productionMutation: false })
}

function print(value: unknown) { console.log(JSON.stringify(value, null, 2)) }
void main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : "BOUNDED_FUNDING_COMMAND_FAILED"); process.exitCode = 1 })
