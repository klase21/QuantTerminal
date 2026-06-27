import { readdir, readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

import {
  createContext,
  createDashboardToMarketsContext,
  createMarketsToScannerContext,
  createReplayToTradeContext,
  createResearchToReplayContext,
  createScannerToResearchContext,
  deserializeProductContext,
  inspectContextCandidate,
  loadProductContext,
  serializeProductContext,
  updateContext,
  validateProductContext,
  type ContextValue,
  type JsonObject,
  type ProductPage,
} from "@/lib/product-context"

const ROOT = process.cwd()
const PAGE_FILES = {
  dashboard: "components/product/DashboardV1.tsx",
  markets: "components/markets/MarketsPage.tsx",
  scanner: "components/scanner/ScannerPage.tsx",
  research: "components/research/ResearchPage.tsx",
  replay: "components/replay/ReplayV1Page.tsx",
  trade: "components/trade/TradePage.tsx",
} as const

type CheckMap = Record<string, boolean>

function contextValue(owner: ProductPage, value: JsonObject): ContextValue<JsonObject> {
  return {
    value,
    owner,
    source: "shared-context-audit",
    freshness: "UNKNOWN",
    revision: 1,
  }
}

function sourceSegment(source: string, start: string, end: string) {
  const startIndex = source.indexOf(start)
  if (startIndex < 0) return ""
  const endIndex = source.indexOf(end, startIndex)
  return source.slice(startIndex, endIndex < 0 ? source.length : endIndex)
}

function excludesTerms(source: string, terms: string[]) {
  return terms.every((term) => !source.includes(term))
}

async function filesBelow(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true })
  const nested = await Promise.all(entries.map(async (entry) => {
    const target = path.join(directory, entry.name)
    return entry.isDirectory() ? filesBelow(target) : [target]
  }))
  return nested.flat()
}

export async function auditSharedProductContext() {
  const pageEntries = await Promise.all(Object.entries(PAGE_FILES).map(async ([page, relativePath]) => [
    page,
    await readFile(path.join(ROOT, relativePath), "utf8"),
  ] as const))
  const pages = Object.fromEntries(pageEntries) as Record<keyof typeof PAGE_FILES, string>

  const now = Date.now()
  const createdAt = new Date(now).toISOString()
  const expiresAt = new Date(now + 30 * 60 * 1000).toISOString()
  const id = (handoff: string) => `shared-context-audit-${handoff}-${now}`

  const dashboard = createDashboardToMarketsContext({
    contextId: id("dashboard-markets"),
    symbol: "BTCUSDT",
    createdAt,
    expiresAt,
  })
  const markets = createMarketsToScannerContext({
    contextId: id("markets-scanner"),
    symbol: "BTCUSDT",
    createdAt,
    expiresAt,
    context: { marketStructureContext: contextValue("markets", { availability: "UNAVAILABLE" }) },
  })
  const scanner = createScannerToResearchContext({
    contextId: id("scanner-research"),
    symbol: "BTCUSDT",
    createdAt,
    expiresAt,
    opportunityContext: contextValue("scanner", { symbol: "BTCUSDT", status: "UNAVAILABLE" }),
  })
  const research = createResearchToReplayContext({
    contextId: id("research-replay"),
    symbol: "BTCUSDT",
    createdAt,
    expiresAt,
    replayTarget: contextValue("research", { caseId: "audit-case", status: "UNAVAILABLE" }),
  })
  const replay = createReplayToTradeContext({
    contextId: id("replay-trade"),
    symbol: "BTCUSDT",
    createdAt,
    expiresAt,
    validationResult: contextValue("replay", { status: "UNAVAILABLE" }),
    replayResult: contextValue("replay", { availability: "UNAVAILABLE" }),
  })

  const helperResults = [dashboard, markets, scanner, research, replay]
  const helperChecks: CheckMap = {
    allHandoffHelpersCreateValidEnvelopes: helperResults.every((result) => result.success),
    schemaVersionPresent: helperResults.every((result) => result.success && result.value.schemaVersion === 1),
    initialRevisionIsOne: helperResults.every((result) => result.success && result.value.revision === 1),
    timestampsPresent: helperResults.every((result) => result.success
      && Boolean(result.value.createdAt && result.value.updatedAt && result.value.expiresAt)),
    canonicalSourceAndIntent: dashboard.success && dashboard.value.sourcePage === "dashboard" && dashboard.value.destinationIntent === "explore_market"
      && markets.success && markets.value.sourcePage === "markets" && markets.value.destinationIntent === "prioritize_symbol"
      && scanner.success && scanner.value.sourcePage === "scanner" && scanner.value.destinationIntent === "evaluate_thesis"
      && research.success && research.value.sourcePage === "research" && research.value.destinationIntent === "validate_historically"
      && replay.success && replay.value.sourcePage === "replay" && replay.value.destinationIntent === "prepare_execution",
  }

  const malformedJson = deserializeProductContext("{not-json")
  const incompatibleVersion = dashboard.success
    ? validateProductContext({ ...dashboard.value, schemaVersion: 99 })
    : dashboard
  const expired = validateProductContext({
    ...(dashboard.success ? dashboard.value : {}),
    createdAt: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
    expiresAt: new Date(now - 60 * 60 * 1000).toISOString(),
  })
  const invalidTtl = dashboard.success
    ? inspectContextCandidate({
        ...dashboard.value,
        updatedAt: new Date(now + 20 * 60 * 1000).toISOString(),
        expiresAt: new Date(now + 10 * 60 * 1000).toISOString(),
      }, now)
    : null
  const unavailableStorage = loadProductContext(id("missing-storage"))
  let nullUnavailableValuePreserved = false
  if (dashboard.success) {
    const nullableRoundTrip = serializeProductContext({ ...dashboard.value, confidenceContext: null })
    if (nullableRoundTrip.success) {
      const nullableDecoded = deserializeProductContext(nullableRoundTrip.value)
      nullUnavailableValuePreserved = nullableDecoded.success && nullableDecoded.value.confidenceContext === null
    }
  }

  let staleRevisionProtected = false
  if (dashboard.success) {
    const created = createContext(dashboard.value, now)
    if ((created.status === "SUCCESS" || created.status === "WARNING") && created.value) {
      const updatedAt = new Date(now + 1000).toISOString()
      const updated = updateContext({
        contextId: dashboard.value.contextId,
        expectedRevision: 1,
        updatedAt,
        changes: { timeframe: "4h" },
      }, now + 1000)
      if ((updated.status === "SUCCESS" || updated.status === "WARNING") && updated.value?.revision === 2) {
        const stale = updateContext({
          contextId: dashboard.value.contextId,
          expectedRevision: 1,
          updatedAt: new Date(now + 2000).toISOString(),
          changes: { timeframe: "1h" },
        }, now + 2000)
        staleRevisionProtected = stale.status === "CONFLICT" && stale.issues[0]?.code === "stale_write"
      }
    }
  }

  const integrityChecks: CheckMap = {
    malformedJsonRejected: malformedJson.success === false && malformedJson.error.code === "malformed_json",
    incompatibleVersionRejected: incompatibleVersion.success === false && incompatibleVersion.error.code === "unsupported_schema_version",
    expiredContextRejected: expired.success === false && expired.error.code === "expired_context",
    invalidTtlRejectedByLifecycle: invalidTtl?.status === "ERROR" && invalidTtl.issues[0]?.code === "invalid_ttl",
    unavailableSessionStorageStructured: unavailableStorage.success === false && unavailableStorage.error.code === "storage_unavailable",
    nullUnavailableValuePreserved,
    staleRevisionProtected,
  }

  const dashboardSegment = sourceSegment(pages.dashboard, "function openMarketsWithSharedContext", "\n  return (")
  const marketsSegment = sourceSegment(pages.markets, "function openScannerWithSharedContext", "\n  return (")
  const scannerSegment = sourceSegment(pages.scanner, "function openResearchWithSharedContext", "\n  useEffect(() => {\n    console.debug")
  const researchSegment = sourceSegment(pages.research, "function openReplayWithSharedContext", "\n  return (")
  const replaySegment = sourceSegment(pages.replay, "function openTradeWithSharedContext", "\n  useEffect(() => {\n    if (!chartCandles.length)")
  const handoffSegments = [dashboardSegment, marketsSegment, scannerSegment, researchSegment, replaySegment]
  const syntheticPattern = /\b(fake|mock|synthetic|generated thesis|generated evidence|generated validation)\b/i

  const pageChecks: CheckMap = {
    dashboardToMarketsIntegrated: pages.dashboard.includes("createDashboardToMarketsContext") && pages.dashboard.includes("appendDashboardMarketsContext"),
    marketsLoadsDashboardContext: pages.markets.includes("sourcePage !== \"dashboard\"") && pages.markets.includes("inspectContextCandidate"),
    marketsToScannerIntegrated: pages.markets.includes("createMarketsToScannerContext") && pages.markets.includes("scannerHrefWithContext"),
    scannerLoadsMarketsContext: pages.scanner.includes("sourcePage !== \"markets\"") && pages.scanner.includes("inspectContextCandidate"),
    scannerToResearchIntegrated: pages.scanner.includes("createScannerToResearchContext") && pages.scanner.includes("appendScannerResearchContext"),
    researchLoadsScannerContext: pages.research.includes("sourcePage !== \"scanner\"") && pages.research.includes("inspectContextCandidate"),
    researchToReplayIntegrated: pages.research.includes("createResearchToReplayContext") && pages.research.includes("appendProductContextId"),
    replayLoadsResearchContext: pages.replay.includes("sourcePage !== \"research\"") && pages.replay.includes("inspectContextCandidate"),
    replayToTradeIntegrated: pages.replay.includes("createReplayToTradeContext") && pages.replay.includes("appendReplayTradeContext"),
    tradeLoadsReplayContext: pages.trade.includes("sourcePage !== \"replay\"") && pages.trade.includes("inspectContextCandidate"),
    noFetchInsideHandoffFunctions: handoffSegments.every((segment) => segment.length > 0 && !segment.includes("fetch(")),
    noSyntheticTermsInsideHandoffFunctions: handoffSegments.every((segment) => segment.length > 0 && !syntheticPattern.test(segment)),
    dashboardDoesNotCreateDownstreamOwnership: excludesTerms(dashboardSegment, ["opportunityContext", "signalContext", "thesis:", "marketStructureContext", "validationResult", "replayResult", "executionContext"]),
    marketsDoesNotCreateDownstreamOwnership: excludesTerms(marketsSegment, ["opportunityContext", "signalContext", "thesis:", "evidenceSummary", "validationResult", "replayResult", "executionContext"]),
    scannerDoesNotCreateDownstreamOwnership: excludesTerms(scannerSegment, ["thesis:", "evidenceSummary", "supportingEvidence", "conflictingEvidence", "validationResult", "replayResult", "executionContext"]),
    researchDoesNotCreateValidationOrExecution: excludesTerms(researchSegment, ["validationResult", "replayResult", "executionContext"]),
    replayDoesNotCreateExecution: !replaySegment.includes("executionContext"),
  }

  const apiFiles = (await filesBelow(path.join(ROOT, "app", "api")))
    .filter((file) => /\.(ts|tsx)$/.test(file))
  const apiSources = await Promise.all(apiFiles.map((file) => readFile(file, "utf8")))
  const isolationChecks: CheckMap = {
    noProductContextUsageInApis: apiSources.every((source) => !source.includes("@/lib/product-context")),
  }

  const checks = { ...helperChecks, ...integrityChecks, ...pageChecks, ...isolationChecks }
  const failed = Object.entries(checks).filter(([, passed]) => !passed).map(([check]) => check)
  const warnings = [
    "Each page creates a new revision-1 handoff snapshot; lifecycle update/merge is not used across page transitions.",
    "Inherited upstream fields are displayed at each destination but are not comprehensively forwarded through every later handoff.",
    "sessionStorage behavior is structurally tested in Node; browser click-through remains a manual integration check.",
  ]

  return {
    schemaVersion: 1,
    auditedAt: new Date().toISOString(),
    readOnly: true,
    status: failed.length ? "FAIL" : "PASS",
    checks,
    warnings,
    failed,
  }
}

async function main() {
  const report = await auditSharedProductContext()
  process.stdout.write("SHARED PRODUCT CONTEXT AUDIT\n")
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
  if (report.status !== "PASS") process.exitCode = 1
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`SHARED PRODUCT CONTEXT AUDIT FAILED\n${error instanceof Error ? error.message : String(error)}\n`)
    process.exitCode = 1
  })
}
