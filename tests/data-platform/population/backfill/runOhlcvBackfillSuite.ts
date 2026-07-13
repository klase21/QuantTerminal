import {
  createOhlcvExecutionSnapshot,
  createOhlcvPartitionId,
  createOhlcvUnitIdentity,
  D3_PHASE3_MANIFEST,
  utcDaysInclusive,
  type OhlcvAvailabilityBoundary,
} from "@/lib/data-platform/population/backfill"

let failures = 0
function check(name: string, condition: boolean) {
  console.log(`${condition ? "PASS" : "FAIL"} ${name}`)
  if (!condition) failures += 1
}

const availability: readonly OhlcvAvailabilityBoundary[] = D3_PHASE3_MANIFEST.instruments.map((instrument) => ({
  canonicalInstrumentId: instrument.canonicalInstrumentId,
  providerSymbol: instrument.providerSymbol,
  activationTimestamp: instrument.activatedAt,
  earliestVerifiedSourceDay: "2026-07-10",
  finalEligibleDay: "2026-07-11",
  discoveryMethod: "ACTIVATION_WINDOW_HEAD",
  discoveryEvidence: "bounded-test-policy",
  unavailableBefore: "2026-07-10T00:00:00.000Z",
}))

const completedId = createOhlcvPartitionId(availability[0].canonicalInstrumentId, "2026-07-11")
const input = { manifest: D3_PHASE3_MANIFEST, availability, completedByPartitionId: { [completedId]: "unit-existing" }, measuredCanaryCompressedBytes: 13_010 }
const first = createOhlcvExecutionSnapshot(input)
const reordered = createOhlcvExecutionSnapshot({ ...input, availability: [...availability].reverse() })
const changed = createOhlcvExecutionSnapshot({ ...input, availability: availability.map((item, index) => index === 0 ? { ...item, earliestVerifiedSourceDay: "2026-07-09" } : item) })

check("UTC day enumeration is inclusive", JSON.stringify(utcDaysInclusive("2026-07-09", "2026-07-11")) === JSON.stringify(["2026-07-09", "2026-07-10", "2026-07-11"]))
check("partition identity deterministic", createOhlcvPartitionId("instrument", "2026-07-11") === createOhlcvPartitionId("instrument", "2026-07-11"))
check("Unit identity deterministic", createOhlcvUnitIdentity(first.parentManifestId, "instrument", "2026-07-11") === createOhlcvUnitIdentity(first.parentManifestId, "instrument", "2026-07-11"))
check("snapshot input order independent", first.snapshotId === reordered.snapshotId)
check("availability boundary changes snapshot", first.snapshotId !== changed.snapshotId)
check("all governed instruments retained", first.instruments.length === D3_PHASE3_MANIFEST.instruments.length)
check("partition count complete", first.completePartitionCount === availability.length * 2)
check("existing Canary classified by identity", first.alreadyCompletedPartitionCount === 1 && first.partitions.some((partition) => partition.partitionId === completedId && partition.initialState === "SKIPPED_ALREADY_COMPLETE"))
check("pending count reconciles", first.pendingPartitionCount + first.alreadyCompletedPartitionCount === first.completePartitionCount)
check("estimated rows explicit", first.estimatedRowCount === first.completePartitionCount * 288)
check("concurrency bounded", first.globalConcurrency === 4 && first.providerDownloadConcurrency === 2)
check("latest partitions have priority", first.partitions[0].utcDay === "2026-07-11")
check("snapshot checksum identity", first.snapshotId === `ohlcv-execution:${first.snapshotChecksum}`)

try {
  createOhlcvExecutionSnapshot({ ...input, globalConcurrency: 1, providerDownloadConcurrency: 2 })
  check("invalid concurrency fails closed", false)
} catch {
  check("invalid concurrency fails closed", true)
}

if (failures) process.exitCode = 1
