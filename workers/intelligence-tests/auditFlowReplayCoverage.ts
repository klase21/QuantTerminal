import path from "node:path"
import { fileURLToPath } from "node:url"

import type {
  FlowReplayCoverageState,
  FlowReplayEvidence,
  FlowReplaySourceQuality,
} from "@/core/flow-replay"
import { buildFlowReplayEvidence } from "@/lib/flow-replay/buildFlowReplayEvidence"
import { auditReplayCoverage } from "./auditReplayCoverage"

type FlowReplayCaseQuality =
  | FlowReplayCoverageState
  | "FAILED"

interface FlowReplayCaseValidation {
  symbol: string
  exchange: "binance_futures"
  timeframe: "1h"
  caseId: string
  date: string
  hour: number
  similarity: number
  evidenceCoverage: FlowReplayCoverageState | null
  fundingAvailability: FlowReplaySourceQuality
  openInterestAvailability: FlowReplaySourceQuality
  orderbookFlowAvailability: FlowReplaySourceQuality
  qualityClassification: FlowReplayCaseQuality
  success: boolean
  failureReasons: string[]
}

function sourceQuality(
  evidence: FlowReplayEvidence,
  kind: "price" | "funding" | "open_interest" | "orderbook_flow",
) {
  return evidence.sources.find((item) => item.kind === kind)?.quality ?? "unknown"
}

function failureReasons(evidence: FlowReplayEvidence) {
  return [
    ...evidence.degradedEvidence.map((item) => (
      `${item.kind}: ${item.reason ?? "Evidence is degraded."}`
    )),
    ...evidence.unavailableEvidence.map((item) => (
      `${item.kind}: ${item.reason ?? "Evidence is unavailable."}`
    )),
  ]
}

function reasonCategory(reason: string) {
  const normalized = reason.toLowerCase()
  if (
    normalized.includes("initialization snapshot")
    || normalized.includes("cannot prove initialization")
    || normalized.includes("complete depth")
    || normalized.includes("deterministic reconstruction")
    || normalized.includes("deterministic progression")
  ) {
    return "orderbook_degraded_no_initialization"
  }
  if (normalized.includes("orderbook") && normalized.includes("cache")) {
    return "orderbook_cache_missing"
  }
  if (normalized.includes("funding")) return "funding_unavailable"
  if (normalized.includes("open-interest") || normalized.includes("open_interest")) {
    return "open_interest_unavailable"
  }
  if (normalized.includes("liquidation")) return "liquidations_unavailable"
  if (normalized.includes("trades")) return "trades_unavailable"
  if (normalized.includes("ohlcv") || normalized.includes("price")) {
    return "price_unavailable"
  }
  if (normalized.includes("cryptohftdata")) return "provider_unavailable"
  return "other"
}

function categorizeReasons(cases: FlowReplayCaseValidation[]) {
  const counts = new Map<string, { count: number; examples: Set<string> }>()
  for (const item of cases) {
    for (const reason of item.failureReasons) {
      const category = reasonCategory(reason)
      const current = counts.get(category) ?? { count: 0, examples: new Set<string>() }
      current.count += 1
      if (current.examples.size < 3) current.examples.add(reason)
      counts.set(category, current)
    }
  }
  return [...counts.entries()]
    .map(([category, value]) => ({
      category,
      count: value.count,
      examples: [...value.examples],
    }))
    .sort((left, right) => right.count - left.count || left.category.localeCompare(right.category))
}

async function validateCase(input: {
  symbol: string
  caseId: string
  date: string
  hour: number
  similarity: number
}): Promise<FlowReplayCaseValidation> {
  try {
    const evidence = await buildFlowReplayEvidence({
      exchange: "binance_futures",
      symbol: input.symbol,
      date: input.date,
      hour: input.hour,
      timeframe: "1h",
    })
    const priceQuality = sourceQuality(evidence, "price")
    const success = priceQuality === "verified"
    return {
      symbol: input.symbol,
      exchange: "binance_futures",
      timeframe: "1h",
      caseId: input.caseId,
      date: input.date,
      hour: input.hour,
      similarity: input.similarity,
      evidenceCoverage: evidence.coverageState ?? "MINIMAL",
      fundingAvailability: sourceQuality(evidence, "funding"),
      openInterestAvailability: sourceQuality(evidence, "open_interest"),
      orderbookFlowAvailability: sourceQuality(evidence, "orderbook_flow"),
      qualityClassification: success
        ? evidence.coverageState ?? "MINIMAL"
        : "FAILED",
      success,
      failureReasons: failureReasons(evidence),
    }
  } catch (error) {
    return {
      symbol: input.symbol,
      exchange: "binance_futures",
      timeframe: "1h",
      caseId: input.caseId,
      date: input.date,
      hour: input.hour,
      similarity: input.similarity,
      evidenceCoverage: null,
      fundingAvailability: "unknown",
      openInterestAvailability: "unknown",
      orderbookFlowAvailability: "unknown",
      qualityClassification: "FAILED",
      success: false,
      failureReasons: [
        error instanceof Error ? error.message : "Flow Replay validation failed.",
      ],
    }
  }
}

export async function auditFlowReplayCoverage() {
  if (!process.env.CRYPTOHFTDATA_API_KEY) {
    try {
      process.loadEnvFile(path.join(process.cwd(), ".env.local"))
    } catch {
      // Missing credentials are reported by the existing provider reader.
    }
  }

  const replayCoverage = await auditReplayCoverage()
  const compatibleCases = replayCoverage.coverageSummary.flatMap((symbolCoverage) => (
    symbolCoverage.cases
      .filter((item) => item.replaySource.state === "available")
      .map((item) => ({
        symbol: symbolCoverage.symbol,
        caseId: item.caseId,
        date: item.date,
        hour: item.hour,
        similarity: item.similarity,
      }))
  ))

  const cases: FlowReplayCaseValidation[] = []
  for (const compatibleCase of compatibleCases) {
    cases.push(await validateCase(compatibleCase))
  }

  const successful = cases.filter((item) => item.success)
  const enriched = cases.filter((item) => item.qualityClassification === "ENRICHED")
  const comprehensive = cases.filter((item) => item.qualityClassification === "COMPREHENSIVE")
  const partial = cases.filter((item) => item.qualityClassification === "PARTIAL")
  const minimal = cases.filter((item) => item.qualityClassification === "MINIMAL")
  const failed = cases.filter((item) => item.qualityClassification === "FAILED")
  const total = compatibleCases.length
  const percent = (count: number) => (
    total ? Number(((count / total) * 100).toFixed(2)) : 0
  )
  const status = total > 0 && cases.length === total ? "PASS" : "FAIL"

  return {
    schemaVersion: 1,
    auditedAt: new Date().toISOString(),
    validationOnly: true,
    status,
    methodology: {
      discovery: "Historical Analog replay-compatible cases from auditReplayCoverage().",
      evidence: "Flow Replay evidence assembled in memory; no artifact publication.",
      execution: "Sequential case validation to bound provider and decoder load.",
      success: "Verified price evidence exists for the exact replay window.",
    },
    aggregate: {
      totalCompatibleCases: total,
      successfulFlowReplayCases: successful.length,
      successfulPercent: percent(successful.length),
      comprehensiveCases: comprehensive.length,
      comprehensivePercent: percent(comprehensive.length),
      enrichedCases: enriched.length,
      enrichedPercent: percent(enriched.length),
      partialCases: partial.length,
      partialPercent: percent(partial.length),
      minimalCases: minimal.length,
      minimalPercent: percent(minimal.length),
      failedCases: failed.length,
      failedPercent: percent(failed.length),
    },
    bySymbol: replayCoverage.coverageSummary.map((symbolCoverage) => {
      const symbolCases = cases.filter((item) => item.symbol === symbolCoverage.symbol)
      return {
        symbol: symbolCoverage.symbol,
        totalAnalogCases: symbolCoverage.totalAnalogCases,
        compatibleCases: symbolCoverage.replayCompatibleCases,
        validatedCases: symbolCases.length,
        successfulCases: symbolCases.filter((item) => item.success).length,
        enrichedCases: symbolCases.filter((item) => item.qualityClassification === "ENRICHED").length,
        partialCases: symbolCases.filter((item) => item.qualityClassification === "PARTIAL").length,
        minimalCases: symbolCases.filter((item) => item.qualityClassification === "MINIMAL").length,
        failedCases: symbolCases.filter((item) => item.qualityClassification === "FAILED").length,
      }
    }),
    cases,
    commonFailureReasons: categorizeReasons(cases),
  }
}

async function main() {
  const report = await auditFlowReplayCoverage()
  process.stdout.write("FLOW REPLAY COVERAGE AUDIT\n")
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
  if (report.status !== "PASS") process.exitCode = 1
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(
      `FLOW REPLAY COVERAGE AUDIT FAILED\n${error instanceof Error ? error.message : String(error)}\n`,
    )
    process.exitCode = 1
  })
}
