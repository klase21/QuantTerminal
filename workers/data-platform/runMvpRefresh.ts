import { createMvpRefreshClientFromEnvironment, inspectMvpRefreshConnectionFromEnvironment, MvpRefreshMigrationRunner, MvpRefreshStore, MVP_REFRESH_SOURCE_AUDIT, planNextMvpRefresh, preflightMvpRefreshClientFromEnvironment, runInitialBoundedRefresh } from "@/lib/data-platform/mvp-refresh"

type Command = "inspect-connection" | "preflight" | "migrate" | "plan" | "availability" | "run" | "resume" | "verify" | "build-candidate" | "compare" | "manifest" | "status" | "reset-isolated"

async function withClient<T>(work: (client: ReturnType<typeof createMvpRefreshClientFromEnvironment>) => Promise<T>): Promise<T> {
  const client = createMvpRefreshClientFromEnvironment()
  await client.verify()
  try { return await work(client) } finally { await client.shutdown() }
}

async function migrate() {
  return withClient(async (client) => {
    const result = await new MvpRefreshMigrationRunner(client).apply("mvp-8a-refresh-foundation")
    if (result.some((entry) => entry.status === "FAILED")) throw new Error("MVP_REFRESH_MIGRATION_FAILED")
    return result
  })
}

async function status() { return withClient(async (client) => new MvpRefreshStore(client).status()) }

async function reset() {
  if (process.argv[3] !== "--confirm-isolated") throw new Error("MVP_REFRESH_RESET_CONFIRMATION_REQUIRED")
  return withClient(async (client) => {
    await client.sql.unsafe("DROP SCHEMA IF EXISTS refresh_control CASCADE")
    return { status: "RESET", database: "quantterminal_mvp_refresh_isolated" }
  })
}

async function main() {
  const command = process.argv[2] as Command
  if (command === "inspect-connection") return print({ command, result: inspectMvpRefreshConnectionFromEnvironment() })
  if (command === "preflight") return print({ command, result: await preflightMvpRefreshClientFromEnvironment() })
  if (command === "migrate") return print({ command, result: await migrate() })
  if (command === "plan") return print({ command, plan: planNextMvpRefresh() ?? { status: "NOOP", reason: "NO_CLOSED_WINDOW_AVAILABLE" } })
  if (command === "availability") return print({ command, sources: MVP_REFRESH_SOURCE_AUDIT, safeToAcquire: false, blockerReasonCodes: ["SOURCE_AVAILABILITY_INSPECTION_REQUIRED"] })
  if (command === "run") { await migrate(); return print({ command, result: await withClient((client) => runInitialBoundedRefresh(client)) }) }
  if (command === "resume") return print({ command, status: "BLOCKED", reason: "TERMINAL_BLOCKED_RUN_REQUIRES_NEW_PLAN" })
  if (command === "verify") return print({ command, status: "VERIFIED", controlPlane: await status(), productionMutation: false })
  if (["build-candidate", "compare", "manifest"].includes(command)) return print({ command, status: "BLOCKED", reasons: ["SOURCE_AVAILABILITY_INSPECTION_REQUIRED"], candidateActivation: false })
  if (command === "status") return print({ command, result: await status() })
  if (command === "reset-isolated") return print({ command, result: await reset() })
  throw new Error("Usage: runMvpRefresh.ts <inspect-connection|preflight|migrate|plan|availability|run|resume|verify|build-candidate|compare|manifest|status|reset-isolated --confirm-isolated>")
}

function print(value: unknown): void { console.log(JSON.stringify(value, null, 2)) }
void main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : "MVP_REFRESH_COMMAND_FAILED"); process.exitCode = 1 })
