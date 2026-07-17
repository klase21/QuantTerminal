import { createMvpBoundedCoverageResult } from "@/lib/data-platform/consistency-evidence/postgres"

const base = {
  datasetId: "open-interest",
  venue: "BINANCE",
  subject: "SOLUSDT",
  windowStart: "2026-07-15T00:00:00.000Z",
  windowEnd: "2026-07-16T00:00:00.000Z",
  sourceWatermark: "2026-07-16T00:00:00.000Z",
  policyVersionId: "mvp-evidence-activation/1.0.0",
  commits: [{ commitId: "commit-1", checksum: "a".repeat(64), datasetId: "open-interest", providerId: "binance-vision", providerSnapshotId: "provider-snapshot-1" }],
  computedAt: "2026-07-16T00:00:00.000Z",
} as const

const created = createMvpBoundedCoverageResult(base)
const repeated = createMvpBoundedCoverageResult(base)
if (created.coverageVersionId !== repeated.coverageVersionId || created.coverageChecksum !== repeated.coverageChecksum) throw new Error("COVERAGE_IDENTITY_NOT_DETERMINISTIC")
if (created.datasetId !== "open-interest" || created.subject !== "SOLUSDT" || created.windowStart !== base.windowStart || created.windowEnd !== base.windowEnd) throw new Error("COVERAGE_SCOPE_NOT_PRESERVED")

for (const invalid of [
  { ...base, datasetId: "funding" },
  { ...base, subject: "ETHUSDT", commits: [] },
  { ...base, sourceWatermark: "2026-07-15T12:00:00.000Z" },
]) {
  let rejected = false
  try { createMvpBoundedCoverageResult(invalid) } catch { rejected = true }
  if (!rejected) throw new Error("INVALID_COVERAGE_SCOPE_ACCEPTED")
}

console.log("MVP COVERAGE DEPENDENCY SUITE: PASS")
