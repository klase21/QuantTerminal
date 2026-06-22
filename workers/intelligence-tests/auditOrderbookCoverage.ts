import path from "node:path"
import { fileURLToPath } from "node:url"

import { auditReplayCoverage } from "./auditReplayCoverage"

export async function auditOrderbookCoverage() {
  const replayCoverage = await auditReplayCoverage()
  const compatibleCases = replayCoverage.coverageSummary.flatMap((target) => (
    target.cases
      .filter((item) => item.replaySource.state === "available")
      .map((item) => ({
        symbol: target.symbol,
        exchange: target.exchange,
        caseId: item.caseId,
        date: item.date,
        hour: item.hour,
        similarity: item.similarity,
        orderbookCache: item.orderbookCache,
      }))
  ))
  const cachedCases = compatibleCases.filter(
    (item) => item.orderbookCache.state === "available",
  )
  const missingCases = compatibleCases.filter(
    (item) => item.orderbookCache.state !== "available",
  )

  return {
    schemaVersion: 1,
    auditedAt: new Date().toISOString(),
    readOnly: true,
    totalReplayCompatibleCases: compatibleCases.length,
    orderbookCachedCases: cachedCases.length,
    coveragePercent: compatibleCases.length
      ? Number(((cachedCases.length / compatibleCases.length) * 100).toFixed(2))
      : 0,
    cachedCases,
    missingCases,
  }
}

async function main() {
  const report = await auditOrderbookCoverage()
  process.stdout.write("ORDERBOOK COVERAGE AUDIT\n")
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(
      `ORDERBOOK COVERAGE AUDIT FAILED\n${error instanceof Error ? error.message : String(error)}\n`,
    )
    process.exitCode = 1
  })
}
