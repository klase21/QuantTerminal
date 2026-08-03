import {
  bootstrapGreenCleanPostgres,
  preflightGreenCleanBootstrap,
  runGreenCleanOneDay,
  type GreenCleanBootstrapPorts,
} from "@/lib/data-platform/mvp-refresh/greenCleanBootstrapPostgres"
import {
  requireGreenCleanRebuildDatabaseSet,
  requireGreenCleanRunOneDayEnvironment,
  type GreenCleanRebuildDatabaseSet,
} from "@/lib/data-platform/mvp-refresh/greenCleanRebuildSafety"
import { createGreenCleanBootstrapRuntime } from "@/lib/data-platform/mvp-refresh/greenCleanBootstrapRuntime"
import {
  createGreenCleanOneDayReceiptContext,
  ensureGreenCleanOneDayFailureReceipt,
  sanitizeGreenCleanOneDayText,
} from "@/lib/data-platform/mvp-refresh/greenCleanOneDayReceipt"

export type MvpGreenCleanRebuildCommand = "bootstrap" | "preflight" | "run-one-day"

export function parseMvpGreenCleanRebuildCommand(argv: readonly string[]): MvpGreenCleanRebuildCommand {
  if (argv.length !== 1 || !["bootstrap", "preflight", "run-one-day"].includes(argv[0] ?? "")) {
    throw new Error("Usage: runMvpGreenCleanRebuild.ts <bootstrap|preflight|run-one-day>")
  }
  return argv[0] as MvpGreenCleanRebuildCommand
}

export async function executeMvpGreenCleanRebuildCommand(
  command: MvpGreenCleanRebuildCommand,
  databaseSet: GreenCleanRebuildDatabaseSet,
  ports: GreenCleanBootstrapPorts,
): Promise<unknown> {
  if (command === "bootstrap") return bootstrapGreenCleanPostgres(databaseSet, ports)
  if (command === "preflight") return preflightGreenCleanBootstrap(databaseSet, ports)
  return runGreenCleanOneDay(databaseSet, ports)
}

/**
 * The command surface is deliberately dependency-injected. The live port
 * composition must use the repository safety/client factories and official
 * acquisition publisher; wiring an unchecked generic PostgreSQL URL here
 * would bypass those protected boundaries.
 */
export async function runMvpGreenCleanRebuildWorker(
  argv: readonly string[],
  ports: GreenCleanBootstrapPorts,
  environment: Readonly<Record<string, string | undefined>> = process.env,
): Promise<unknown> {
  const databaseSet = requireGreenCleanRebuildDatabaseSet(environment)
  if (!databaseSet) throw new Error("MVP_GREEN_CLEAN_REBUILD_MODE_REQUIRED")
  return executeMvpGreenCleanRebuildCommand(parseMvpGreenCleanRebuildCommand(argv), databaseSet, ports)
}

async function main(): Promise<void> {
  const oneDayReceipt = process.argv.slice(2).length === 1 && process.argv[2] === "run-one-day"
    ? createGreenCleanOneDayReceiptContext({ cwd: process.cwd(), environment: process.env })
    : undefined
  let runtime: Awaited<ReturnType<typeof createGreenCleanBootstrapRuntime>> | null = null
  let output: unknown
  let failure: unknown
  try {
    if (oneDayReceipt) requireGreenCleanRunOneDayEnvironment(process.env)
    runtime = await createGreenCleanBootstrapRuntime(process.env, oneDayReceipt)
    const databaseSet = requireGreenCleanRebuildDatabaseSet(process.env)
    if (!databaseSet) throw new Error("MVP_GREEN_CLEAN_REBUILD_MODE_REQUIRED")
    const result = await executeMvpGreenCleanRebuildCommand(parseMvpGreenCleanRebuildCommand(process.argv.slice(2)), databaseSet, runtime.ports)
    output = { command: process.argv[2], targets: runtime.redactedTargets, result, ...(oneDayReceipt ? { receiptFilePath: oneDayReceipt.receiptFilePath } : {}) }
  } catch (error) {
    failure = error
  } finally {
    try { await runtime?.close() } catch (error) { failure ??= error }
  }
  if (failure) {
    if (oneDayReceipt) await ensureGreenCleanOneDayFailureReceipt(oneDayReceipt, failure)
    const message = sanitizeGreenCleanOneDayText(failure instanceof Error ? failure.message : "GREEN_CLEAN_REBUILD_FAILED", oneDayReceipt?.sensitiveValues ?? [])
    process.stderr.write(`${JSON.stringify({ status: "FAILED", error: message, ...(oneDayReceipt ? { receiptFilePath: oneDayReceipt.receiptFilePath } : {}) })}\n`)
    process.exitCode = 1
    return
  }
  process.stdout.write(`${JSON.stringify(output)}\n`)
}

if (process.argv[1]?.replaceAll("\\", "/").endsWith("/runMvpGreenCleanRebuild.ts")) {
  void main().catch((error: unknown) => {
    const message = sanitizeGreenCleanOneDayText(error instanceof Error ? error.message : "GREEN_CLEAN_REBUILD_FAILED")
    process.stderr.write(`${JSON.stringify({ status: "FAILED", error: message })}\n`)
    process.exitCode = 1
  })
}
