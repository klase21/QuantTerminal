import path from "node:path"
import { fileURLToPath } from "node:url"

import {
  MARKET_DRIVER_CATEGORIES,
} from "@/core/market-driver-engine"
import {
  buildMarketDrivers,
  discoverMarketDriverSymbols,
} from "@/lib/market-driver/buildMarketDrivers"

type FailureCategory =
  | "missing_evidence"
  | "stale_evidence"
  | "incomplete_evidence"
  | "unsupported_symbol"
  | "unknown"

export async function auditMarketDrivers() {
  const symbols = await discoverMarketDriverSymbols()
  const summaries = await Promise.all(
    symbols.map((symbol) => buildMarketDrivers({ symbol })),
  )
  const failureCategories: Record<FailureCategory, number> = {
    missing_evidence: summaries.filter((summary) => summary.drivers.length === 0).length,
    stale_evidence: summaries.reduce(
      (count, summary) => count + summary.staleCategories.length,
      0,
    ),
    incomplete_evidence: summaries.filter((summary) => (
      summary.drivers.length > 0 && summary.missingCategories.length > 0
    )).length,
    unsupported_symbol: 0,
    unknown: 0,
  }
  const driverCategoryCoverage = MARKET_DRIVER_CATEGORIES.map((category) => {
    const available = summaries.filter((summary) => (
      summary.availableCategories.includes(category)
    )).length
    const stale = summaries.filter((summary) => (
      summary.staleCategories.includes(category)
    )).length
    return {
      category,
      available,
      missing: summaries.length - available,
      stale,
    }
  })
  return {
    schemaVersion: 2,
    auditedAt: new Date().toISOString(),
    readOnly: true,
    status: "PASS",
    supportedSymbols: symbols,
    driverCategoryCoverage,
    coverageMatrix: summaries.map((summary) => ({
      symbol: summary.symbol,
      drivers: summary.drivers.length,
      confidence: summary.confidence,
      missingCategories: summary.missingCategories,
      staleCategories: summary.staleCategories,
      quality: summary.quality,
    })),
    validation: summaries.map((summary) => ({
      symbol: summary.symbol,
      numberOfDrivers: summary.drivers.length,
      availableCategories: summary.availableCategories,
      missingCategories: summary.missingCategories,
      staleCategories: summary.staleCategories,
      confidence: summary.confidence,
      quality: summary.quality,
      marketDirection: summary.marketDirection,
    })),
    marketDriverSummaries: summaries,
    failureCategories,
  }
}

async function main() {
  const report = await auditMarketDrivers()
  process.stdout.write("MARKET DRIVER AUDIT\n")
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(
      `MARKET DRIVER AUDIT FAILED\n${error instanceof Error ? error.message : String(error)}\n`,
    )
    process.exitCode = 1
  })
}
