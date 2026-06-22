import path from "node:path"
import { fileURLToPath } from "node:url"

import { readLiquidationEvidence } from "@/core/liquidation-intelligence"
import { auditReplayCoverage } from "./auditReplayCoverage"

type FailureCategory =
  | "unavailable_source"
  | "unsupported_window"
  | "incomplete_data"
  | "unknown"

function category(state: string, reason: string): FailureCategory {
  const normalized = reason.toLowerCase()
  if (normalized.includes("coverage") || normalized.includes("retention")) {
    return "unsupported_window"
  }
  if (state === "partial" || normalized.includes("partial") || normalized.includes("incomplete")) {
    return "incomplete_data"
  }
  if (state === "missing" || normalized.includes("unavailable") || normalized.includes("missing")) {
    return "unavailable_source"
  }
  return "unknown"
}

export async function auditLiquidationCoverage() {
  const replayCoverage = await auditReplayCoverage()
  const targets = replayCoverage.coverageSummary.flatMap((symbolCoverage) => (
    symbolCoverage.cases
      .filter((item) => item.replaySource.state === "available")
      .map((item) => ({
        symbol: symbolCoverage.symbol,
        date: item.date,
        hour: item.hour,
      }))
  ))
  const cases = []
  for (const target of targets) {
    const result = await readLiquidationEvidence({
      exchange: "binance_futures",
      symbol: target.symbol,
      date: target.date,
      hour: target.hour,
      scope: "symbol",
    })
    if (!result.ok) {
      const reason = "reason" in result ? result.reason : result.state
      cases.push({
        ...target,
        liquidationAvailability: "missing",
        longLiquidation: 0,
        shortLiquidation: 0,
        totalLiquidation: 0,
        sourceQuality: "unavailable",
        failureCategory: category(result.state, reason),
        reason,
      })
      continue
    }
    cases.push({
      ...target,
      liquidationAvailability: "available",
      longLiquidation: result.data.totals.longLiquidation,
      shortLiquidation: result.data.totals.shortLiquidation,
      totalLiquidation: result.data.totals.totalLiquidation,
      sourceQuality: result.data.sourceQuality,
      failureCategory: result.data.sourceQuality === "verified"
        ? null
        : "incomplete_data",
      reason: result.data.reason ?? null,
    })
  }
  const matrix = replayCoverage.coverageSummary.map((symbolCoverage) => {
    const symbolCases = cases.filter((item) => item.symbol === symbolCoverage.symbol)
    const available = symbolCases.filter((item) => item.liquidationAvailability === "available").length
    const total = symbolCases.length
    return {
      symbol: symbolCoverage.symbol,
      cases: total,
      available,
      missing: total - available,
      coveragePercent: total
        ? Number(((available / total) * 100).toFixed(2))
        : 0,
    }
  })
  const failures = new Map<FailureCategory, number>([
    ["unavailable_source", 0],
    ["unsupported_window", 0],
    ["incomplete_data", 0],
    ["unknown", 0],
  ])
  for (const item of cases) {
    if (item.failureCategory) {
      failures.set(
        item.failureCategory as FailureCategory,
        (failures.get(item.failureCategory as FailureCategory) ?? 0) + 1,
      )
    }
  }
  const total = cases.length
  const available = cases.filter((item) => item.liquidationAvailability === "available").length
  return {
    schemaVersion: 1,
    auditedAt: new Date().toISOString(),
    readOnly: true,
    status: total > 0 ? "PASS" : "FAIL",
    aggregate: {
      totalCases: total,
      availableCases: available,
      missingCases: total - available,
      coveragePercent: total
        ? Number(((available / total) * 100).toFixed(2))
        : 0,
    },
    coverageMatrix: matrix,
    cases,
    failureCategories: Object.fromEntries(failures),
  }
}

async function main() {
  const report = await auditLiquidationCoverage()
  process.stdout.write("LIQUIDATION COVERAGE AUDIT\n")
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
  if (report.status !== "PASS") process.exitCode = 1
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(
      `LIQUIDATION COVERAGE AUDIT FAILED\n${error instanceof Error ? error.message : String(error)}\n`,
    )
    process.exitCode = 1
  })
}
