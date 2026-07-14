import {
  createBinanceOfficialFundingTailPartition,
  createBinanceVisionFundingPartition,
  createFundingExecutionSnapshot,
  createBoundedFundingEventPartition,
  createFundingPartitionId,
  createFundingUnitIdentity,
  D3_PHASE3_MANIFEST,
  fundingMonthsInclusive,
  type FundingAvailabilityBoundary,
} from "@/lib/data-platform/population/backfill"

let failures = 0
function check(name: string, condition: boolean) {
  console.log(`${condition ? "PASS" : "FAIL"} ${name}`)
  if (!condition) failures += 1
}

const starts: Readonly<Record<string, string>> = { BTCUSDT: "2020-01", ETHUSDT: "2020-01", SOLUSDT: "2020-09", BNBUSDT: "2020-02", XRPUSDT: "2020-01", DOGEUSDT: "2020-07" }
const availability: readonly FundingAvailabilityBoundary[] = D3_PHASE3_MANIFEST.instruments.map((instrument) => ({ canonicalInstrumentId: instrument.canonicalInstrumentId, providerSymbol: instrument.providerSymbol, activationTimestamp: instrument.activatedAt, earliestVerifiedArchiveMonth: starts[instrument.providerSymbol], latestVerifiedArchiveMonth: "2026-06", earliestVerifiedEventTime: `${starts[instrument.providerSymbol]}-01T00:00:00.000Z`, finalEligibleEventTime: "2026-07-11T16:00:00.000Z", discoveryMethod: "BINANCE_VISION_S3_PREFIX_AND_REST_QUERY", discoveryEvidence: "bounded-test-evidence", unavailableBefore: `${starts[instrument.providerSymbol]}-01T00:00:00.000Z` }))
const completedId = createFundingPartitionId(availability[0].canonicalInstrumentId, "BINANCE_OFFICIAL_REST_TAIL", "2026-07-01_2026-07-12")
const input = { manifest: D3_PHASE3_MANIFEST, availability, completedByPartitionId: { [completedId]: "existing-unit" }, measuredCanaryCompressedBytes: 900, measuredArchiveBytes: 399_061 }
const first = createFundingExecutionSnapshot(input)
const reordered = createFundingExecutionSnapshot({ ...input, availability: [...availability].reverse() })

check("month enumeration is inclusive", fundingMonthsInclusive("2026-04", "2026-06").join(",") === "2026-04,2026-05,2026-06")
check("source adapter retains monthly archive boundary", createBinanceVisionFundingPartition({ symbol: "BTCUSDT", month: "2020-01" }).sourceUrl.endsWith("BTCUSDT-fundingRate-2020-01.zip"))
check("REST tail is bounded and uncompressed", createBinanceOfficialFundingTailPartition({ symbol: "BTCUSDT", windowStart: "2026-07-01T00:00:00.000Z", windowEnd: "2026-07-12T00:00:00.000Z" }).compression === "NONE")
check("snapshot order independent", first.snapshotId === reordered.snapshotId)
check("all governed instruments retained", first.instruments.length === 6)
check("complete source inventory retained", first.archivePartitionCount === 453 && first.restTailPartitionCount === 6 && first.completePartitionCount === 459)
check("existing completion reconciled by identity", first.alreadyCompletedPartitionCount === 1)
check("Funding identity includes cadence and source", createFundingPartitionId("instrument", "BINANCE_VISION_MONTHLY", "2026-06").includes("event-8h:binance_vision_monthly"))
check("Funding Unit cannot collide with OHLCV", createFundingUnitIdentity(first.parentManifestId, "instrument", "BINANCE_VISION_MONTHLY", "2026-06").startsWith("funding-unit:"))
check("Funding concurrency fixed to one", first.globalConcurrency === 1 && first.providerDownloadConcurrency === 1)
check("snapshot checksum identity", first.snapshotId === `funding-execution:${first.snapshotChecksum}`)

const april = first.partitions.find((partition) => partition.providerSymbol === "BTCUSDT" && partition.sourcePeriod === "2026-04")!
const boundedApril = createBoundedFundingEventPartition(april, "2026-04-13T00:00:00.000Z", "2026-05-01T00:00:00.000Z")
check("bounded Funding subset has a distinct Unit identity", boundedApril.partitionId !== april.partitionId && boundedApril.unitIdentity !== april.unitIdentity)
check("bounded Funding subset retains source-object window", boundedApril.sourceWindowStart === april.windowStart && boundedApril.sourceWindowEnd === april.windowEnd)
check("bounded Funding subset preserves source row ordinals", boundedApril.preserveSourceRowOrdinal === true)
check("bounded Funding subset uses exact event window", boundedApril.windowStart === "2026-04-13T00:00:00.000Z" && boundedApril.windowEnd === "2026-05-01T00:00:00.000Z")
check("full source window is not needlessly re-identified", createBoundedFundingEventPartition(april, april.windowStart, april.windowEnd) === april)

let invalidBoundedWindowRejected = false
try { createBoundedFundingEventPartition(april, "2026-03-31T00:00:00.000Z", "2026-05-01T00:00:00.000Z") } catch { invalidBoundedWindowRejected = true }
check("bounded Funding subset fails closed outside source window", invalidBoundedWindowRejected)

if (failures) process.exitCode = 1
