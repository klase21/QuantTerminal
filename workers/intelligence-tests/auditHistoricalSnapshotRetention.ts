import path from "node:path"
import { fileURLToPath } from "node:url"

import {
  summarizeHistoricalRetention,
} from "@/core/historical-snapshots"

export async function auditHistoricalSnapshotRetention() {
  const exchangeReserve = await summarizeHistoricalRetention({
    dataset: "exchange-reserve",
  })
  return {
    schemaVersion: 1,
    auditedAt: new Date().toISOString(),
    readOnly: true,
    status: exchangeReserve.retentionHealth === "invalid" ? "FAIL" : "PASS",
    datasets: [exchangeReserve],
    summary: {
      datasetCount: 1,
      healthyDatasets: exchangeReserve.retentionHealth === "healthy" ? 1 : 0,
      insufficientHistoryDatasets:
        exchangeReserve.retentionHealth === "insufficient_history" ? 1 : 0,
      missingDatasets: exchangeReserve.retentionHealth === "missing" ? 1 : 0,
      invalidDatasets: exchangeReserve.retentionHealth === "invalid" ? 1 : 0,
    },
    retentionHealth: exchangeReserve.retentionHealth,
    snapshotCount: exchangeReserve.snapshotCount,
    oldestTimestamp: exchangeReserve.oldestTimestamp,
    newestTimestamp: exchangeReserve.newestTimestamp,
    previousSnapshotAvailable: exchangeReserve.previousSnapshotAvailable,
  }
}

async function main() {
  const report = await auditHistoricalSnapshotRetention()
  process.stdout.write("HISTORICAL SNAPSHOT RETENTION AUDIT\n")
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
  if (report.status !== "PASS") process.exitCode = 1
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(
      `HISTORICAL SNAPSHOT RETENTION AUDIT FAILED\n${error instanceof Error ? error.message : String(error)}\n`,
    )
    process.exitCode = 1
  })
}
