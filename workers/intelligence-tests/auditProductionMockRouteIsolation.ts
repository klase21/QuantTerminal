import { readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = process.cwd()
const GUARD_FILE = "lib/runtime/nonProductionRouteIsolation.ts"
const GUARD_IMPORT = "@/lib/runtime/nonProductionRouteIsolation"
const GUARD_CALL = "enforceNonProductionRouteIsolation(request)"

const PROTECTED_ROUTES = [
  "app/api/historical-intelligence/external-adapters/preview/route.ts",
  "app/api/historical-intelligence/external-review/enqueue/route.ts",
  "app/api/historical-intelligence/ingestion/mock-event/route.ts",
  "app/api/historical-intelligence/market-memory/route.ts",
  "app/api/historical-intelligence/persistence/decisions/route.ts",
  "app/api/historical-intelligence/persistence/events/route.ts",
  "app/api/historical-intelligence/persistence/memories/route.ts",
  "app/api/historical-intelligence/persistence/outcomes/route.ts",
  "app/api/historical-intelligence/persistence/playbooks/route.ts",
  "app/api/historical-intelligence/persistence/replay-cases/route.ts",
  "app/api/replay/route.ts",
] as const

async function sourceFor(relativePath: string) {
  return readFile(path.join(ROOT, relativePath), "utf8")
}

export async function auditProductionMockRouteIsolation() {
  const failures: string[] = []
  const guardSource = await sourceFor(GUARD_FILE)
  const productionCheck = guardSource.indexOf('process.env.NODE_ENV === "production"')
  const optInCheck = guardSource.indexOf("hasExplicitOptIn(request)")

  if (productionCheck < 0 || optInCheck < 0 || productionCheck > optInCheck) {
    failures.push("The production denial must run before any explicit opt-in check.")
  }
  if (!guardSource.includes('unavailableResponse("This route is disabled.", 404)')) {
    failures.push("Production access does not fail closed with HTTP 404.")
  }
  if (!guardSource.includes('status: "UNAVAILABLE"')) {
    failures.push("Isolation responses do not use the canonical UNAVAILABLE status.")
  }
  if (!guardSource.includes('"Cache-Control": "no-store"')) {
    failures.push("Isolation responses are not protected from caching.")
  }
  if (!guardSource.includes('"x-quantterminal-non-production-route"')
    || !guardSource.includes('"nonProductionRoute"')) {
    failures.push("Explicit header and query opt-in mechanisms are not both present.")
  }
  if (/process\.env\.(?!NODE_ENV)/.test(guardSource)
    || /(?:secret|api[_-]?key|access[_-]?token)/i.test(guardSource)) {
    failures.push("The isolation guard may expose or inspect sensitive environment details.")
  }

  const routes = await Promise.all(PROTECTED_ROUTES.map(async (relativePath) => {
    const source = await sourceFor(relativePath)
    const imported = source.includes(GUARD_IMPORT)
    const gated = source.includes(GUARD_CALL)

    if (!imported) failures.push(`${relativePath}: isolation guard import is missing.`)
    if (!gated) failures.push(`${relativePath}: isolation guard call is missing.`)

    return {
      file: relativePath,
      imported,
      gated,
      mode: relativePath.endsWith("external-review/enqueue/route.ts")
        ? "MOCK_BRANCH_ONLY"
        : "ENTIRE_HANDLER",
    }
  }))

  const enqueueSource = await sourceFor(
    "app/api/historical-intelligence/external-review/enqueue/route.ts",
  )
  if (!/if \(body\.mode !== "live"\) \{[\s\S]*enforceNonProductionRouteIsolation\(request\)/.test(enqueueSource)) {
    failures.push("External review enqueue does not isolate its default/mock branch while retaining live mode.")
  }

  return {
    status: failures.length === 0 ? "PASS" : "FAIL",
    protectedRouteCount: PROTECTED_ROUTES.length,
    routes,
    failures,
  }
}

async function main() {
  const report = await auditProductionMockRouteIsolation()
  process.stdout.write("PRODUCTION MOCK ROUTE ISOLATION AUDIT\n")
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
  if (report.status === "FAIL") process.exitCode = 1
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(
      `PRODUCTION MOCK ROUTE ISOLATION AUDIT FAILED\n${error instanceof Error ? error.message : String(error)}\n`,
    )
    process.exitCode = 1
  })
}
